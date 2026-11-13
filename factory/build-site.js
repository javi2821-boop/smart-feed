// Assemble the feed's web site into out/site: the feed page, the list of clips, and every clip the list names.
// GitHub Pages publishes that folder.   node factory/build-site.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(ROOT, 'out/site');
fs.rmSync(site, { recursive: true, force: true });
fs.mkdirSync(path.join(site, 'clips'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'feed'))) {
  if (!f.startsWith('.')) fs.copyFileSync(path.join(ROOT, 'feed', f), path.join(site, f));
}
const feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'feed/feed.json'), 'utf8'));
let bytes = 0;
for (const c of feed.clips) {
  for (const f of [c.file, c.poster]) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) { console.error(`ERROR: feed.json lists ${f}, but that file is not in the repo`); process.exit(1); }
    bytes += fs.statSync(src).size;
    fs.copyFileSync(src, path.join(site, f));
  }
}
fs.writeFileSync(path.join(site, '.nojekyll'), '');
const mb = bytes / 1048576;
console.log(`out/site: ${feed.clips.length} clips, ${mb.toFixed(0)} MB`);
// GitHub Pages allows a site of about 1 GB
if (mb > 900) console.log(`::warning::The feed is ${mb.toFixed(0)} MB and GitHub Pages allows about 1,000. Ask Javi about pruning old clips (tools/requeue.js --remove).`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `clips=${feed.clips.length}\n`);
