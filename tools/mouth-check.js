// Does the mouth move with the voice? Measures it on a finished clip instead of judging by eye.
//
//   node tools/mouth-check.js clips/<name>.mp4
//
// For every frame it reads (a) how loud the sound is and (b) whether the open mouth is showing (dark mouth-coloured
// pixels where the mouth sits). It then reports how often the two agree. Works for the placeholder mouths and for
// any art that keeps the open mouth dark red-brown, as the style guide asks.
import { spawnSync } from 'node:child_process';

const file = process.argv[2];
if (!file) { console.log('usage: node tools/mouth-check.js clips/<name>.mp4'); process.exit(2); }
const FPS = 30, W = 160, H = 110, X = 540 - W / 2, Y = 1032 - H / 2;
const run = (args) => spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 1 << 30 });

const v = run(['-i', file, '-vf', `crop=${W}:${H}:${X}:${Y}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
const a = run(['-i', file, '-ac', '1', '-ar', '24000', '-f', 's16le', '-']);
if (v.status !== 0 || a.status !== 0) { console.log('could not read the clip'); process.exit(1); }
const frames = Math.floor(v.stdout.length / (W * H * 3));
const pcm = new Int16Array(a.stdout.buffer, a.stdout.byteOffset, Math.floor(a.stdout.length / 2));
const per = 24000 / FPS;
const open = [], loud = [];
for (let f = 0; f < frames; f++) {
  let dark = 0;
  const base = f * W * H * 3;
  for (let i = 0; i < W * H; i++) {
    const r = v.stdout[base + i * 3], g = v.stdout[base + i * 3 + 1], b = v.stdout[base + i * 3 + 2];
    if (r > 74 && r < 120 && g < 46 && b < 52) dark++; // the inside of an open mouth (#5a1f24)
  }
  open.push(dark > 150); // the closed mouth is a thin darker line and never reaches this
  let s = 0;
  const i0 = Math.floor(f * per), i1 = Math.min(pcm.length, Math.floor((f + 1) * per));
  for (let i = i0; i < i1; i++) s += pcm[i] * pcm[i];
  loud.push(Math.sqrt(s / Math.max(1, i1 - i0)));
}
const ref = [...loud].sort((x, y) => x - y)[Math.floor(frames * 0.95)] || 1;
let loudFrames = 0, loudOpen = 0, quietFrames = 0, quietClosed = 0;
// only the stretch where the puppet is in place and speaking: from 1.5 s to the last loud frame
let last = frames - 1;
while (last > 0 && loud[last] / ref < 0.35) last--;
const first = 45;
for (let f = first; f <= last; f++) {
  const l = loud[f] / ref;
  if (l > 0.35) { loudFrames++; if (open[f]) loudOpen++; }
  else if (l < 0.04) { quietFrames++; if (!open[f]) quietClosed++; }
}
// does shifting the mouth earlier or later fit better? (0 means it is in time)
let best = { shift: 0, score: -1 };
for (let shift = -6; shift <= 6; shift++) {
  let hit = 0, n = 0;
  for (let f = first; f <= last - 6; f++) {
    const l = loud[f] / ref;
    if (l > 0.35 || l < 0.04) { n++; if (open[f + shift] === l > 0.35) hit++; }
  }
  if (hit / n > best.score) best = { shift, score: hit / n };
}
const pct = (x, n) => (n ? `${Math.round((x / n) * 100)}%` : 'n/a');
console.log(`${file}: ${frames} frames`);
console.log(`  mouth open on loud frames:    ${pct(loudOpen, loudFrames)} of ${loudFrames}`);
console.log(`  mouth closed on silent frames: ${pct(quietClosed, quietFrames)} of ${quietFrames}`);
console.log(`  best fit is with the mouth shifted ${best.shift} frame(s) (0 = exactly in time)`);
const ok = loudOpen / loudFrames > 0.9 && quietClosed / quietFrames > 0.9 && Math.abs(best.shift) <= 1;
console.log(ok ? '  PASS' : '  FAIL');
process.exit(ok ? 0 : 1);
