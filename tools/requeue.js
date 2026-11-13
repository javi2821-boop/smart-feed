// Make a clip again (after fixing its script, changing the narrator's voice, or replacing a character's art),
// or take one off the feed.
//
//   node tools/requeue.js marcus-control nozick-machine     these clips
//   node tools/requeue.js --all                             every clip on the feed
//   node tools/requeue.js --remove marcus-control           take it off the feed and do not make it again
//
// For each clip it deletes clips/<name>.mp4 and .jpg, removes it from feed/feed.json, and (unless --remove) moves
// scripts/done/<name>.md back to scripts/inbox. Commit and push the result: the push starts the factory, which makes
// the clips again and publishes the feed. With --remove, run the deploy-feed workflow afterwards to publish.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const remove = args.includes('--remove');
const feedFile = path.join(ROOT, 'feed/feed.json');
const feed = JSON.parse(fs.readFileSync(feedFile, 'utf8'));
const ids = args.includes('--all') ? feed.clips.map((c) => c.id) : args.filter((a) => !a.startsWith('--'));
if (!ids.length) {
  console.log('Name at least one clip (its file name without .mp4), or use --all. Clips on the feed:\n  ' + feed.clips.map((c) => c.id).join('\n  '));
  process.exit(2);
}
let bad = 0;
for (const id of ids) {
  const script = path.join(ROOT, 'scripts/done', `${id}.md`);
  const onFeed = feed.clips.some((c) => c.id === id);
  if (!onFeed && !fs.existsSync(script)) { console.log(`skip   ${id}: not on the feed and no script in scripts/done`); bad++; continue; }
  if (!remove && !fs.existsSync(script)) { console.log(`skip   ${id}: scripts/done/${id}.md is missing, so it cannot be made again (use --remove to only take it off the feed)`); bad++; continue; }
  feed.clips = feed.clips.filter((c) => c.id !== id);
  for (const ext of ['mp4', 'jpg']) fs.rmSync(path.join(ROOT, 'clips', `${id}.${ext}`), { force: true });
  if (!remove) fs.renameSync(script, path.join(ROOT, 'scripts/inbox', `${id}.md`));
  console.log(`${remove ? 'removed' : 'queued '} ${id}`);
}
fs.writeFileSync(feedFile, JSON.stringify(feed, null, 2) + '\n');
console.log(`The feed list now has ${feed.clips.length} clip${feed.clips.length === 1 ? '' : 's'}. Commit and push to finish.`);
process.exit(bad ? 1 : 0);
