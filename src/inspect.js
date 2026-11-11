// Review helpers: a contact sheet (grid of frames) and/or individual frames
// extracted from a rendered video. Studio reviewers and CI use these to look
// at a render without scrubbing through it.

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { findFfmpeg, probe, run } from './ffmpeg.js';
import { assetError, encodeFailed } from './errors.js';
import { round } from './util.js';
import { log } from './log.js';

export async function inspectVideo(file, { every, out, framesDir } = {}) {
  if (!fs.existsSync(file)) throw assetError(`video not found: ${file}`);
  const { ffmpeg } = findFfmpeg();
  const info = await probe(file);
  const duration = info?.duration || 10;
  const step = every || Math.max(0.5, round(duration / 12, 2));
  const n = Math.max(1, Math.floor(duration / step));
  const cols = Math.min(6, n);
  const rows = Math.ceil(n / cols);
  const v = info?.streams.find((s) => s.codec_type === 'video');
  const tileW = v && v.width > v.height ? 480 : 270;
  const result = { video: path.resolve(file), duration: round(duration, 3), every: step, streams: info?.streams };

  const sheet = out || file.replace(/\.mp4$/i, '') + '.sheet.png';
  // Sample mid-interval (t = step/2, 3step/2, ...) so the first tile isn't frame 0.
  const r = await run(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', String(round(step / 2, 3)), '-i', file,
    '-vf', `fps=1/${step},scale=${tileW}:-2,pad=iw+8:ih+8:4:4:color=0x111111,tile=${cols}x${rows}`,
    '-frames:v', '1', sheet,
  ]);
  if (r.code !== 0) throw encodeFailed('could not build contact sheet', { details: [r.stderr.trim()] });
  result.sheet = path.resolve(sheet);
  log.info(`contact sheet (${n} frames, every ${step}s): ${sheet}`);

  if (framesDir) {
    await fsp.mkdir(framesDir, { recursive: true });
    const r2 = await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-vf', `fps=1/${step}`, path.join(framesDir, 'frame_%03d.png')]);
    if (r2.code !== 0) throw encodeFailed('could not extract frames', { details: [r2.stderr.trim()] });
    result.framesDir = path.resolve(framesDir);
    log.info(`frames: ${framesDir}`);
  }
  return result;
}
