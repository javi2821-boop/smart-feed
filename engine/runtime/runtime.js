// In-browser runtime. The Node renderer calls:
//   await window.__rm.init(payload)   → { ok, error? }   once per page
//   await window.__rm.renderFrame(i)  → { ok, error? }   then captures a screenshot
//
// It turns a normalised composition (items with frame-exact start/end) into DOM
// layers, calls each active scene's render(t), applies transitions, and waits
// for any pending async work (image decodes, font loads) before reporting the
// frame ready.

import * as lib from 'render-machine';
import { transitions } from './transitions.js';
import { resolveAsset } from './asset-path.js';

const { validate, createRng, collectText, setStyle, anchorToPx } = lib;

class SceneError extends Error {
  constructor(item, phase, cause, frame) {
    const where = item ? `${item.kind} "${item.id}" (${item.type})` : 'runtime';
    const at = frame !== undefined ? ` at frame ${frame}` : '';
    super(`${where} failed during ${phase}${at}: ${cause?.message || cause}`);
    this.item = item;
    this.phase = phase;
    this.causeStack = cause?.stack;
  }
}

const S = {
  items: [],
  pending: [],
  fx: null,
  payload: null,
};

function serializeError(e) {
  return {
    message: e?.message || String(e),
    phase: e?.phase,
    scene: e?.item ? { id: e.item.id, type: e.item.type, kind: e.item.kind } : undefined,
    stack: e?.causeStack || e?.stack,
  };
}

function applyTheme(stage, theme, width, height) {
  const root = document.documentElement;
  const vars = {
    '--rm-w': `${width}px`,
    '--rm-h': `${height}px`,
    '--u': `${Math.min(width, height) / 100}px`,
  };
  for (const [k, v] of Object.entries(theme.colors || {})) vars[`--c-${k}`] = v;
  for (const [role, f] of Object.entries(theme.fonts || {})) {
    vars[`--f-${role}`] = `"${f.family}", ${f.fallback || 'sans-serif'}`;
    vars[`--fw-${role}`] = String(f.weight || 400);
  }
  for (const [k, v] of Object.entries(theme.spacing || {})) vars[`--s-${k}`] = String(v);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  stage.dataset.theme = theme.name;
  stage.dataset.style = theme.style || 'default';
}

async function loadFonts(fontCss, theme, sampleText) {
  await Promise.all(
    fontCss.map(
      (href) =>
        new Promise((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = resolve;
          link.onerror = () => reject(new Error(`Could not load font stylesheet ${href}`));
          document.head.appendChild(link);
        })
    )
  );
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const text = ascii + ' ·—–’‘“”…•×' + sampleText;
  const loads = [];
  for (const f of Object.values(theme.fonts || {})) {
    for (const w of new Set([f.weight || 400, ...(f.weights || [])])) {
      loads.push(document.fonts.load(`${f.style || 'normal'} ${w} 48px "${f.family}"`, text));
    }
  }
  const results = await Promise.all(loads);
  await document.fonts.ready;
  const missing = Object.values(theme.fonts || {}).filter((f) => !document.fonts.check(`${f.weight || 400} 48px "${f.family}"`, 'Aa'));
  if (missing.length) throw new Error(`Fonts failed to load: ${missing.map((f) => f.family).join(', ')}`);
  return results.flat().length;
}

function makeFx(stage, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.className = 'rm-fx';
  canvas.style.display = 'none';
  stage.appendChild(canvas);
  const g = canvas.getContext('2d');
  const fx = {
    canvas,
    cache: {},
    used: false,
    ctx() {
      if (!fx.used) {
        fx.used = true;
        canvas.style.display = 'block';
      }
      return g;
    },
    reset() {
      if (fx.used) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
        fx.used = false;
      }
    },
  };
  return fx;
}

function resolveAssetFactory(baseUrl) {
  return (p) => resolveAsset(p, baseUrl, location.origin);
}

/** A scene's timeline and contract, for overlays that follow scenes (the persistent actor). */
function sceneContract(id, fps) {
  const it = S.items.find((x) => x.kind === 'scene' && x.id === id);
  if (!it) {
    const known = S.payload.items.filter((x) => x.kind === 'scene').map((x) => x.id);
    if (known.includes(id)) throw new Error(`scene "${id}" is not set up yet: only overlays and underlays, set up after the scenes, can read it`);
    throw new Error(`no scene "${id}" (scenes: ${known.join(', ')})`);
  }
  return { id, start: it.startFrame / fps, end: it.endFrame / fps, anchors: it.contract.anchors, background: it.contract.background };
}

