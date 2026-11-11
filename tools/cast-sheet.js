// One picture of the whole cast, each puppet assembled from its four parts exactly as the clip template does it
// (assets/spec.json anchors, plus a character's own meta.json), mouth closed and mouth open, and the backgrounds.
// Use it to check new art before a clip is rendered.
//
//   node tools/cast-sheet.js [out/cast-sheet.png]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadCast } from '../factory/lib/cast.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || 'out/cast-sheet.png');
const { spec, characters, backgrounds } = loadCast(ROOT);
// inlined as data: URLs, since a page made with setContent may not read file: URLs
const url = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const S = 0.3; // sheet scale
const cellW = 280, cellH = 500, cols = 8;

const puppet = (c, open, x, y) => {
  const P = spec.parts;
  const hx = c.anchors.neck[0] - c.anchors.headPivot[0];
  const hy = c.anchors.neck[1] - c.anchors.headPivot[1];
  const top = -Math.min(0, hy);
  const img = (file, l, t, w) => `<img src="${url(path.join(c.dir, file))}" style="position:absolute;left:${l * S}px;top:${(t + top) * S}px;width:${w * S}px">`;
  const m = open ? P['mouth-open'] : P['mouth-closed'];
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${800 * S}px;height:${(1000 + top) * S}px">
    ${img(P.body.file, 0, 0, P.body.width)}${img(P.head.file, hx, hy, P.head.width)}
    ${img(m.file, hx + c.anchors.mouth[0] - m.width / 2, hy + c.anchors.mouth[1] - m.height / 2, m.width)}</div>`;
};

let html = '';
characters.forEach((c, i) => {
  const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH * 2;
  html += puppet(c, false, x + 20, y + 40) + puppet(c, true, x + 20, y + 40 + cellH);
  html += `<div style="position:absolute;left:${x + 20}px;top:${y + 8}px;font:600 20px sans-serif;color:#2b2a33">${c.name}${c.placeholder ? ' (placeholder)' : ''}</div>`;
});
const rows = Math.ceil(characters.length / cols);
const bgTop = rows * cellH * 2 + 20;
backgrounds.forEach((b, i) => {
  html += `<img src="${url(b.file)}" style="position:absolute;left:${20 + i * 290}px;top:${bgTop + 30}px;width:270px">`;
  html += `<div style="position:absolute;left:${20 + i * 290}px;top:${bgTop}px;font:600 20px sans-serif;color:#2b2a33">${b.name}${b.placeholder ? ' (placeholder)' : ''}</div>`;
});
const W = cols * cellW + 20, H = bgTop + 30 + 480 + 20;
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0;background:#bdb5a6;position:relative;width:${W}px;height:${H}px">${html}</body>`);
await page.waitForLoadState('networkidle');
await page.screenshot({ path: out });
await browser.close();
console.log(out);
