// Publish the feed to Cloudflare Pages behind its password lock, and never leave a clip at an unlocked address.
//
//   node factory/deploy.js     needs CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and FEED_PASSWORD in the environment
//
// The lock is feed/_worker.js. It is uploaded as part of every deployment and runs in front of every request to
// every address of the project (the main one and each deployment's own "preview" address).
//
// What this does, in order:
//   1. Finds the Pages project (PAGES_PROJECT, default "smart-feed"); creates it if it doesn't exist yet.
//   2. Gives Cloudflare the two encrypted values the lock needs, derived from FEED_PASSWORD (never the password).
//   3. If the main address is not locked yet (first time): uploads the lock with a blank page and NO clips, and
//      proves it works, before any clip leaves GitHub.
//   4. Uploads the feed page, feed.json and every clip, with the lock.
//   5. Proves the lock on the new deployment's own address and on the main address: signed out gets the password
//      page for the feed list and for a clip; a wrong password is refused; the right one opens the feed.
//      If any of that fails, it replaces the deployment with the blank locked page and ends with an error.
//
// Nothing here prints the token, the account ID or the password. Exit code: 0 published or safely withheld, 1 error.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { passHash, cookieKey, passwordProblem } from './lib/lock.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER = 'wrangler@4.160.0';
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const password = process.env.FEED_PASSWORD || '';
const project = process.env.PAGES_PROJECT || 'smart-feed';
const summary = [];
const say = (line) => { console.log(line); summary.push(line); };
const done = (code) => {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Feed publish\n\n${summary.map((l) => `- ${l}`).join('\n')}\n`);
  process.exit(code);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!token || !account) {
  say('Not published: the GitHub secrets CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not set (docs/FEED-SETUP.md, step 1).');
  done(0);
}
const weak = passwordProblem(password);
if (weak) {
  say(`Not published: ${weak} (docs/FEED-SETUP.md, step 2). Nothing was uploaded.`);
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

/** Signed out, does this path answer with the lock (the password page, or a Cloudflare Access login) and nothing else? */
async function lockedAt(host, route) {
  try {
    const res = await fetch(`https://${host}${route}?lock-check=${Date.now()}`, { redirect: 'manual', headers: { 'cache-control': 'no-cache' } });
    const viaPassword = (res.status === 401 || res.status === 503) && res.headers.get('x-smartfeed-lock') === 'password';
    const viaAccess = res.status >= 300 && res.status < 400 && /\.cloudflareaccess\.com\//.test(res.headers.get('location') || '');
    return { locked: viaPassword || viaAccess, status: res.status };
  } catch (e) {
    return { locked: false, status: `no answer (${e.message})` };
  }
}

/**
 * The whole proof for one address. Returns a list of problems (empty = locked and working).
 * A new deployment can take a few seconds to answer, so it is asked a few times before giving up.
 */
async function prove(host, clipRoute) {
  let problems = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    problems = [];
    for (const route of ['/', '/feed.json', ...(clipRoute ? [clipRoute] : [])]) {
      const r = await lockedAt(host, route);
      if (!r.locked) problems.push(`${route} is NOT locked when signed out (answered ${r.status})`);
    }
    if (!problems.length) {
      const post = (pw) => fetch(`https://${host}/__login`, { method: 'POST', redirect: 'manual', body: new URLSearchParams({ password: pw }) });
      const wrong = await post(`${password}-wrong`);
      if (wrong.status !== 401 || wrong.headers.get('set-cookie')) problems.push(`a wrong password was not refused (answered ${wrong.status})`);
      const right = await post(password);
      const cookie = (right.headers.get('set-cookie') || '').split(';')[0];
      if (right.status !== 303 || !cookie) problems.push(`the right password was not accepted (answered ${right.status})`);
      else {
        const inside = await fetch(`https://${host}/feed.json?lock-check=${Date.now()}`, { headers: { cookie } });
        if (inside.status !== 200) problems.push(`signed in, feed.json answered ${inside.status}`);
      }
    }
    if (!problems.length) return [];
    await sleep(5000);
  }
  return problems;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

