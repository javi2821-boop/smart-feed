// The two values Cloudflare is given for the feed's password lock (feed/_worker.js). Neither is the password.
import crypto from 'node:crypto';

export const MIN_PASSWORD = 12;
const SALT = 'smart-feed:v1:'; // must match feed/_worker.js
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** What the lock compares a typed password against. */
export const passHash = (password) => sha(SALT + password);
/** The key that signs sign-in cookies. Derived from the password, so a new password signs every device out. */
export const cookieKey = (password) => sha(`smart-feed:cookie:v1:${password}`);

/** A plain reason the password can't be used, or null when it is fine. */
export function passwordProblem(password) {
  if (!password) return 'the GitHub secret FEED_PASSWORD is not set';
  if (password !== password.trim()) return 'FEED_PASSWORD starts or ends with a space';
  if (password.length < MIN_PASSWORD) return `FEED_PASSWORD is too short: use at least ${MIN_PASSWORD} characters (a few random words work well)`;
  return null;
}
