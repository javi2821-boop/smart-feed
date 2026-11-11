// Composition = the one intermediate format every render goes through.
// Templates produce it; studio agents may write it by hand. This module
// validates it, resolves scene modules, themes and assets, and computes a
// frame-exact timeline.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, SCENES_LIBRARY, SCENES_CUSTOM } from './paths.js';
import { inputError, assetError } from './errors.js';
import { validate } from '../engine/runtime/lib/validate.js';
import { transitionNames, transitionDurations } from '../engine/runtime/transitions.js';
import { resolveSize } from './aspect.js';
import { loadTheme } from './themes.js';
import { hashJson } from './util.js';
import { fsUrl, encodeAssetPath } from '../engine/runtime/asset-path.js';
export { fsUrl } from '../engine/runtime/asset-path.js';

const transitionSchema = {
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string' },
        duration: { type: 'number', minimum: 0 },
        props: { type: 'object' },
      },
    },
  ],
};

const anchorSchema = {
  type: 'object',
  required: ['x', 'y'],
  additionalProperties: false,
  properties: {
    x: { type: 'number' },
    y: { type: 'number' },
    r: { type: 'number', minimum: 0 },
    w: { type: 'number', minimum: 0 },
    h: { type: 'number', minimum: 0 },
    fill: { type: 'string' },
  },
};

const frameSchema = {
  type: 'object',
  required: ['width', 'height'],
  additionalProperties: false,
  description: 'a virtual frame: the scene draws as if the video were width x height and is scaled to fit, centred (e.g. a 9:16 layout inside a 4:5 video)',
  properties: {
    width: { type: 'integer', minimum: 16, maximum: 4096 },
    height: { type: 'integer', minimum: 16, maximum: 4096 },
  },
};

const sceneEntry = {
  type: 'object',
  required: ['type', 'duration'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[A-Za-z0-9_.-]+$' },
    type: { type: 'string', minLength: 1, description: 'library scene name, "custom/<name>", or a path to a .js file' },
    duration: { type: 'number', exclusiveMinimum: 0, maximum: 600 },
    props: { type: 'object', default: {} },
    transition: transitionSchema,
    anchors: {
      type: 'object',
      description: 'named points of this scene for hand-offs and actors: { name: { x, y, r?, w?, h?, fill? } }, x and y as fractions of the frame, r, w and h in u (1% of the short side); adds to or overrides what the scene itself says',
      additionalProperties: anchorSchema,
    },
    background: { type: 'string', description: 'the scene\'s flat background colour (theme name or hex): a hand-off into it floods in this colour' },
    frame: frameSchema,
    note: { type: 'string' },
  },
};

const layerEntry = {
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[A-Za-z0-9_.-]+$' },
    type: { type: 'string', minLength: 1 },
    props: { type: 'object', default: {} },
    scene: { type: 'string', description: 'anchor to a scene id: start/end become relative to it' },
    start: { type: 'number', default: 0 },
    end: { type: ['number', 'null'], default: null, description: 'seconds; negative counts back from the end; null = until the end' },
    z: { type: 'number' },
    frame: frameSchema,
    note: { type: 'string' },
  },
};

const audioEntry = {
  type: 'object',
  required: ['src'],
  additionalProperties: false,
  properties: {
    src: { type: 'string', minLength: 1 },
    start: { type: 'number', minimum: 0, default: 0 },
    trim: { type: 'number', minimum: 0, default: 0 },
    duration: { type: 'number', exclusiveMinimum: 0 },
    volume: { type: 'number', minimum: 0, maximum: 4, default: 1 },
    fadeIn: { type: 'number', minimum: 0, default: 0 },
    fadeOut: { type: 'number', minimum: 0, default: 0 },
    loop: { type: 'boolean', default: false },
  },
};

