// Frame renderer. The timeline is cut into fixed chunks of CHUNK_FRAMES. Up to
// N workers each take a chunk, render it in a fresh headless page and stream
// its frames into a per-chunk encoder. The chunks are then concatenated and the
// audio mixed in. Output bytes don't depend on N.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getBrowser, attachRoutes } from './browser.js';
import { runtimePayload } from './composition.js';
import { startChunkEncoder, muxFinal, verifyOutput } from './encoder.js';
import { ORIGIN, CACHE_DIR, TMP_ROOT } from './paths.js';
import { EXIT, RenderError, renderFailed, inputError } from './errors.js';
import { log } from './log.js';
import { onCleanup } from './cleanup.js';
import { sha256 } from './util.js';

const FRAME_TIMEOUT_MS = 60_000;

/**
 * Frames per chunk. Constant on purpose: chunk boundaries decide each frame's
 * render history, so changing this changes output bytes (never make it depend
 * on the machine).
 */
export const CHUNK_FRAMES = 60;

export const defaultConcurrency = () => Math.max(1, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));

function sceneFailure(error) {
  // Bad props → invalid input; anything else in a scene → render failure.
  const code = /validation/.test(error.phase || '') ? EXIT.INVALID_INPUT : EXIT.RENDER_FAILED;
  const details = [];
  if (error.stack) details.push(...error.stack.split('\n').slice(0, 4).map((l) => l.trim()));
  return new RenderError(code, error.message, { details });
}

const withTimeout = (p, ms, what) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(renderFailed(`${what} timed out after ${ms / 1000}s`)), ms).unref())]);

