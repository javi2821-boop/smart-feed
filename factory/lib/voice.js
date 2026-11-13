// Narration and what the template needs from it: the WAV, its length, and the loudness of every video frame.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findFfmpeg } from '../../src/ffmpeg.js';
import { REPO_ROOT } from '../../src/paths.js';

export const VOICE_START = 0.6; // seconds of picture before the first word
export const QUESTION_GAP = 0.35; // after the last word, before the question card arrives
export const QUESTION_HOLD = 3.4; // the card's arrival (about 0.4 s) plus 3 s held in silence
export const TAIL = 0.9; // other types: a breath after the last word

export const readVoiceConfig = () => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'voice/voice.json'), 'utf8'));

/** Seconds of everything in a clip that is not narration. */
export const extraSeconds = (type) => VOICE_START + (type === 'question' ? QUESTION_GAP + QUESTION_HOLD : TAIL);

/** The narration lengths (seconds) that put the whole clip between 35 and 45 s, and the one to aim for. */
export function narrationWindow(type) {
  const extra = extraSeconds(type);
  return { lo: 35.6 - extra, hi: 44.4 - extra, target: 39.5 - extra };
}

/**
 * Read `text` aloud to `out` (.wav). Returns { seconds, speed, voice }.
 * SMARTFEED_FAKE_VOICE=1 writes a speech-shaped test tone instead (for trying the template without Kokoro).
 */
export function narrate(text, out, { type }) {
  const cfg = readVoiceConfig();
  const win = narrationWindow(type);
  const words = text.split(/\s+/).length;
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (process.env.SMARTFEED_FAKE_VOICE === '1') {
    const { ffmpeg } = findFfmpeg();
    const seconds = Math.round(Math.min(win.hi, Math.max(win.lo, words / 2.75)) * 100) / 100;
    // a buzzy tone, gated on and off like syllables and phrases
    const expr = `0.5*sin(2*PI*150*t)*(0.6+0.4*sin(2*PI*5.1*t))*gt(sin(2*PI*2.9*t)+0.35\\,0)*gt(sin(2*PI*0.23*t)+0.8\\,0)`;
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc=${expr}:s=24000:d=${seconds}`, '-ac', '1', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`could not make the test voice: ${r.stderr}`);
    return { seconds, speed: 1, voice: 'test-tone' };
  }

  const textFile = out.replace(/\.wav$/, '.txt');
  fs.writeFileSync(textFile, text);
  // a first guess at the speed from how fast this voice talks, so most scripts need only one read
  const guess = cfg.wordsPerSecond ? Math.min(1.2, Math.max(0.85, words / (cfg.wordsPerSecond * win.target))) : cfg.speed || 1;
  const speed = Math.abs(guess - 1) < 0.04 ? 1 : Math.round(guess * 100) / 100;
  const py = process.env.SMARTFEED_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const r = spawnSync(py, [path.join(REPO_ROOT, 'voice/tts.py'), '--text-file', textFile, '--out', out, '--voice', cfg.voice, '--speed', String(speed),
    '--models', path.join(REPO_ROOT, 'voice/models'), '--min', String(win.lo), '--max', String(win.hi), '--target', String(win.target)], { encoding: 'utf8' });
  const line = (r.stdout || '').trim().split('\n').pop() || '';
  let res;
  try { res = JSON.parse(line); } catch { throw new Error(`the voice step crashed: ${(r.stderr || r.error?.message || 'no output').trim().split('\n').slice(-3).join(' | ')}`); }
  if (!res.ok) throw new Error(`the voice step failed: ${res.error}`);
  return { seconds: res.seconds, speed: res.speed, voice: res.voice };
}

/** Loudness of each video frame, 0-100 (100 = this recording's loud syllables), and the WAV's exact length. */
export function frameLevels(wav, fps) {
  const { ffmpeg } = findFfmpeg();
  const rate = 24000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', String(rate), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`could not read the narration audio: ${String(r.stderr).trim()}`);
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2));
  const per = rate / fps;
  const n = Math.ceil(pcm.length / per);
  const rms = new Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    const a = Math.floor(f * per), b = Math.min(pcm.length, Math.floor((f + 1) * per));
    for (let i = a; i < b; i++) s += pcm[i] * pcm[i];
    rms[f] = Math.sqrt(s / Math.max(1, b - a));
  }
  const sorted = [...rms].sort((x, y) => x - y);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  return { levels: rms.map((v) => Math.min(100, Math.round((v / ref) * 100))), seconds: pcm.length / rate };
}