/** An anchor from a virtual frame's pixels into the real frame's (fit = { k, ox, oy }), and back. */
function toReal(a, fit) {
  if (fit.k === 1 && !fit.ox && !fit.oy) return { ...a };
  const out = { ...a, x: fit.ox + fit.k * a.x, y: fit.oy + fit.k * a.y };
  for (const n of ['r', 'w', 'h']) if (a[n] !== undefined) out[n] = a[n] * fit.k;
  return out;
}
function fromReal(a, fit) {
  if (fit.k === 1 && !fit.ox && !fit.oy) return a;
  const out = { ...a, x: (a.x - fit.ox) / fit.k, y: (a.y - fit.oy) / fit.k };
  for (const n of ['r', 'w', 'h']) if (a[n] !== undefined) out[n] = a[n] / fit.k;
  return out;
}

/** "scene.anchor" (or "scene", meaning its `in` anchor) → the anchor in pixels. */
function anchorRef(ref, fps) {
  const [id, name = 'in'] = String(ref).split('.');
  const sc = sceneContract(id, fps);
  const a = sc.anchors[name];
  if (!a) throw new Error(`scene "${id}" has no anchor "${name}" (it has: ${Object.keys(sc.anchors).join(', ') || 'none'})`);
  return a;
}

async function init(payload) {
  try {
    S.payload = payload;
    const { width, height, fps, theme, items, seed } = payload;
    // Defence in depth: scenes should use ctx.rng, but a stray Math.random()
    // in a custom scene must not make factory renders irreproducible.
    Math.random = createRng(`${seed}:Math.random`);
    const stage = document.getElementById('stage');
    applyTheme(stage, theme, width, height);
    const sample = collectText(items.map((i) => i.props)).join(' ');
    await loadFonts(payload.fontCss || [], theme, sample);
    S.fx = makeFx(stage, width, height);
    const asset = resolveAssetFactory(payload.baseUrl || '/');

    for (const item of items) {
      let mod;
      try {
        mod = await import(item.url);
      } catch (e) {
        throw new SceneError(item, 'import', e);
      }
      const def = mod.default;
      if (!def || typeof def.setup !== 'function') {
        throw new SceneError(item, 'import', new Error(`module ${item.url} must \`export default { setup(ctx) {...} }\``));
      }
      let props = { ...(def.defaults || {}), ...(item.props || {}) };
      if (def.schema) {
        const r = validate({ type: 'object', ...def.schema }, props, 'props');
        if (r.errors.length) throw new SceneError(item, 'props validation', new Error(r.errors.join('; ')));
        props = r.value;
      }
      const root = document.createElement('div');
      root.className = 'rm-layer';
      root.dataset.id = item.id;
      root.dataset.type = item.type;
      root.style.zIndex = String(item.z);
      root.style.display = 'none';
      stage.appendChild(root);
      // a virtual frame: the scene draws at item.frame's size into a box scaled to
      // fit and centred in the real frame (the layer root itself stays the
      // runtime's, for transitions)
      let sceneRoot = root;
      let fw = width;
      let fh = height;
      let box = null;
      // where the frame sits: real = (ox + k·x, oy + k·y); identity without a frame
      let fit = { k: 1, ox: 0, oy: 0 };
      if (item.frame) {
        fw = item.frame.width;
        fh = item.frame.height;
        const k = Math.min(width / fw, height / fh);
        fit = { k: Number(k.toFixed(6)), ox: Math.round((width - fw * k) / 2), oy: Math.round((height - fh * k) / 2) };
        box = document.createElement('div');
        box.className = 'rm-frame';
        // unscaled while setup runs, so what a scene measures (getBoundingClientRect) is in its own pixels
        setStyle(box, { position: 'absolute', left: '0', top: '0', width: `${fw}px`, height: `${fh}px`, overflow: 'hidden', transformOrigin: '0 0' });
        root.appendChild(box);
        // the scene's own root sits inside, so a scene may move its root (shakes) without undoing the fit
        sceneRoot = document.createElement('div');
        setStyle(sceneRoot, { position: 'absolute', left: '0', top: '0', width: `${fw}px`, height: `${fh}px` });
        box.appendChild(sceneRoot);
      }

      const duration = (item.endFrame - item.startFrame) / fps;
      const ctx = {
        id: item.id,
        type: item.type,
        kind: item.kind,
        root: sceneRoot,
        props,
        theme,
        width: fw,
        height: fh,
        u: Math.min(fw, fh) / 100,
        fps,
        duration,
        start: item.startFrame / fps,
        seed: `${seed}:${item.id}`,
        rng: createRng(`${seed}:${item.id}`),
        lib,
        asset,
        waitFor: (p) => {
          S.pending.push(p);
          return p;
        },
        el: (tag, opts, parent = sceneRoot) => lib.el(tag, opts, parent),
        svg: (tag, attrs, parent) => lib.svg(tag, attrs, parent),
        // other scenes' anchors are in real pixels: a framed layer reads them in its own
        scene: (id) => {
          const sc = sceneContract(id, fps);
          return { ...sc, anchors: Object.fromEntries(Object.entries(sc.anchors).map(([n, a]) => [n, fromReal(a, fit)])) };
        },
        anchor: (ref) => fromReal(anchorRef(ref, fps), fit),
      };
      let result;
      try {
        root.style.display = 'block'; // allow layout measurement during setup
        result = await def.setup(ctx);
        if (S.pending.length) await Promise.all(S.pending.splice(0));
      } catch (e) {
        throw new SceneError(item, 'setup', e);
      } finally {
        root.style.display = 'none';
      }
      if (box) setStyle(box, { transform: `translate(${fit.ox}px, ${fit.oy}px) scale(${fit.k.toFixed(6)})` });
      const render = typeof result === 'function' ? result : result?.render;
      if (typeof render !== 'function') {
        throw new SceneError(item, 'setup', new Error('setup(ctx) must return a render(t) function or { render(t) }'));
      }
      // the anchor contract (lib/carry.js): what the scene says about where its objects are, then the composition's
      const anchors = {};
      // (in real pixels; a framed scene's own anchors and the composition's fractions are of its frame)
      for (const [k, a] of Object.entries(result?.anchors || {})) anchors[k] = toReal(a, fit);
      for (const [k, a] of Object.entries(item.anchors || {})) anchors[k] = toReal(anchorToPx(a, fw, fh), fit);
      const background = lib.themeColor(item.background, theme) || lib.themeColor(result?.background, theme) || null;
      S.items.push({ ...item, root, render, ctx, visible: false, contract: { anchors, background } });
    }
    await document.fonts.ready;
    return { ok: true, fonts: document.fonts.size };
  } catch (e) {
    return { ok: false, error: serializeError(e) };
  }
}

