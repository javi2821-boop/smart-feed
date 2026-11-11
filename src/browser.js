// Headless Chromium management. Pages load from a fake origin
// (http://render-machine.local) whose requests are answered from disk via
// Playwright routing: no port is opened, and anything outside the allowed
// roots or on the network is refused. That keeps renders hermetic and
// reproducible.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ORIGIN, REPO_ROOT } from './paths.js';
import { renderFailed } from './errors.js';
import { log } from './log.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

const CHROMIUM_ARGS = [
  '--force-color-profile=srgb', // exact brand colours, no monitor profile
  '--disable-lcd-text', // grayscale AA: subpixel colour fringes look bad in video
  '--font-render-hinting=none', // consistent glyph shapes across machines
  '--disable-gpu', // CPU raster: deterministic and available everywhere
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--no-default-browser-check',
  '--disable-partial-raster', // re-raster whole tiles: partial re-raster makes AA depend on frame history
];

let shared = null;

/**
 * Launch (or reuse) the headless browser. Reused across jobs in batch mode.
 * Parallel callers share one launch (the promise is cached), so N render
 * workers never start N browsers.
 */
export async function getBrowser({ gpu = false } = {}) {
  if (shared && shared.gpu === gpu) {
    const browser = await shared.launch;
    if (browser.isConnected()) return browser;
  }
  if (shared) await closeBrowser();
  const args = gpu
    ? CHROMIUM_ARGS.filter((a) => a !== '--disable-gpu').concat(['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    : CHROMIUM_ARGS;
  const launch = chromium.launch({ headless: true, args }).catch((e) => {
    if (shared?.launch === launch) shared = null;
    throw renderFailed(`could not launch headless Chromium: ${e.message.split('\n')[0]}`, {
      hint: 'run `npx playwright install --with-deps chromium`',
      cause: e,
    });
  });
  shared = { launch, gpu };
  return launch;
}

export async function closeBrowser() {
  if (shared) {
    const launch = shared.launch;
    shared = null;
    await launch.then((b) => b.close()).catch(() => {});
  }
}

/**
 * Serve the render origin from disk.
 *   /@repo/<path>  → file inside the repository
 *   /@fs/<abs>     → absolute path (must be inside one of `roots`)
 *   /<path>        → resolved against `siteRoot` (used when recording a game)
 */
export async function attachRoutes(context, { roots = [], siteRoot = null, allowNetwork = false, onBlocked } = {}) {
  const allowed = [REPO_ROOT, ...roots].map((r) => path.resolve(r));
  // Node resolves package files through a node_modules junction to their real
  // cache path. Permit that package tree, including fonts referenced by scaled
  // stylesheets, without granting access to unrelated machine cache files.
  const dependencies = path.join(REPO_ROOT, 'node_modules');
  if (fs.existsSync(dependencies)) allowed.push(fs.realpathSync(dependencies));
  const inside = (p) => allowed.some((r) => {
    const relative = path.relative(r, p);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });

  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) {
      if (allowNetwork && /^https?:$/.test(url.protocol)) return route.continue();
      if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      onBlocked?.(url.href);
      return route.abort('blockedbyclient');
    }
    let file;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/@repo/')) file = path.join(REPO_ROOT, pathname.slice('/@repo/'.length));
    else if (pathname.startsWith('/@fs/')) {
      const absolute = pathname.slice('/@fs'.length);
      // /@fs/C:/... carries a drive path, while /@fs/home/... is POSIX and
      // /@fs//server/share/... is UNC. Windows must not resolve /C:/ as rooted
      // on the current drive (which would produce C:\\C:\\...).
      file = path.resolve(process.platform === 'win32' && /^\/[A-Za-z]:\//.test(absolute) ? absolute.slice(1) : absolute);
    }
    else if (siteRoot) file = path.join(siteRoot, pathname === '/' ? 'index.html' : pathname);
    else file = null;

    if (!file || !inside(path.resolve(file)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      log.debug(`404 ${pathname}`);
      return route.fulfill({ status: 404, body: `not found: ${pathname}` });
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file), headers: { 'cache-control': 'max-age=3600' } });
  });
}
