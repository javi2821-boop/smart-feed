// Encoding: each fixed-size chunk of frames is encoded to its own H.264 file
// (PNG/JPEG frames on stdin), then the chunks are concatenated with stream copy
// and the audio is mixed in. Settings are fixed so the same frames always
// produce the same bytes.

import fsp from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { findFfmpeg, probe, run } from './ffmpeg.js';
import { encodeFailed } from './errors.js';
import { log } from './log.js';
import { round } from './util.js';

// One x264 thread per chunk encoder. Fixed (not CPU-dependent) so output bytes don't vary by machine, and one, not
// two: with frame threads, the bitrate cap (VBV: -maxrate/-bufsize) makes x264 encode identical frames differently from
// run to run once the cap binds. Pixel and blueprint frames stay under their caps, so they always matched; the
// newspaper look's paper texture hits its cap, and 018 differed every render (2026-10-28). The chunks already encode in
// parallel, one per render worker, so one thread each costs little.
export const ENCODER_THREADS = 1;

/** Build the ffmpeg audio filter graph for the composition's tracks. */
async function audioGraph(tracks, total, firstInput) {
  const inputs = [];
  const chains = [];
  const labels = [];
  for (let k = 0; k < tracks.length; k++) {
    const a = tracks[k];
    const info = await probe(a.path).catch(() => null);
    const fileDur = info?.duration || 0;
    if (info && !info.streams.some((s) => s.codec_type === 'audio')) {
      throw encodeFailed(`audio[${k}] has no audio stream: ${a.path}`);
    }
    const available = a.loop ? Infinity : Math.max(0, fileDur - a.trim);
    const len = Math.min(a.duration ?? Infinity, available, total - a.start);
    if (!(len > 0)) {
      log.warn(`audio[${k}] ${a.path} contributes nothing (starts at ${a.start}s of ${round(total)}s, ${round(fileDur)}s long)`);
      continue;
    }
    if (a.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', a.path);
    const idx = firstInput + labels.length;
    const f = [
      `atrim=start=${round(a.trim)}`,
      'asetpts=PTS-STARTPTS',
      `atrim=duration=${round(len)}`,
      'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo',
      `volume=${a.volume}`,
    ];
    if (a.fadeIn > 0) f.push(`afade=t=in:st=0:d=${round(Math.min(a.fadeIn, len))}`);
    if (a.fadeOut > 0) f.push(`afade=t=out:st=${round(Math.max(0, len - a.fadeOut))}:d=${round(Math.min(a.fadeOut, len))}`);
    const delay = Math.round(a.start * 1000);
    if (delay > 0) f.push(`adelay=${delay}|${delay}`);
    const label = `a${labels.length}`;
    chains.push(`[${idx}:a]${f.join(',')}[${label}]`);
    labels.push(label);
  }
  if (!labels.length) return null;
  const mix =
    labels.length === 1
      ? `[${labels[0]}]anull[mix]`
      : `${labels.map((l) => `[${l}]`).join('')}amix=inputs=${labels.length}:normalize=0:duration=longest[mix]`;
  chains.push(mix, `[mix]apad,atrim=duration=${round(total, 4)}[pre]`);
  return { inputs, chains };
}

/** The end of the audio graph: the default safety limiter, or gain + a 4× oversampled limiter for a loudness target. */
const finish = (ag, master) => `${ag.chains.join(';')};[pre]${master ? `volume=${master.gain.toFixed(2)}dB,aresample=192000,alimiter=limit=${master.limit.toFixed(4)}:attack=1:release=60:level=false,aresample=48000` : 'alimiter=limit=0.95:level=false'}[aout]`;

/** Integrated loudness (LUFS) and true peak (dBTP) of a file's first audio stream. */
export async function measureLoudness(file) {
  const { ffmpeg } = findFfmpeg();
  const r = await run(ffmpeg, ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const at = r.stderr.lastIndexOf('Summary:');
  const s = at < 0 ? '' : r.stderr.slice(at);
  // digital silence reads as -inf
  const num = (re) => {
    const v = (s.match(re) || [])[1];
    return v === '-inf' ? -Infinity : Number(v);
  };
  const I = num(/I:\s+(-?(?:[\d.]+|inf)) LUFS/);
  const peak = num(/True peak:\s+Peak:\s+(-?(?:[\d.]+|inf)) dBFS/);
  if (r.code !== 0 || Number.isNaN(I) || Number.isNaN(peak)) {
    throw encodeFailed(`could not measure the loudness of ${file}`, { details: (s || r.stderr).trim().split('\n').slice(-4) });
  }
  return { I, peak };
}

/** Spawn ffmpeg with a stdin pipe. Returns { write(buf), finish(), kill() }. */
function spawnFfmpeg(args, what) {
  const { ffmpeg } = findFfmpeg();
  log.debug(`ffmpeg ${args.join(' ')}`);
  const child = spawn(ffmpeg, args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  let exited = null;
  const done = new Promise((resolve) => {
    child.on('close', (code, signal) => {
      exited = { code, signal };
      resolve(exited);
    });
    child.on('error', (e) => {
      exited = { code: -1, error: e };
      resolve(exited);
    });
  });
  child.stderr.on('data', (d) => (stderr += d));
  child.stdin.on('error', () => {}); // surfaced via the exit code

  const fail = (msg) => encodeFailed(`ffmpeg ${what} ${msg}`, { details: stderr.trim().split('\n').filter(Boolean).slice(-6) });
  return {
    async write(buf) {
      if (exited) throw fail(`exited early (code ${exited.code})`);
      if (!child.stdin.write(buf)) {
        await new Promise((r) => {
          child.stdin.once('drain', r);
          done.then(r);
        });
      }
    },
    async finish() {
      child.stdin.end();
      const r = await done;
      if (r.code !== 0) throw fail(`failed (exit ${r.code}${r.signal ? `, ${r.signal}` : ''})`);
    },
    kill() {
      if (!exited) child.kill('SIGKILL');
    },
  };
}

/**
 * Encode one chunk of frames (PNG/JPEG on stdin) to a video-only H.264 file.
 * Every chunk uses identical settings, so chunks concatenate with stream copy.
 */
export function startChunkEncoder({ out, fps, frames, output = {} }) {
  // Grain/paper texture: luma-only noise after RGB→YUV. Static noise (paper) plus
  // temporal noise (grain), both with fixed seeds, so output stays deterministic.
  // It also dithers gradients, which prevents banding in dark navy skies.
  const g = Math.max(0, Math.min(1, output.grain || 0));
  // Mostly static (paper) noise: temporal grain is what costs bitrate, so it stays light.
  const noise = g > 0 ? `,noise=c0s=${Math.max(1, Math.round(g * 6))}:c0f=u:c0_seed=424242,noise=c0s=${Math.max(1, Math.round(g * 4))}:c0f=t+u:c0_seed=171717` : '';
  const maxrate = output.maxBitrate || '12M';
  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    // one filter thread: the grain's temporal noise (vf noise, t flag) draws from one random stream shared by the
    // filter's slices, so its output depends on how many slices run (ffmpeg's default is one per CPU) and on which
    // finishes first
    '-filter_threads', '1',
    // single-threaded decoding of the piped frames: ffmpeg's frame-threaded PNG decoder
    // hands x264 frames whose metadata depends on pipe timing, and x264 then encodes
    // identical pixels differently (seen under load at --concurrency 3)
    // minimal stream probing: how much of a pipe ffmpeg probes depends on how fast the
    // bytes arrive, and x264 then encodes identical frames differently (seen on footage
    // with no grain, where it hit 1 render in 2); with it, piped chunks encode to the
    // same bytes as the same frames read from files
    '-probesize', '32', '-analyzeduration', '0',
    '-f', 'image2pipe', '-framerate', String(fps), '-threads', '1', '-c:v', output.frameFormat === 'jpeg' ? 'mjpeg' : 'png', '-i', 'pipe:0',
    '-vf', `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p${noise}`,
    '-an',
    '-c:v', 'libx264', '-preset', output.preset || 'medium', '-crf', String(output.crf ?? 18),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-threads', String(ENCODER_THREADS),
    '-x264-params', 'aq-mode=3',
    '-maxrate', maxrate, '-bufsize', `${parseFloat(maxrate) * 2}${maxrate.replace(/^[\d.]+/, '')}`,
    '-g', String(fps * 2), '-r', String(fps),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-frames:v', String(frames),
    '-fflags', '+bitexact', '-flags:v', '+bitexact', '-map_metadata', '-1',
    '-f', 'mp4', out,
  ];
  return spawnFfmpeg(args, 'chunk encoder');
}

/**
 * Concatenate the chunk files (stream copy, no re-encode) and mix in the audio
 * tracks: the final MP4.
 */
export async function muxFinal({ chunks, listFile, out, fps, totalFrames, audio = [], output = {} }) {
  const total = totalFrames / fps;
  await fsp.writeFile(listFile, chunks.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const ag = await audioGraph(audio, total, 1);
  const mux = async (master) => {
    const args = [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-f', 'concat', '-safe', '0', '-i', listFile,
      ...(ag ? ag.inputs : []),
      ...(ag ? ['-filter_complex', finish(ag, master), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', output.audioBitrate || '192k', '-ar', '48000', '-ac', '2'] : ['-map', '0:v', '-an']),
      '-c:v', 'copy',
      '-t', String(round(total, 4)),
      '-movflags', '+faststart',
      '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1', '-map_chapters', '-1',
      '-f', 'mp4', out,
    ];
    const proc = spawnFfmpeg(args, 'mux');
    await proc.finish();
  };
  if (!ag || !output.loudness) return mux(null);

  // Loudness target: measure the plain mix, set the gain, and hold true peak with an
  // oversampled limiter. The AAC encode can still lift true peak a little, so the
  // finished file is measured and the gain and ceiling corrected until both land.
  // Every step is a pure function of the mix, so the output stays deterministic.
  const { lufs, truePeak = -1 } = output.loudness;
  const pre = `${out}.mix.wav`;
  const { ffmpeg } = findFfmpeg();
  // input 0 is the video in the real mux, so a silent stand-in keeps the track indexes the same
  const r = await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-f', 'lavfi', '-t', '0.1', '-i', 'anullsrc=r=48000:cl=stereo', ...ag.inputs, '-filter_complex', `${ag.chains.join(';')};[pre]anull[aout]`, '-map', '[aout]', '-c:a', 'pcm_f32le', '-ar', '48000', pre]);
  if (r.code !== 0) throw encodeFailed('ffmpeg could not pre-mix the audio for loudness', { details: r.stderr.trim().split('\n').slice(-4) });
  const mix = await measureLoudness(pre).finally(() => fsp.rm(pre, { force: true }));
  // ebur128 bottoms out at -70 LUFS: a mix there is silence (or near it), and lifting it would only raise noise
  if (!Number.isFinite(mix.I) || mix.I <= -70) {
    log.warn('the mix is silent; loudness target skipped');
    return mux(null);
  }
  // The limiter takes a little level off a peaky mix, so the gain is corrected
  // from what the finished file measures, along with the ceiling.
  let gain = lufs - mix.I;
  let ceiling = truePeak - 0.5;
  let last;
  const tried = [];
  const score = (t) => (t.peak <= truePeak ? 0 : 100) + Math.abs(t.I - lufs);
  for (let attempt = 0; attempt < 8; attempt++) {
    await mux({ gain, limit: 10 ** (ceiling / 20) });
    last = { ...(await measureLoudness(out)), gain, ceiling };
    tried.push(last);
    log.debug(`loudness: mix ${mix.I} LUFS, gain ${gain.toFixed(2)} dB, ceiling ${ceiling.toFixed(1)} dBFS → ${last.I} LUFS, true peak ${last.peak} dBTP`);
    const loudOk = Math.abs(last.I - lufs) <= 0.5;
    const peakOk = last.peak <= truePeak;
    if (loudOk && peakOk) break;
    if (!loudOk) gain += (lufs - last.I) * 0.7; // damped: the limiter makes level vs gain non-linear
    if (!peakOk) ceiling -= Math.max(0.3, last.peak - truePeak + 0.1);
  }
  const best = tried.reduce((a, b) => (score(b) < score(a) ? b : a));
  if (best !== last) {
    await mux({ gain: best.gain, limit: 10 ** (best.ceiling / 20) });
    last = best;
  }
  if (last.peak > truePeak) log.warn(`true peak ${last.peak} dBTP is still over ${truePeak} dBTP after limiting`);
  if (Math.abs(last.I - lufs) > 1) log.warn(`loudness ${last.I} LUFS is more than 1 LU from the ${lufs} LUFS target`);
  log.info(`audio: ${last.I} LUFS integrated, true peak ${last.peak} dBTP (target ${lufs} LUFS, ≤ ${truePeak} dBTP)`);
}

/** Check the encoded file has what we asked for. Throws ENCODE_FAILED otherwise. */
export async function verifyOutput(file, { width, height, fps, totalFrames, hasAudio }) {
  const info = await probe(file);
  if (!info) return null; // no ffprobe available — skip verification
  const v = info.streams.find((s) => s.codec_type === 'video');
  const problems = [];
  if (!v) problems.push('no video stream');
  else {
    if (v.width !== width || v.height !== height) problems.push(`size ${v.width}x${v.height}, expected ${width}x${height}`);
    if (v.nb_frames && Number(v.nb_frames) !== totalFrames) problems.push(`${v.nb_frames} frames, expected ${totalFrames}`);
  }
  const a = info.streams.find((s) => s.codec_type === 'audio');
  if (hasAudio && !a) problems.push('audio stream missing');
  if (!hasAudio && a) problems.push('unexpected audio stream');
  const expected = totalFrames / fps;
  if (Math.abs(info.duration - expected) > 0.1) problems.push(`duration ${round(info.duration)}s, expected ${round(expected)}s`);
  if (problems.length) throw encodeFailed(`output verification failed for ${file}`, { details: problems });
  return info;
}
