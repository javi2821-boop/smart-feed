// Publish the feed to Cloudflare Pages, and never publish a clip to an address that isn't locked.
//
//   node factory/deploy.js           (needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment)
//
// What it does, in order:
//   1. Finds the Pages project (PAGES_PROJECT, default "smart-feed"); creates it if it doesn't exist yet.
//   2. Asks the project's addresses for the page while signed out: the main address and the newest deployment's own
//      address (a "preview" link). Each must answer with the Cloudflare Access login, not a page.
//   3. Locked → uploads the feed page, feed.json and every clip.
//      Not locked → uploads only a one-line "locked" page with no clips and no feed list, and says what to do.
//   4. Checks the lock again on the deployment it just made.
//
// Nothing here prints the token or the account ID. Exit code: 0 published or safely withheld, 1 on an error.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = 'wrangler@4.160.0';
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const project = process.env.PAGES_PROJECT || 'smart-feed';
const summary = [];
const say = (line) => { console.log(line); summary.push(line); };
const done = (code) => {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Feed publish\n\n${summary.map((l) => `- ${l}`).join('\n')}\n`);
  process.exit(code);
};

if (!token || !account) {
  say('Not published: the GitHub secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not set (docs/FEED-SETUP.md, step 1).');
  done(0);
}

async function api(method, route, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${route}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && json.success !== false, result: json.result, errors: (json.errors || []).map((e) => e.message).join('; ') };
}

/** Signed out, does this address answer with the Cloudflare Access login? */
async function locked(host) {
  try {
    const res = await fetch(`https://${host}/feed.json?lock-check=${Date.now()}`, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
    const to = res.headers.get('location') || '';
    return { locked: res.status >= 300 && res.status < 400 && /\.cloudflareaccess\.com\//.test(to), status: res.status };
  } catch (e) {
    return { locked: false, status: `no answer (${e.message})` };
  }
}

function copyDir(from, to, skip = () => false) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.') || skip(e.name)) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b, skip);
    else fs.copyFileSync(a, b);
  }
}

try {
  // 1. the project
  let p = await api('GET', `/pages/projects/${project}`);
  if (p.status === 404 || (!p.ok && /not found/i.test(p.errors))) {
    const made = await api('POST', '/pages/projects', { name: project, production_branch: 'main' });
    if (!made.ok) throw new Error(`could not create the Pages project "${project}": ${made.errors || made.status}`);
    say(`Created the Cloudflare Pages project "${project}".`);
    p = await api('GET', `/pages/projects/${project}`);
  }
  if (!p.ok) throw new Error(`could not read the Pages project "${project}" (${p.status}): ${p.errors || 'check that the token has Account → Cloudflare Pages → Edit'}`);
  const main = p.result.subdomain; // e.g. smart-feed-abc.pages.dev

  // 2. is it locked?
  const deployments = await api('GET', `/pages/projects/${project}/deployments?per_page=1`);
  const lastUrl = deployments.ok && deployments.result?.[0]?.url ? new URL(deployments.result[0].url).host : null;
  const mainLock = await locked(main);
  const previewLock = lastUrl ? await locked(lastUrl) : { locked: null };
  const isLocked = mainLock.locked && previewLock.locked !== false && lastUrl !== null;
  say(`Main address https://${main}/ signed out: ${mainLock.locked ? 'Cloudflare Access login (locked)' : `NOT locked (answered ${mainLock.status})`}.`);
  if (lastUrl) say(`Newest deployment's own address signed out: ${previewLock.locked ? 'Cloudflare Access login (locked)' : `NOT locked (answered ${previewLock.status})`}.`);
  else say('No deployment exists yet, so the preview addresses cannot be checked: this first upload holds no clips.');

  // 3. what to upload
  const site = path.join(ROOT, 'out/site');
  fs.rmSync(site, { recursive: true, force: true });
  fs.mkdirSync(site, { recursive: true });
  let clipCount = 0;
  if (isLocked) {
    copyDir(path.join(ROOT, 'feed'), site);
    const feed = JSON.parse(fs.readFileSync(path.join(ROOT, 'feed/feed.json'), 'utf8'));
    fs.mkdirSync(path.join(site, 'clips'), { recursive: true });
    for (const c of feed.clips) {
      for (const f of [c.file, c.poster]) {
        const src = path.join(ROOT, f);
        if (!fs.existsSync(src)) throw new Error(`feed.json lists ${f}, but that file is not in the repo`);
        if (fs.statSync(src).size > 25 * 1024 * 1024) throw new Error(`${f} is over 25 MB, the Cloudflare Pages limit for one file`);
        fs.copyFileSync(src, path.join(site, f));
      }
      clipCount++;
    }
  } else {
    fs.writeFileSync(path.join(site, 'index.html'), '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Locked</title><p style="font:16px system-ui;padding:2rem">Nothing here yet.</p>\n');
  }
  // every answer tells search engines to stay away, and the feed list is never cached
  fs.writeFileSync(path.join(site, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n/feed.json\n  Cache-Control: no-store\n/clips/*\n  Cache-Control: private, max-age=604800\n');
  fs.writeFileSync(path.join(site, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  const r = spawnSync('npx', ['--yes', WRANGLER, 'pages', 'deploy', site, `--project-name=${project}`, '--branch=main', '--commit-dirty=true'], {
    encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  const outText = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.status !== 0) throw new Error(`the upload failed: ${outText.trim().split('\n').slice(-6).join(' | ')}`);
  const newUrl = (outText.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev/g) || []).pop();

  // 4. check again
  if (isLocked) {
    say(`Published ${clipCount} clip${clipCount === 1 ? '' : 's'} to https://${main}/ (private: Cloudflare Access).`);
    const again = newUrl ? await locked(new URL(newUrl).host) : { locked: true };
    if (!again.locked) {
      say(`WARNING: the new deployment's own address (${newUrl}) is not behind Access. Fix the Access rule for *.${main} (docs/FEED-SETUP.md, step 3), then run the deploy-feed workflow again.`);
      done(1);
    }
  } else {
    say('**Clips were NOT published.** Only a blank "locked" page was uploaded, because the address is not locked yet.');
    say(`To finish: follow docs/FEED-SETUP.md step 3 for the addresses ${main} and *.${main}, then run the deploy-feed workflow again.`);
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `locked=${isLocked}\nhost=${main}\n`);
  done(0);
} catch (e) {
  say(`ERROR: ${e.message}`);
  done(1);
}
