// The cast on disk: which characters and backgrounds exist, and each character's anchor points
// (assets/spec.json, overridden per character by assets/cast/<name>/meta.json).
import fs from 'node:fs';
import path from 'node:path';

export function readSpec(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'assets/spec.json'), 'utf8'));
}

/** A character's optional meta.json: { "neck": [x, y], "headPivot": [x, y], "mouth": [x, y] }, any subset. */
export function readMeta(dir) {
  const file = path.join(dir, 'meta.json');
  if (!fs.existsSync(file)) return { meta: {}, problems: [] };
  const problems = [];
  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return { meta: {}, problems: [`meta.json is not valid JSON (${e.message})`] };
  }
  for (const [k, v] of Object.entries(meta)) {
    if (!['neck', 'headPivot', 'mouth'].includes(k)) problems.push(`meta.json: unknown key "${k}" (allowed: neck, headPivot, mouth)`);
    else if (!Array.isArray(v) || v.length !== 2 || !v.every((n) => Number.isFinite(n))) problems.push(`meta.json: "${k}" must be two numbers, like [300, 410]`);
  }
  return { meta: problems.length ? {} : meta, problems };
}

/** Every character and background folder found on disk (not only the ones the spec lists). */
export function loadCast(root) {
  const spec = readSpec(root);
  const castDir = path.join(root, 'assets/cast');
  const bgDir = path.join(root, 'assets/backgrounds');
  const characters = fs.existsSync(castDir)
    ? fs.readdirSync(castDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => {
        const dir = path.join(castDir, d.name);
        const { meta, problems } = readMeta(dir);
        return { name: d.name, dir, anchors: { ...spec.anchors, ...meta }, placeholder: fs.existsSync(path.join(dir, 'PLACEHOLDER')), metaProblems: problems };
      })
    : [];
  const backgrounds = fs.existsSync(bgDir)
    ? fs.readdirSync(bgDir).filter((f) => f.toLowerCase().endsWith('.png')).map((f) => {
        const name = f.slice(0, -4);
        return { name, file: path.join(bgDir, f), placeholder: fs.existsSync(path.join(bgDir, `${name}.PLACEHOLDER`)) };
      })
    : [];
  const order = (list, wanted) => list.sort((a, b) => ((wanted.indexOf(a.name) + 1) || 999) - ((wanted.indexOf(b.name) + 1) || 999) || a.name.localeCompare(b.name));
  return { spec, characters: order(characters, spec.characters), backgrounds: order(backgrounds, spec.backgrounds) };
}