/** Open one render page, load the runtime and initialise the composition. */
async function openPage(norm, { roots, gpu }) {
  const browser = await getBrowser({ gpu });
  const context = await browser.newContext({
    viewport: { width: norm.width, height: norm.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });
  const pageErrors = [];
  await attachRoutes(context, {
    roots,
    onBlocked: (u) => log.warn(`blocked network request from scene: ${u}`),
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(e));
  page.on('console', (m) => {
    if (m.type() === 'error') log.debug(`[page] ${m.text()}`);
    else if (m.type() === 'warning' || m.type() === 'log') log.debug(`[page ${m.type()}] ${m.text()}`);
  });
  page.on('crash', () => pageErrors.push(new Error('the render page crashed (out of memory?)')));
  try {
    await page.goto(`${ORIGIN}/@repo/engine/runtime/index.html`);
    await withTimeout(page.waitForFunction(() => window.__rm?.ready === true), 30_000, 'loading the render runtime');
    const init = await withTimeout(page.evaluate((p) => window.__rm.init(p), runtimePayload(norm)), 120_000, 'scene setup');
    if (pageErrors.length) throw renderFailed(`page error during setup: ${pageErrors[0].message}`);
    if (!init.ok) throw sceneFailure(init.error);
    const cdp = await context.newCDPSession(page);
    return { context, page, cdp, pageErrors };
  } catch (e) {
    await context.close().catch(() => {});
    throw e;
  }
}

async function captureFrame(slot, i, norm, { forcePng = false } = {}) {
  const r = await withTimeout(slot.page.evaluate((i) => window.__rm.renderFrame(i), i), FRAME_TIMEOUT_MS, `frame ${i}`);
  if (slot.pageErrors.length) throw renderFailed(`page error at frame ${i}: ${slot.pageErrors[0].message}`);
  if (!r.ok) throw sceneFailure(r.error);
  const jpeg = !forcePng && norm.output?.frameFormat === 'jpeg';
  const { data } = await slot.cdp.send('Page.captureScreenshot', {
    format: jpeg ? 'jpeg' : 'png',
    ...(jpeg ? { quality: 95 } : { optimizeForSpeed: true }),
    clip: { x: 0, y: 0, width: norm.width, height: norm.height, scale: 1 },
    captureBeyondViewport: false,
  });
  return Buffer.from(data, 'base64');
}

/**
 * Render a normalised composition.
 * @param {object} norm  from normalizeComposition()
 * @param {object} opts
 *   out          output .mp4 path (or .png with `still`)
 *   concurrency  number of parallel pages
 *   still        render only this time in seconds (writes a PNG), or a list of times (out-01.png, out-02.png, ...)
 *   roots        extra directories the page may read from
 *   gpu          enable SwiftShader WebGL
 */
export async function renderComposition(norm, { out, concurrency = defaultConcurrency(), still, roots = [], gpu = false, label = 'render', frameHashes = null } = {}) {
  // the page may read: the composition folder, caches, scene module folders, and template-provided roots
  const allRoots = [...new Set([norm.baseDir, CACHE_DIR, TMP_ROOT, ...norm.items.map((i) => path.dirname(i.file)), ...roots])];
  await fsp.mkdir(path.dirname(path.resolve(out)), { recursive: true });

  if (still !== undefined && still !== null) {
    // one time → `out`; several (a review sheet's frames) → out-01.png, out-02.png, ... from one page
    const times = Array.isArray(still) ? still : [still];
    const slot = await openPage(norm, { roots: allRoots, gpu });
    try {
      const files = [], frames = [];
      for (const [i, s] of times.entries()) {
        const frame = Math.min(norm.totalFrames - 1, Math.max(0, Math.round(s * norm.fps)));
        const file = Array.isArray(still) ? out.replace(/\.png$/i, `-${String(i + 1).padStart(2, '0')}.png`) : out;
        await fsp.writeFile(file, await captureFrame(slot, frame, norm, { forcePng: true }));
        files.push(file);
        frames.push(frame);
      }
      return Array.isArray(still) ? { out, frames: files.length, files } : { out, frames: 1, frame: frames[0] };
    } finally {
      await slot.context.close().catch(() => {});
    }
  }

  const total = norm.totalFrames;
  const chunks = [];
  for (let s = 0; s < total; s += CHUNK_FRAMES) chunks.push({ index: chunks.length, start: s, end: Math.min(total, s + CHUNK_FRAMES) });
  const workers = Math.max(1, Math.min(concurrency, chunks.length));
  const work = await fsp.mkdtemp(path.join(await ensureTmp(), 'render-'));
  const tmpOut = path.join(path.dirname(path.resolve(out)), `.${path.basename(out)}.part-${process.pid}.mp4`);
  const t0 = Date.now();
  let verified = false; // false when there is no ffprobe to check the file with
  const live = new Set();
  const cleanup = onCleanup(async () => {
    for (const enc of live) enc.kill();
    await fsp.rm(tmpOut, { force: true });
    await fsp.rm(work, { recursive: true, force: true });
  });

  let done = 0;
  let failed = null;
  let nextChunk = 0;
  const allHashes = frameHashes ? new Array(total) : null;

  // Each chunk renders in a fresh browser context (fresh renderer process and
  // caches) and is encoded on its own. A frame's pixels therefore depend only on
  // the frames before it in the same chunk, and chunk boundaries are fixed, so
  // the output is identical at any --concurrency.
  const renderChunk = async (chunk) => {
    const slot = await openPage(norm, { roots: allRoots, gpu });
    const file = path.join(work, `chunk-${String(chunk.index).padStart(4, '0')}.mp4`);
    const enc = startChunkEncoder({ out: file, fps: norm.fps, frames: chunk.end - chunk.start, output: norm.output });
    live.add(enc);
    try {
      for (let i = chunk.start; i < chunk.end; i++) {
        if (failed) throw failed;
        const buf = await captureFrame(slot, i, norm);
        if (allHashes) allHashes[i] = sha256(buf);
        await enc.write(buf);
        done++;
        log.progress(`  ${label}: frames`, done, total);
      }
      await enc.finish();
    } finally {
      live.delete(enc);
      enc.kill();
      await slot.context.close().catch(() => {});
    }
    chunk.file = file;
  };

  try {
    await Promise.all(
      Array.from({ length: workers }, async () => {
        while (!failed && nextChunk < chunks.length) {
          const chunk = chunks[nextChunk++];
          try {
            await renderChunk(chunk);
          } catch (e) {
            if (!failed) failed = e;
          }
        }
      })
    );
    if (failed) throw failed;
    await muxFinal({ chunks: chunks.map((c) => c.file), listFile: path.join(work, 'chunks.txt'), out: tmpOut, fps: norm.fps, totalFrames: total, audio: norm.audio, output: norm.output });
    verified = !!(await verifyOutput(tmpOut, { width: norm.width, height: norm.height, fps: norm.fps, totalFrames: total, hasAudio: norm.audio.length > 0 && hasAudibleTrack(norm) }));
    await fsp.rename(tmpOut, out);
    if (frameHashes) frameHashes.push(...allHashes);
  } catch (e) {
    await fsp.rm(tmpOut, { force: true });
    throw e;
  } finally {
    cleanup();
    for (const enc of live) enc.kill();
    await fsp.rm(work, { recursive: true, force: true });
  }
  const secs = (Date.now() - t0) / 1000;
  return { out, frames: total, seconds: secs, fpsRendered: total / secs, workers, chunks: chunks.length, verified };
}

async function ensureTmp() {
  await fsp.mkdir(TMP_ROOT, { recursive: true });
  return TMP_ROOT;
}

function hasAudibleTrack(norm) {
  return norm.audio.some((a) => a.start < norm.duration);
}

export function assertWritable(out) {
  const dir = path.dirname(path.resolve(out));
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    throw inputError(`cannot write output to ${dir}`);
  }
}
