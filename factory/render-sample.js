// Phase 1 check: the copied engine renders its own sample clip (no voice, no art).
//   node factory/render-sample.js            → out/engine-sample.mp4
import fs from 'node:fs';
import { render, closeBrowser, probe, OUTPUT } from './lib/render.js';

const out = 'out/engine-sample.mp4';
const composition = {
  name: 'engine-sample',
  width: 1080,
  height: 1920,
  fps: 30,
  theme: 'paper',
  scenes: [{ id: 'card', type: 'custom/sample-card', duration: 4, props: { title: 'smart-feed', line: 'The engine renders.' } }],
  output: { ...OUTPUT, loudness: undefined },
};
delete composition.output.loudness;

try {
  const r = await render(composition, { out });
  const info = await probe(out);
  const v = info?.streams.find((s) => s.codec_type === 'video');
  const bytes = fs.statSync(out).size;
  const ok = v && v.width === 1080 && v.height === 1920 && Math.abs(info.duration - 4) < 0.1;
  console.log(`engine sample: ${v?.width}x${v?.height}, ${info?.duration}s, ${(bytes / 1024).toFixed(0)} KB, rendered in ${r.seconds.toFixed(1)}s (${(r.seconds / 4).toFixed(1)}x realtime, ${r.workers} workers)`);
  if (!ok) throw new Error('the sample is not a 4 s 1080x1920 video');
  console.log('PASS');
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  for (const d of e.details || []) console.error(`  - ${d}`);
  process.exitCode = 1;
} finally {
  await closeBrowser();
}
