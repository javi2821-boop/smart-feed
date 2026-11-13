// Draw the placeholder cast and backgrounds as PNGs (headless Chromium renders the SVGs in tools/placeholder-art.js).
//
//   node tools/make-placeholders.js            every character and background that is missing or still a placeholder
//   node tools/make-placeholders.js king study only these
//
// A folder holding real art is never touched: a placeholder folder is marked by a file named PLACEHOLDER, and this
// tool only writes into folders that have that marker (or don't exist yet). Backgrounds are marked the same way by
// <name>.PLACEHOLDER next to <name>.png. Delete the marker when you drop real art in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { CAST, bodySvg, headSvg, mouthSvg, BACKGROUNDS } from './placeholder-art.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/spec.json'), 'utf8'));
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--disable-gpu'] });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function shoot(svg, w, h, file, { transparent }) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
}

let made = 0;
let kept = 0;
for (const name of spec.characters) {
  if (!want(name)) continue;
  if (!CAST[name]) throw new Error(`no placeholder drawing for "${name}" (add it to tools/placeholder-art.js)`);
  const dir = path.join(ROOT, 'assets/cast', name);
  const marker = path.join(dir, 'PLACEHOLDER');
  if (fs.existsSync(dir) && !fs.existsSync(marker)) {
    kept++;
    console.log(`kept   cast/${name} (real art: no PLACEHOLDER marker)`);
    continue;
  }
  fs.mkdirSync(dir, { recursive: true });
  const P = spec.parts;
  await shoot(bodySvg(name), P.body.width, P.body.height, path.join(dir, P.body.file), { transparent: true });
  await shoot(headSvg(name), P.head.width, P.head.height, path.join(dir, P.head.file), { transparent: true });
  await shoot(mouthSvg(false), P['mouth-closed'].width, P['mouth-closed'].height, path.join(dir, P['mouth-closed'].file), { transparent: true });
  await shoot(mouthSvg(true), P['mouth-open'].width, P['mouth-open'].height, path.join(dir, P['mouth-open'].file), { transparent: true });
  fs.writeFileSync(marker, 'These four PNGs are placeholders drawn by tools/make-placeholders.js.\nDelete this file when you replace them with real art.\n');
  made++;
  console.log(`placeholder cast/${name}`);
}
for (const name of spec.backgrounds) {
  if (!want(name)) continue;
  if (!BACKGROUNDS[name]) throw new Error(`no placeholder drawing for background "${name}"`);
  const file = path.join(ROOT, 'assets/backgrounds', `${name}.png`);
  const marker = path.join(ROOT, 'assets/backgrounds', `${name}.PLACEHOLDER`);
  if (fs.existsSync(file) && !fs.existsSync(marker)) {
    kept++;
    console.log(`kept   backgrounds/${name}.png (real art)`);
    continue;
  }
  await shoot(BACKGROUNDS[name](), spec.background.width, spec.background.height, file, { transparent: false });
  fs.writeFileSync(marker, `${name}.png is a placeholder drawn by tools/make-placeholders.js.\nDelete this file when you replace it with real art.\n`);
  made++;
  console.log(`placeholder backgrounds/${name}.png`);
}
await browser.close();
console.log(`${made} drawn, ${kept} left alone`);
