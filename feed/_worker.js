// The feed's lock. Cloudflare Pages runs this file in front of EVERY request to EVERY address of the project
// (the main address and each deployment's own "preview" address), so there is no unlocked way in.
//
// - Without a valid sign-in cookie, every path answers with the password page (status 401). No clip, no feed list.
// - The right password sets a cookie that lasts 90 days on that phone.
// - If the password was never configured, everything answers "locked" (status 503): it fails closed.
//
// The password itself is never stored here or in the repo. The publish step (factory/deploy.js) gives Cloudflare two
// encrypted values derived from the GitHub secret FEED_PASSWORD: FEED_PASS_HASH and FEED_COOKIE_KEY.
// Changing the password signs every device out.

const COOKIE = 'sf_session';
const DAYS = 90;
const SALT = 'smart-feed:v1:';
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function sign(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

/** Compare without stopping at the first difference, so timing tells an attacker nothing. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const HEAD = { 'x-smartfeed-lock': 'password', 'x-robots-tag': 'noindex, nofollow, noarchive', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

function page(status, message) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#1d1b26"><title>Locked</title>
<style>html,body{height:100%;margin:0;background:#1d1b26;color:#fbf7ee;font:500 16px/1.4 system-ui,sans-serif}
form{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box}
input,button{font:inherit;border:0;border-radius:999px;padding:14px 22px;width:min(320px,100%);box-sizing:border-box}
input{background:#fbf7ee;color:#1d1b26;text-align:center}button{background:#e0a526;color:#1d1b26;font-weight:700}
p{margin:0;min-height:1.4em;color:#e9b8a6}</style></head><body>
<form method="post" action="/__login"><input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Open</button><p>${message}</p></form></body></html>`;
  return new Response(body, { status, headers: { ...HEAD, 'content-type': 'text/html; charset=utf-8' } });
}

async function signedIn(request, env) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]{64})`).exec(request.headers.get('cookie') || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  return same(m[2], await sign(env.FEED_COOKIE_KEY, m[1]));
}

export default {
  async fetch(request, env) {
    if (!env.FEED_PASS_HASH || !env.FEED_COOKIE_KEY) {
      return new Response('Locked. The password has not been set up yet.', { status: 503, headers: { ...HEAD, 'content-type': 'text/plain; charset=utf-8' } });
    }
    const url = new URL(request.url);

    if (url.pathname === '/__login' && request.method === 'POST') {
      let given = '';
      try { given = String((await request.formData()).get('password') || ''); } catch { /* not a form: treated as wrong */ }
      if (same(await sha(SALT + given), env.FEED_PASS_HASH)) {
        const exp = String(Date.now() + DAYS * 86400000);
        const cookie = `${COOKIE}=${exp}.${await sign(env.FEED_COOKIE_KEY, exp)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
        return new Response(null, { status: 303, headers: { ...HEAD, location: '/', 'set-cookie': cookie } });
      }
      await new Promise((r) => setTimeout(r, 1000)); // slows down guessing
      return page(401, 'Wrong password.');
    }

    if (!(await signedIn(request, env))) return page(401, '');

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    out.headers.set('referrer-policy', 'no-referrer');
    return out;
  },
};