export const compositionSchema = {
  type: 'object',
  required: ['scenes'],
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    version: { type: 'integer', enum: [1], default: 1 },
    name: { type: 'string' },
    aspect: { type: 'string' },
    width: { type: 'integer', minimum: 16 },
    height: { type: 'integer', minimum: 16 },
    resolution: { type: 'integer', minimum: 144, maximum: 2160, default: 1080 },
    fps: { type: 'integer', minimum: 1, maximum: 120, default: 30 },
    theme: { type: ['string', 'object'], default: 'architect' },
    seed: { type: ['string', 'number'] },
    scenes: { type: 'array', minItems: 1, items: sceneEntry },
    underlays: { type: 'array', items: layerEntry, default: [] },
    overlays: { type: 'array', items: layerEntry, default: [] },
    audio: { type: 'array', items: audioEntry, default: [] },
    output: {
      type: 'object',
      additionalProperties: false,
      default: {},
      properties: {
        crf: { type: 'integer', minimum: 0, maximum: 51, default: 18 },
        preset: { type: 'string', enum: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'], default: 'medium' },
        audioBitrate: { type: 'string', default: '192k' },
        grain: { type: 'number', minimum: 0, maximum: 1, description: 'film grain + paper texture added by the encoder (default: theme.decor.grain or 0)' },
        frameFormat: { type: 'string', enum: ['png', 'jpeg'], default: 'png', description: 'browser→encoder frame format: png is lossless, jpeg (q95) is ~40% faster' },
        maxBitrate: { type: 'string', pattern: '^\\d+(\\.\\d+)?[kM]$', default: '12M', description: 'x264 VBV cap (bounds file size: 12M ≈ 22 MB per 15 s)' },
        loudness: {
          type: 'object',
          additionalProperties: false,
          required: ['lufs'],
          description: 'bring the final mix to a loudness target (e.g. -14 LUFS, true peak -1 dBTP for Reels/Shorts/TikTok/Facebook); off when absent',
          properties: {
            lufs: { type: 'number', minimum: -30, maximum: -6 },
            truePeak: { type: 'number', minimum: -6, maximum: 0, default: -1 },
          },
        },
      },
    },
    meta: { type: 'object' },
  },
};

export function listScenes() {
  const read = (dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => f.endsWith('.js'))
          .map((f) => f.replace(/\.js$/, ''))
      : [];
  return { library: read(SCENES_LIBRARY), custom: read(SCENES_CUSTOM) };
}

/** Resolve a scene `type` to an absolute file path. */
export function resolveSceneFile(type, baseDir) {
  const tryFiles = (...cands) => cands.find((c) => fs.existsSync(c));
  let file;
  if (type.startsWith('./') || type.startsWith('../') || path.isAbsolute(type) || type.endsWith('.js')) {
    const p = path.resolve(baseDir, type);
    file = tryFiles(p, `${p}.js`, path.join(p, 'index.js'));
  } else if (type.startsWith('custom/')) {
    const name = type.slice('custom/'.length);
    // falls back to the library so compositions keep working after `render promote`
    file = tryFiles(
      path.join(SCENES_CUSTOM, `${name}.js`),
      path.join(SCENES_CUSTOM, name, 'index.js'),
      path.join(SCENES_LIBRARY, `${name}.js`),
      path.join(SCENES_LIBRARY, name, 'index.js')
    );
  } else {
    file = tryFiles(
      path.join(SCENES_LIBRARY, `${type}.js`),
      path.join(SCENES_LIBRARY, type, 'index.js'),
      path.join(SCENES_CUSTOM, `${type}.js`),
      path.join(SCENES_CUSTOM, type, 'index.js')
    );
  }
  if (!file) {
    const { library, custom } = listScenes();
    throw assetError(`scene "${type}" not found`, {
      hint: `library scenes: ${library.join(', ')}${custom.length ? ` · custom: ${custom.map((c) => 'custom/' + c).join(', ')}` : ''}`,
    });
  }
  return file;
}

/**
 * Validate + normalise a composition.
 * @param {object} comp raw composition
 * @param {object} opts { baseDir } — directory relative paths resolve against
 */