async function renderFrame(i) {
  const { fps, width, height, theme, seed } = S.payload;
  let current;
  try {
    S.fx.reset();
    const active = [];
    for (const item of S.items) {
      const on = i >= item.startFrame && i < item.endFrame;
      if (on !== item.visible) {
        item.root.style.display = on ? 'block' : 'none';
        item.visible = on;
      }
      if (on) active.push(item);
    }

    const styles = new Map();
    for (const item of active) styles.set(item, { opacity: '1', transform: 'none', clipPath: 'none', filter: 'none' });

    // Transitions: an item with transition.frames > 0 overlaps its predecessor.
    for (const item of active) {
      const tr = item.transition;
      if (!tr || !tr.frames || i >= item.startFrame + tr.frames) continue;
      const prev = S.items.find((x) => x.id === item.prevId);
      if (!prev || !styles.has(prev)) continue;
      const fn = transitions[tr.type];
      if (!fn) throw new Error(`unknown transition "${tr.type}"`);
      const p = (i - item.startFrame + 0.5) / tr.frames;
      current = item;
      fn(p, {
        from: styles.get(prev), to: styles.get(item), fx: S.fx, theme, width, height, seed: `${seed}:${item.id}:tr`,
        fps, frame: i - item.startFrame + 1, frames: tr.frames,
        anchors: { from: prev.contract.anchors, to: item.contract.anchors },
        background: { from: prev.contract.background, to: item.contract.background },
      }, tr.props || {});
    }

    for (const item of active) {
      current = item;
      const t = (i - item.startFrame) / fps;
      const s = styles.get(item);
      setStyle(item.root, { opacity: String(s.opacity), transform: s.transform, clipPath: s.clipPath, filter: s.filter });
      item.render(t, { t, p: item.ctx.duration > 0 ? t / item.ctx.duration : 1, frame: i, time: i / fps });
    }
    current = undefined;
    if (S.pending.length) await Promise.all(S.pending.splice(0));
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => r()));
    return { ok: true };
  } catch (e) {
    S.pending.length = 0;
    const err = e instanceof SceneError ? e : new SceneError(current, 'render', e, i);
    return { ok: false, error: serializeError(err) };
  }
}

window.__rm = { init, renderFrame, ready: true };
