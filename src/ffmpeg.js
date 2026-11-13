import { spawn, spawnSync } from 'node:child_process';
import { encodeFailed } from './errors.js';

let cached = null;

/**
 * Locate ffmpeg/ffprobe: $RENDER_MACHINE_FFMPEG / $RENDER_MACHINE_FFPROBE,
 * then PATH. Checks that libx264 is available.
 */
export function findFfmpeg() {
  if (cached) return cached;
  const ffmpeg = process.env.RENDER_MACHINE_FFMPEG || 'ffmpeg';
  const ffprobe = process.env.RENDER_MACHINE_FFPROBE || 'ffprobe';
  const v = spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (v.error || v.status !== 0) {
    throw encodeFailed(`ffmpeg not found (tried "${ffmpeg}")`, {
      hint: 'install it (Ubuntu: `sudo apt-get install -y ffmpeg`) or set RENDER_MACHINE_FFMPEG=/path/to/ffmpeg',
    });
  }
  if (!/libx264/.test(v.stdout)) {
    throw encodeFailed(`ffmpeg at "${ffmpeg}" was built without libx264`, { hint: 'install a full ffmpeg build (Ubuntu package `ffmpeg` has it)' });
  }
  const p = spawnSync(ffprobe, ['-version'], { encoding: 'utf8' });
  cached = { ffmpeg, ffprobe: p.error || p.status !== 0 ? null : ffprobe };
  return cached;
}

/** Run a command to completion; resolves { code, stdout, stderr }. */
export function run(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

/** ffprobe a media file → { duration, streams: [{codec_type, codec_name, width, height, nb_frames}] } */
export async function probe(file) {
  const { ffprobe } = findFfmpeg();
  if (!ffprobe) return null;
  const r = await run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,nb_frames,r_frame_rate,pix_fmt', '-of', 'json', file]);
  if (r.code !== 0) throw encodeFailed(`ffprobe could not read ${file}`, { details: [r.stderr.trim().split('\n').slice(-3).join(' ')] });
  const j = JSON.parse(r.stdout);
  return { duration: Number(j.format?.duration || 0), streams: j.streams || [] };
}
