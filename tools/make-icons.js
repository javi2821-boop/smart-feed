// Draws the feed's home-screen icons (feed/icon-192.png, feed/icon-512.png): a paper speech bubble on the dark
// background. Run once; the PNGs are committed.  node tools/make-icons.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1d1b26"/>
  <path d="M112 132 h288 a36 36 0 0 1 36 36 v150 a36 36 0 0 1 -36 36 h-150 l-74 66 v-66 h-64 a36 36 0 0 1 -36 -36 v-150 a36 36 0 0 1 36 -36 Z" fill="#000" opacity="0.35" transform="translate(10 14)"/>
  <path d="M112 132 h288 a36 36 0 0 1 36 36 v150 a36 36 0 0 1 -36 36 h-150 l-74 66 v-66 h-64 a36 36 0 0 1 -36 -36 v-150 a36 36 0 0 1 36 -36 Z" fill="#fbf7ee"/>
  <rect x="136" y="188" width="150" height="26" rx="13" fill="#e0a526"/>
  <rect x="136" y="232" width="240" height="26" rx="13" fill="#2a8c82"/>
  <rect x="136" y="276" width="190" height="26" rx="13" fill="#d1603d"/>
</svg>`;
const browser = await chromium.launch();
for (const s of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: s, height: s } });
  await page.setContent(`<body style="margin:0">${svg(s)}</body>`);
  await page.screenshot({ path: path.join(ROOT, `feed/icon-${s}.png`) });
  await page.close();
}
await browser.close();
console.log('feed/icon-192.png, feed/icon-512.png');