export async function normalizeComposition(comp, { baseDir = process.cwd() } = {}) {
  const { value: c, errors } = validate(compositionSchema, comp);
  if (errors.length) throw inputError('composition is invalid', { details: errors });

  const { width, height, aspect } = resolveSize(c);
  const fps = c.fps;
  const { theme, fontCss } = await loadTheme(c.theme, baseDir);
  const motion = theme.motion || {};

  const ids = new Set();
  const uniqueId = (wanted, fallback) => {
    let id = wanted || fallback;
    if (wanted && ids.has(wanted)) throw inputError(`duplicate id "${wanted}"`);
    let n = 2;
    while (ids.has(id)) id = `${fallback}-${n++}`;
    ids.add(id);
    return id;
  };

  const items = [];
  let cursor = 0;
  let prev = null;
  c.scenes.forEach((s, i) => {
    const file = resolveSceneFile(s.type, baseDir);
    const durF = Math.max(1, Math.round(s.duration * fps));
    let transition = null;
    if (i > 0 && s.transition !== undefined && s.transition !== 'cut') {
      const tr = typeof s.transition === 'string' ? { type: s.transition } : { ...s.transition };
      if (!tr.type || tr.type === 'theme') tr.type = motion.transition || 'fade';
      if (!transitionNames.includes(tr.type)) {
        throw inputError(`scenes[${i}].transition: unknown transition "${tr.type}"`, { hint: `available: ${transitionNames.join(', ')}` });
      }
      const dur = tr.duration ?? transitionDurations[tr.type] ?? motion.transitionDuration ?? 0.6;
      const frames = Math.min(Math.round(dur * fps), durF, prev ? prev.endFrame - prev.startFrame : 0);
      transition = frames > 0 ? { type: tr.type, frames, props: tr.props || {} } : null;
    }
    const startFrame = cursor - (transition ? transition.frames : 0);
    const item = {
      id: uniqueId(s.id, `scene${i + 1}`),
      kind: 'scene',
      type: s.type,
      file,
      props: s.props,
      startFrame,
      endFrame: startFrame + durF,
      z: 100 + i,
      transition,
      prevId: prev ? prev.id : null,
    };
    if (s.anchors) item.anchors = s.anchors;
    if (s.background) item.background = s.background;
    if (s.frame) item.frame = s.frame;
    cursor = item.endFrame;
    items.push(item);
    prev = item;
  });
  const totalFrames = cursor;
  const sceneById = new Map(items.map((it) => [it.id, it]));

  const layer = (l, i, kind, zBase) => {
    const where = `${kind}s[${i}]`;
    let s0 = 0;
    let s1 = totalFrames;
    if (l.scene) {
      const anchor = sceneById.get(l.scene);
      if (!anchor) throw inputError(`${where}.scene: no scene with id "${l.scene}"`, { hint: `scene ids: ${[...sceneById.keys()].join(', ')}` });
      s0 = anchor.startFrame;
      s1 = anchor.endFrame;
    }
    const startFrame = s0 + Math.round(l.start * fps);
    let endFrame = s1;
    if (l.end !== null && l.end !== undefined) endFrame = l.end < 0 ? s1 + Math.round(l.end * fps) : s0 + Math.round(l.end * fps);
    endFrame = Math.min(endFrame, totalFrames);
    if (endFrame <= startFrame) throw inputError(`${where}: ends before it starts (start=${l.start}, end=${l.end})`);
    return {
      id: uniqueId(l.id, `${kind}${i + 1}`),
      kind,
      type: l.type,
      file: resolveSceneFile(l.type, baseDir),
      props: l.props,
      startFrame,
      endFrame,
      z: l.z ?? zBase + i,
      transition: null,
      prevId: null,
      ...(l.frame ? { frame: l.frame } : {}),
    };
  };
  c.underlays.forEach((l, i) => items.push(layer(l, i, 'underlay', 10)));
  c.overlays.forEach((l, i) => items.push(layer(l, i, 'overlay', 1000)));

  const audio = c.audio.map((a, i) => {
    const p = path.resolve(baseDir, a.src);
    if (!fs.existsSync(p)) throw assetError(`audio[${i}].src not found: ${p}`);
    return { ...a, path: p };
  });

  const seed = c.seed !== undefined ? String(c.seed) : hashJson({ ...comp, seed: undefined }).slice(0, 16);

  return {
    name: c.name || 'untitled',
    width,
    height,
    aspect,
    fps,
    seed,
    totalFrames,
    duration: totalFrames / fps,
    theme,
    fontCss,
    baseDir,
    items,
    audio,
    output: { ...c.output, grain: c.output.grain ?? theme.decor?.grain ?? 0 },
  };
}

/** The JSON payload handed to the browser runtime. */
export function runtimePayload(norm) {
  return {
    width: norm.width,
    height: norm.height,
    fps: norm.fps,
    seed: norm.seed,
    totalFrames: norm.totalFrames,
    theme: norm.theme,
    fontCss: norm.fontCss.map(fsUrl),
    baseUrl: `${fsUrl(norm.baseDir)}/`,
    items: norm.items.map(({ file, ...it }) => ({
      ...it,
      url: file.startsWith(REPO_ROOT + path.sep) ? `/@repo/${encodeAssetPath(path.relative(REPO_ROOT, file).split(path.sep).join('/'))}` : fsUrl(file),
    })),
  };
}
