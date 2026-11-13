import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../feed/_worker.js';
import { passHash, cookieKey, passwordProblem } from '../factory/lib/lock.js';

const PASSWORD = 'correct horse battery';
const env = (over = {}) => ({
  FEED_PASS_HASH: passHash(PASSWORD),
  FEED_COOKIE_KEY: cookieKey(PASSWORD),
  ASSETS: { fetch: async (req) => new Response(`asset ${new URL(req.url).pathname}`, { status: 200 }) },
  ...over,
});
const get = (path, e, headers = {}) => worker.fetch(new Request(`https://feed.example${path}`, { headers }), e);
const login = (password, e) => worker.fetch(new Request('https://feed.example/__login', { method: 'POST', body: new URLSearchParams({ password }) }), e);
const cookieOf = (res) => res.headers.get('set-cookie').split(';')[0];

test('signed out, every path shows the password page and never an asset', async () => {
  for (const path of ['/', '/feed.json', '/clips/marcus-control.mp4', '/clips/marcus-control.jpg', '/manifest.webmanifest', '/_worker.js']) {
    const res = await get(path, env());
    assert.equal(res.status, 401, path);
    assert.equal(res.headers.get('x-smartfeed-lock'), 'password');
    const text = await res.text();
    assert.match(text, /name="password"/);
    assert.doesNotMatch(text, /asset /);
  }
});

test('a wrong password is refused', async () => {
  const res = await login('not the password', env());
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('set-cookie'), null);
  assert.match(await res.text(), /Wrong password/);
});

test('the right password signs in, and the cookie opens the feed', async () => {
  const e = env();
  const res = await login(PASSWORD, e);
  assert.equal(res.status, 303);
  assert.match(res.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  const ok = await get('/clips/marcus-control.mp4', e, { cookie: cookieOf(res) });
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), 'asset /clips/marcus-control.mp4');
});

test('a forged, expired or old-password cookie is refused', async () => {
  const e = env();
  const good = cookieOf(await login(PASSWORD, e));
  const [name, value] = good.split('=');
  const [exp, sig] = value.split('.');
  const forged = `${name}=${Number(exp) + 1}.${sig}`;
  const expired = `${name}=1000.${sig}`;
  for (const c of [forged, expired, `${name}=${exp}.${'0'.repeat(64)}`, `${name}=garbage`]) assert.equal((await get('/feed.json', e, { cookie: c })).status, 401, c);
  // after the password changes, the old cookie no longer works
  const changed = env({ FEED_PASS_HASH: passHash('a different password'), FEED_COOKIE_KEY: cookieKey('a different password') });
  assert.equal((await get('/feed.json', changed, { cookie: good })).status, 401);
});

test('with no password configured, everything stays locked', async () => {
  const e = env({ FEED_PASS_HASH: undefined, FEED_COOKIE_KEY: undefined });
  assert.equal((await get('/clips/marcus-control.mp4', e)).status, 503);
  assert.equal((await login('', e)).status, 503);
});

test('weak or missing passwords are rejected before anything is published', () => {
  assert.match(passwordProblem(''), /not set/);
  assert.match(passwordProblem('short'), /at least 12/);
  assert.match(passwordProblem(' padded password '), /space/);
  assert.equal(passwordProblem(PASSWORD), null);
});