/** Build out/site (always with the lock) and upload it. Returns { url, clips }. */
function upload({ withClips }) {
  const site = path.join(ROOT, 'out/site');
  fs.rmSync(site, { recursive: true, force: true });
  fs.mkdirSync(site, { recursive: true });
  let clips = 0;
  if (withClips) {
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
      clips++;
    }
  } else {
    fs.copyFileSync(path.join(ROOT, 'feed/_worker.js'), path.join(site, '_worker.js'));
    fs.writeFileSync(path.join(site, 'index.html'), '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Locked</title><p style="font:16px system-ui;padding:2rem">Nothing here yet.</p>\n');
    fs.writeFileSync(path.join(site, 'feed.json'), '{ "clips": [] }\n');
  }
  if (!fs.existsSync(path.join(site, '_worker.js'))) throw new Error('the lock (feed/_worker.js) is missing: refusing to upload anything without it');
  fs.writeFileSync(path.join(site, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n/feed.json\n  Cache-Control: no-store\n/clips/*\n  Cache-Control: private, max-age=604800\n');
  fs.writeFileSync(path.join(site, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  const r = spawnSync('npx', ['--yes', WRANGLER, 'pages', 'deploy', site, `--project-name=${project}`, '--branch=main', '--commit-dirty=true'], {
    encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, FEED_PASSWORD: '', WRANGLER_SEND_METRICS: 'false' },
  });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.status !== 0) throw new Error(`the upload failed: ${text.trim().split('\n').slice(-6).join(' | ')}`);
  const url = (text.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev/g) || []).pop();
  if (!url) throw new Error('the upload finished but did not report its address, so the lock cannot be checked');
  return { host: new URL(url).host, clips };
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

  // 2. the lock's two values, for both of Pages' environments
  const vars = { FEED_PASS_HASH: { type: 'secret_text', value: passHash(password) }, FEED_COOKIE_KEY: { type: 'secret_text', value: cookieKey(password) } };
  const set = await api('PATCH', `/pages/projects/${project}`, { deployment_configs: { production: { env_vars: vars }, preview: { env_vars: vars } } });
  if (!set.ok) throw new Error(`could not give Cloudflare the lock's settings (${set.status}): ${set.errors || 'no detail'}`);

  // 3. first time (or the lock is somehow gone): lock first, with nothing behind it
  const before = await lockedAt(main, '/feed.json');
  if (!before.locked) {
    say(`The main address is not locked yet (answered ${before.status}), so the lock goes up first with no clips behind it.`);
    const first = upload({ withClips: false });
    const problems = [...(await prove(first.host)).map((x) => `${first.host}: ${x}`), ...(await prove(main)).map((x) => `${main}: ${x}`)];
    if (problems.length) {
      for (const x of problems) say(`LOCK PROBLEM: ${x}`);
      throw new Error('the lock could not be proven on an empty page, so no clip was uploaded');
    }
    say('The lock works on an empty page: signed out gets the password page, a wrong password is refused, the right one gets in.');
  }

  // 4. the feed
  const feedList = JSON.parse(fs.readFileSync(path.join(ROOT, 'feed/feed.json'), 'utf8'));
  const clipRoute = feedList.clips[0] ? `/${feedList.clips[0].file}` : null;
  const full = upload({ withClips: true });

  // 5. prove it, on the new deployment's own address and on the main address
  const problems = [...(await prove(full.host, clipRoute)).map((x) => `${full.host}: ${x}`), ...(await prove(main, clipRoute)).map((x) => `${main}: ${x}`)];
  if (problems.length) {
    for (const x of problems) say(`LOCK PROBLEM: ${x}`);
    upload({ withClips: false });
    throw new Error('the lock check failed after publishing, so the feed was replaced with the blank locked page. The clips are safe in the repo; nothing else was changed.');
  }
  say(`Published ${full.clips} clip${full.clips === 1 ? '' : 's'} to https://${main}/ behind the password lock.`);
  say(`Checked signed out on the main address and on this deployment's own address (${full.host}): the page, the feed list and a clip all answer with the password page; a wrong password is refused; the right one opens the feed.`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `locked=true\nhost=${main}\n`);
  done(0);
} catch (e) {
  say(`ERROR: ${e.message}`);
  done(1);
}
