import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { THEMES_DIR, CACHE_DIR } from './paths.js';
import { assetError, inputError } from './errors.js';
import { readJson, sha256 } from './util.js';
import { validate } from '../engine/runtime/lib/validate.js';
import { fsUrl } from '../engine/runtime/asset-path.js';

const require = createRequire(import.meta.url);

const fontSchema = {
  type: 'object',
  required: ['family'],
  properties: {
    family: { type: 'string', minLength: 1 },
    weight: { type: 'integer', default: 400 },
    weights: { type: 'array', items: { type: 'integer' } },
    style: { type: 'string', enum: ['normal', 'italic'], default: 'normal' },
    package: { type: 'string', description: 'npm package providing <weight>.css (e.g. @fontsource/barlow)' },
    css: { type: 'string', description: 'path to a local @font-face stylesheet (relative to the theme file)' },
    fallback: { type: 'string', default: 'sans-serif' },
    scale: { type: 'number', exclusiveMinimum: 0, default: 1, description: 'optical size correction applied via @font-face size-adjust (e.g. 1.25 for a font that runs small)' },
  },
};

export const themeSchema = {
  type: 'object',
  required: ['name', 'colors', 'fonts'],
  properties: {
    name: { type: 'string', minLength: 1 },
    extends: { type: 'string' },
    description: { type: 'string' },
    style: { type: 'string', default: 'default', description: 'design language hint for scenes: blueprint | pixel | default' },
    colors: {
      type: 'object',
      required: ['bg', 'text', 'accent'],
      additionalProperties: { type: 'string', pattern: '^#[0-9a-fA-F]{3,8}$' },
    },
    fonts: {
      type: 'object',
      required: ['display', 'body'],
      additionalProperties: fontSchema,
    },
    spacing: { type: 'object', additionalProperties: { type: 'number' } },
    motion: { type: 'object' },
    brand: { type: 'object' },
    decor: { type: 'object' },
  },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function deepMerge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  return out;
}

export function listThemes() {
  return fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

async function loadRaw(ref, baseDir, seen = new Set()) {
  let raw;
  let dir = baseDir;
  if (isObj(ref)) raw = ref;
  else if (typeof ref === 'string') {
    const looksLikePath = ref.endsWith('.json') || ref.includes('/');
    const file = looksLikePath ? path.resolve(baseDir, ref) : path.join(THEMES_DIR, `${ref}.json`);
    if (!fs.existsSync(file)) {
      throw assetError(`theme "${ref}" not found (looked for ${file})`, { hint: `available themes: ${listThemes().join(', ')}` });
    }
    if (seen.has(file)) throw inputError(`theme "${ref}" extends itself (cycle)`);
    seen.add(file);
    raw = await readJson(file, `theme ${ref}`);
    dir = path.dirname(file);
  } else throw inputError(`theme must be a name, a path or an object (got ${typeof ref})`);

  if (raw.extends) {
    const parent = await loadRaw(raw.extends, dir, seen);
    const { extends: _e, ...rest } = raw;
    return { theme: deepMerge(parent.theme, rest), dir };
  }
  return { theme: raw, dir };
}

/**
 * Load a theme by name ("architect"), path ("./my-theme.json") or inline
 * object ({ extends: "architect", colors: { accent: "#ff0" } }).
 * Returns { theme, fontCss: [absolute css paths] }.
 */
export async function loadTheme(ref, baseDir = process.cwd()) {
  const { theme: merged, dir } = await loadRaw(ref ?? 'architect', baseDir);
  if (!merged.name) merged.name = typeof ref === 'string' ? ref : 'custom';
  const { value: theme, errors } = validate(themeSchema, merged, 'theme');
  if (errors.length) throw inputError(`theme "${merged.name}" is invalid`, { details: errors });

  const fontCss = [];
  for (const [role, f] of Object.entries(theme.fonts)) {
    const weights = [...new Set([f.weight, ...(f.weights || [])])];
    const add = (p) => fontCss.push(f.scale && f.scale !== 1 ? scaledCss(p, f.scale) : p);
    if (f.css) {
      const p = path.resolve(dir, f.css);
      if (!fs.existsSync(p)) throw assetError(`theme font "${role}" stylesheet not found: ${p}`);
      add(p);
    } else if (f.package) {
      for (const w of weights) {
        const spec = `${f.package}/${w}${f.style === 'italic' ? '-italic' : ''}.css`;
        let resolved;
        try {
          resolved = require.resolve(spec);
        } catch {
          throw assetError(`theme font "${role}": could not resolve ${spec}`, { hint: 'run `npm install` (fonts ship as pinned @fontsource packages)' });
        }
        add(resolved);
      }
    } else {
      throw inputError(`theme font "${role}" (${f.family}) needs "package" or "css" — system fonts are not allowed (they break determinism)`);
    }
  }
  return { theme, fontCss: [...new Set(fontCss)] };
}

/**
 * Copy an @font-face stylesheet with `size-adjust` added to every rule (and
 * url()s made absolute), so a font that runs small can be scaled once in the
 * theme instead of in every scene. Cached by content hash.
 */
function scaledCss(cssPath, scale) {
  const src = fs.readFileSync(cssPath, 'utf8');
  const base = path.dirname(cssPath);
  const out = src
    .replace(/url\((['"]?)\.\/([^)'"]+)\1\)/g, (_, q, rel) => `url(${fsUrl(path.resolve(base, rel))})`)
    .replace(/@font-face\s*{/g, `@font-face {\n  size-adjust: ${Math.round(scale * 1000) / 10}%;`);
  const file = path.join(CACHE_DIR, 'fonts', `${sha256(out).slice(0, 16)}.css`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out);
  }
  return file;
}
