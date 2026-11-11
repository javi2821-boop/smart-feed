import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { TMP_ROOT } from './paths.js';
import { assetError, inputError } from './errors.js';

/** JSON.stringify with sorted keys: equal data → equal string → equal hash. */
export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v)
    .filter((k) => v[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
    .join(',')}}`;
}

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const hashJson = (v) => sha256(stableStringify(v));

export async function sha256File(file) {
  const h = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

export const exists = (p) => fs.existsSync(p);

export function requireFile(p, what = 'file') {
  if (!p || !fs.existsSync(p)) throw assetError(`${what} not found: ${p}`);
  return p;
}

export async function readJson(file, what = 'JSON file') {
  requireFile(file, what);
  const text = await fsp.readFile(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    const m = /position (\d+)/.exec(e.message);
    let where = '';
    if (m) {
      const pos = Number(m[1]);
      const line = text.slice(0, pos).split('\n').length;
      where = ` (line ${line})`;
    }
    throw inputError(`${what} is not valid JSON${where}: ${file}`, { details: [e.message] });
  }
}

export async function makeTempDir(label) {
  await fsp.mkdir(TMP_ROOT, { recursive: true });
  return fsp.mkdtemp(path.join(TMP_ROOT, `${label}-`));
}

export async function rmrf(p) {
  if (p) await fsp.rm(p, { recursive: true, force: true }).catch(() => {});
}

export const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
