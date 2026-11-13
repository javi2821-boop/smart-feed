// Phase 6 check, part 1: the feed page loads and plays at phone size in a real browser.
//
//   node tools/feed-check.js [folder-with-mp4s] [--shots out/feed-check]
//
// It serves the feed page from this computer (nothing is published), with the clips in feed/feed.json, or with
// every MP4 in the folder you name as a stand-in feed. Then it drives Chrome at a Samsung phone's screen size and
// checks: silent autoplay, sound after the first tap (and it stays on), swipe to the next clip, the next clip
// loaded ahead, watched clips remembered after a reload and moved behind the unwatched ones.
// It needs Chrome or Edge installed (the bundled test Chromium cannot play MP4 video).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shotsAt = args.includes('--shots') ? path.resolve(args[args.indexOf('--shots') + 1]) : null;
const folder = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json' };

let feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'feed/feed.json'), 'utf8'));
let clipRoot = ROOT;
if (folder) {
  const dir = path.resolve(folder);
  const kinds = ['lesson', 'question', 'story', 'scripture'];
  feed = { clips: fs.readdirSync(dir).filter((f) => f.endsWith('.mp4')).map((f, i) => ({ id: f.slice(0, -4), type: kinds[i % 4], title: f, file: `clips/${f}`, poster: `clips/${f.slice(0, -4)}.jpg`, added: `2026-01-0${i + 1}` })) };
  clipRoot = null;
  var clipDir = dir; // eslint-disable-line no-var
}
if (feed.clips.length < 2) {
  console.log('FAIL: the check needs at least 2 clips (in feed/feed.json, or MP4s in the folder you name).');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/feed.json') return res.writeHead(200, { 'content-type': TYPES['.json'] }).end(JSON.stringify(feed));
  let file = url.startsWith('/clips/') ? (clipRoot ? path.join(clipRoot, url) : path.join(clipDir, url.slice(7))) : path.join(ROOT, 'feed', url === '/' ? 'index.html' : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end('not found');
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return fs.createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--autoplay-policy=document-user-activation-required'] }); break; } catch { /* try the next one */ }
}
if (!browser) {
  console.log('FAIL: neither Chrome nor Edge is installed, and the check needs one of them to play MP4 video.');
  process.exit(1);
}
// a Samsung Galaxy S-class screen: 412x915 CSS pixels, touch, mobile
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
const page = await context.newPage();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const shot = async (name) => { if (shotsAt) { fs.mkdirSync(shotsAt, { recursive: true }); await page.screenshot({ path: path.join(shotsAt, `${name}.png`) }); } };
const state = (i) => page.evaluate((i) => {
  const s = document.querySelectorAll('section.clip')[i];
  const v = s?.querySelector('video');
  return v ? { src: !!v.getAttribute('src'), paused: v.paused, muted: v.muted, time: v.currentTime, ready: v.readyState, watched: s.classList.contains('watched'), w: v.videoWidth, h: v.videoHeight, id: v.getAttribute('src') } : null;
}, i);
const playing = async (i) => { try { await page.waitForFunction((i) => { const v = document.querySelectorAll('section.clip video')[i]; return v && !v.paused && v.currentTime > 0.3; }, i, { timeout: 15000 }); return true; } catch { return false; } };
const swipeUp = () => page.evaluate(() => { const f = document.getElementById('feed'); f.scrollBy({ top: f.clientHeight, behavior: 'instant' }); });

try {
  await page.goto(base);
  await page.waitForSelector('section.clip video');
  check('the page loads and lists the clips', (await page.locator('section.clip video').count()) === feed.clips.length, `${feed.clips.length} clips`);
  check('the first clip plays by itself', await playing(0));
  let s0 = await state(0);
  check('it starts muted, with a "Tap for sound" button', s0.muted && (await page.locator('#sound').isVisible()));
  check('the video is 1080x1920', s0.w === 1080 && s0.h === 1920, `${s0.w}x${s0.h}`);
  const fits = await page.evaluate(() => { const r = document.querySelector('section.clip video').getBoundingClientRect(); return r.width <= innerWidth + 1 && r.height <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth; });
  check('the clip fills the phone screen with no sideways scrolling', fits);
  check('the next clip is loaded ahead of time', (await state(1)).src);
  await shot('1-first-clip-muted');

  await page.touchscreen.tap(206, 400);
  await page.waitForTimeout(400);
  s0 = await state(0);
  check('the first tap turns sound on and keeps playing', !s0.muted && !s0.paused && !(await page.locator('#sound').isVisible()));
  await shot('2-sound-on');

  await swipeUp();
  check('a swipe up plays the next clip', await playing(1));
  const s1 = await state(1);
  check('sound stays on for the next clip', !s1.muted);
  check('the clip before it stops', (await state(0)).paused);
  if (feed.clips.length > 2) check('the clip after it is loaded ahead of time', (await state(2)).src);
  await page.waitForFunction(() => document.querySelectorAll('section.clip video')[1].currentTime > 2.8, null, { timeout: 15000 }).catch(() => {});
  await shot('3-second-clip');

  await page.touchscreen.tap(206, 400);
  await page.waitForTimeout(300);
  check('a tap pauses', (await state(1)).paused);
  await shot('4-paused');
  await page.touchscreen.tap(206, 400);
  await page.waitForTimeout(300);
  check('another tap resumes', !(await state(1)).paused);

  // finish the second clip, then reload: it must be remembered and moved behind the unwatched ones
  const secondId = (await state(1)).id;
  await page.evaluate(() => { const v = document.querySelectorAll('section.clip video')[1]; v.currentTime = Math.max(0, v.duration - 1.5); });
  await page.waitForFunction(() => document.querySelectorAll('section.clip')[1].classList.contains('watched'), null, { timeout: 15000 });
  check('a finished clip is marked watched', true);
  await page.reload();
  await page.waitForSelector('section.clip video');
  await playing(0);
  const order = await page.evaluate((n) => [...document.querySelectorAll('section.clip')].slice(0, n).map((s) => ({ watched: s.classList.contains('watched') })), feed.clips.length);
  const firstWatched = order.findIndex((o) => o.watched);
  check('after a reload the watched clip is remembered and comes after every unwatched one', firstWatched === feed.clips.length - 1, `watched clip is now number ${firstWatched + 1} of ${feed.clips.length} (was ${secondId})`);
  await shot('5-after-reload');

  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  check('it can be added to the home screen (manifest: standalone, 192 and 512 icons)', manifest.display === 'standalone' && manifest.icons.length >= 2);
} catch (e) {
  check(`the check itself crashed: ${e.message.split('\n')[0]}`, false);
}
await browser.close();
server.close();
const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\nFAIL: ${bad} of ${results.length} checks failed` : `\nPASS: all ${results.length} checks at 412x915 (Samsung phone size)`);
process.exit(bad ? 1 : 0);
