// Theme-aware building blocks that several scenes share: pixel sprites, the
// cursor, callout bubbles, and the frame that holds gameplay or product images.
// Custom scenes can use them too (import { makeCallout } from 'render-machine').
//
// Each component builds its DOM once and exposes set/render methods that are
// pure functions of their arguments, so they stay deterministic.

import { el, svg, setStyle, px } from './dom.js';
import { clamp, cubicOut, backOut, easing, progress, rgba, quantize } from './anim.js';

export const isPixel = (theme) => theme.style === 'pixel';
export const isBlueprint = (theme) => theme.style === 'blueprint';
export const isGlossy = (theme) => theme.style === 'glossy';

/** Snap to a multiple of `step` (pixel fonts are crisp on their design grid). */
export const snap = (v, step = 4) => Math.max(step, Math.round(v / step) * step);

/** Hard, stepped "extruded" shadow for pixel type. */
export function pixelShadow(color, depth = 3, step = 4) {
  return Array.from({ length: depth }, (_, i) => `${(i + 1) * step}px ${(i + 1) * step}px 0 ${color}`).join(', ');
}

/**
 * Draw a pixel-art sprite from strings of palette keys ('.' = transparent).
 * Returns a <canvas> sized cols*cell × rows*cell, drawn at native size (no scaling blur).
 */
export function pixelSprite(rows, palette, cell = 4) {
  const w = rows[0].length;
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w * cell;
  c.height = h * cell;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const col = palette[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x * cell, y * cell, cell, cell);
    }
  });
  return c;
}

export const SPRITES = {
  arrow: [
    'K...........',
    'KK..........',
    'KWK.........',
    'KWWK........',
    'KWWWK.......',
    'KWWWWK......',
    'KWWWWWK.....',
    'KWWWWWWK....',
    'KWWWWWWWK...',
    'KWWWWWWWWK..',
    'KWWWWWKKKKK.',
    'KWWKWWK.....',
    'KWK.KWWK....',
    'KK..KWWK....',
    'K....KWWK...',
    '.....KWWK...',
    '......KK....',
  ],
  controller: [
    '..KKKKKKKKKKKK..',
    '.KPPPPPPPPPPPPK.',
    'KPPPWPPPPPPPPPPK',
    'KPPWWWPPPPPPPBPK',
    'KPPPWPPPPPPAPPPK',
    'KPPPPPPPPPPPPPPK',
    'KPPPPKKKKKKPPPPK',
    '.KPPK......KPPK.',
    '..KK........KK..',
  ],
  heart: [
    '.KK.KK.',
    'KRRKRRK',
    'KRWRRRK',
    'KRRRRRK',
    '.KRRRK.',
    '..KRK..',
    '...K...',
  ],
  sparkle: [
    '..W..',
    '..W..',
    'WWWWW',
    '..W..',
    '..W..',
  ],
};

// ── Cursor ────────────────────────────────────────────────────────────────
/**
 * A cursor positioned in `parent`'s coordinate space.
 * set(x, y, { down, visible })
 */
export function makeCursor(ctx, parent, { size } = {}) {
  const { theme, u } = ctx;
  const root = el('div', { style: { position: 'absolute', left: '0', top: '0', width: '0', height: '0', zIndex: '50', pointerEvents: 'none' } }, parent);
  const s = size || u * 5.2;
  let inner;
  if (isPixel(theme)) {
    const cell = Math.max(2, Math.round(s / 16));
    inner = pixelSprite(SPRITES.arrow, { K: theme.colors.shadow || '#000', W: '#ffffff' }, cell);
    setStyle(inner, { position: 'absolute', left: '0', top: '0', filter: `drop-shadow(${cell}px ${cell}px 0 rgba(0,0,0,0.45))` });
    root.appendChild(inner);
  } else {
    inner = svg('svg', { width: s, height: s * 1.3, viewBox: '0 0 20 26', style: { position: 'absolute', left: `${-s * 0.08}px`, top: `${-s * 0.05}px`, overflow: 'visible', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' } }, root);
    svg('path', { d: 'M1.5 1.5 L1.5 20.5 L6.4 15.9 L9.6 23.4 L13.2 21.9 L10.1 14.6 L16.9 14.6 Z', fill: '#ffffff', stroke: theme.colors.bgDeep || '#061429', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, inner);
  }
  return {
    el: root,
    set(x, y, { down = false, visible = true, scale = 1 } = {}) {
      setStyle(root, {
        transform: `translate(${px(x)}, ${px(y)}) scale(${(down ? 0.86 : 1) * scale})`,
        opacity: visible ? '1' : '0',
      });
    },
  };
}

// ── Click ripple ──────────────────────────────────────────────────────────
/** Pool of click ripples. render(clicks, t) where clicks = [{t, x, y}]. */
export function makeRipples(ctx, parent, { duration = 0.5 } = {}) {
  const { theme, u } = ctx;
  const pool = [];
  const get = (i) => {
    if (!pool[i]) {
      pool[i] = el('div', { style: { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: '45', borderStyle: 'solid', boxSizing: 'border-box' } }, parent);
    }
    return pool[i];
  };
  return {
    render(clicks, t, scale = 1) {
      let n = 0;
      for (const c of clicks) {
        const age = t - c.t;
        if (age < 0 || age > duration) continue;
        const p = age / duration;
        const node = get(n++);
        const pixel = isPixel(theme);
        const r = (pixel ? quantize(u * 1.2 + p * u * 5, u * 0.6) : u * 1 + cubicOut(p) * u * 5) / scale;
        setStyle(node, {
          display: 'block',
          width: px(r * 2),
          height: px(r * 2),
          borderWidth: px((pixel ? u * 0.7 : u * 0.45) / scale),
          borderColor: pixel ? theme.colors.primary : theme.colors.accent,
          borderRadius: pixel ? '0' : '50%',
          opacity: String(pixel ? (p < 0.75 ? 1 : 0) : 1 - p),
          transform: `translate(${px(c.x - r)}, ${px(c.y - r)})`,
        });
      }
      for (let i = n; i < pool.length; i++) setStyle(pool[i], { display: 'none' });
    },
  };
}

// ── Callout bubble ────────────────────────────────────────────────────────
/**
 * A text callout. show(text, p, { x, y, anchor, pointer }) where p is the
 * visibility envelope 0..1 (0 hidden). (x, y) is the box's anchor point
 * in parent coordinates. anchor: 'top' (box hangs below the point) | 'bottom'
 * (box sits above the point).
 */
export function makeCallout(ctx, parent, { maxWidth } = {}) {
  const { theme, u } = ctx;
  const pixel = isPixel(theme);
  const glossy = isGlossy(theme);
  const box = el('div', { style: { position: 'absolute', left: '0', top: '0', zIndex: '60', pointerEvents: 'none', maxWidth: px(maxWidth || ctx.width * 0.9), width: 'max-content', transformOrigin: '50% 100%', textWrap: 'balance' } }, parent);
  const label = el('div', {}, box);
  const text = el('div', {}, box);
  const pointer = el('div', { style: { position: 'absolute', left: '50%', width: '0', height: '0' } }, box);
  if (glossy) {
    // candy-pill callout (Y2K): pearl gloss, navy text, white rim, soft drop shadow
    setStyle(box, {
      background: `linear-gradient(180deg, #ffffff 0%, ${theme.colors.panel || '#f4f9ff'} 48%, #cfe3ff 52%, #e9f3ff 100%)`,
      color: theme.colors.panelText || '#0b1b66',
      padding: `${px(u * 1.7)} ${px(u * 3.4)}`,
      border: `${px(Math.max(2, u * 0.45))} solid #ffffff`,
      borderRadius: px(u * 5),
      boxShadow: `0 ${px(u * 0.8)} 0 ${rgba(theme.colors.shadow || '#07124f', 0.6)}, 0 ${px(u * 1.4)} ${px(u * 3)} ${rgba(theme.colors.shadow || '#07124f', 0.45)}`,
      font: `900 ${px(u * 4.2)}/1.12 var(--f-body)`,
      textAlign: 'center',
    });
    setStyle(label, { display: 'none' });
    setStyle(pointer, { display: 'none' });
  } else if (pixel) {
    const b = snap(u * 0.8, 2);
    setStyle(box, {
      background: theme.colors.panel || '#fff',
      color: theme.colors.panelText || '#222',
      padding: `${px(u * 1.8)} ${px(u * 3)}`,
      border: `${px(b)} solid ${theme.colors.shadow || '#000'}`,
      boxShadow: `${px(b * 1.5)} ${px(b * 1.5)} 0 ${theme.colors.shadow || '#000'}`,
      font: `700 ${px(u * 4.3)}/1.1 var(--f-body)`,
      textAlign: 'center',
      letterSpacing: '0.01em',
    });
    setStyle(label, { display: 'none' });
    setStyle(pointer, { borderLeft: `${px(u * 2)} solid transparent`, borderRight: `${px(u * 2)} solid transparent`, marginLeft: px(-u * 2) });
  } else {
    setStyle(box, {
      background: rgba(theme.colors.bgDeep || '#061429', 0.92),
      color: theme.colors.text,
      padding: `${px(u * 1.8)} ${px(u * 2.8)} ${px(u * 2.2)}`,
      border: `${px(Math.max(2, u * 0.25))} solid ${theme.colors.accent}`,
      font: `500 ${px(u * 4.6)}/1.2 var(--f-body)`,
      textAlign: 'left',
    });
    setStyle(label, { font: `500 ${px(u * 2.2)}/1 var(--f-mono)`, letterSpacing: '0.18em', color: theme.colors.accent, marginBottom: px(u * 1.1), textTransform: 'uppercase' });
    setStyle(pointer, { width: px(u * 1.6), height: px(u * 1.6), background: theme.colors.accent, marginLeft: px(-u * 0.8), borderRadius: '50%' });
  }
  let lastText = null;
  return {
    el: box,
    show(str, p, { x, y, anchor = 'bottom', tag = 'NOTE' } = {}) {
      if (p <= 0) {
        setStyle(box, { display: 'none' });
        return;
      }
      if (str !== lastText) {
        text.textContent = str;
        label.textContent = tag;
        lastText = str;
      }
      setStyle(box, { display: 'block' });
      const bw = box.offsetWidth;
      const bh = box.offsetHeight;
      const gap = u * 2.2;
      const left = clamp(x - bw / 2, u * 3, ctx.width - bw - u * 3);
      // never leave the frame: clamp inside a small safe margin
      const top = clamp(anchor === 'bottom' ? y - bh - gap : y + gap, u * 2.5, ctx.height - bh - u * 2.5);
      if (glossy) {
        // springy pop that keeps the pill centred on its anchor point
        const sc = p >= 1 ? 1 : Math.max(0.01, backOut(p, 1.7));
        setStyle(box, { transformOrigin: '50% 50%', transform: `translate(${px(left)}, ${px(top)}) scale(${sc.toFixed(3)})`, opacity: String(clamp(p * 2.2)) });
      } else if (pixel) {
        const c = theme.colors.panel || '#fff';
        if (anchor === 'bottom') setStyle(pointer, { top: '100%', bottom: 'auto', borderTop: `${px(u * 2)} solid ${c}`, borderBottom: '0', left: px(clamp(x - left, u * 3, bw - u * 3)) });
        else setStyle(pointer, { bottom: '100%', top: 'auto', borderBottom: `${px(u * 2)} solid ${c}`, borderTop: '0', left: px(clamp(x - left, u * 3, bw - u * 3)) });
        const sc = p >= 1 ? 1 : quantize(backOut(p, 2.2), 0.125);
        setStyle(box, { transformOrigin: anchor === 'bottom' ? '50% 100%' : '50% 0%', transform: `translate(${px(left)}, ${px(top)}) scale(${Math.max(0.01, sc)})`, opacity: '1' });
      } else {
        setStyle(pointer, { display: 'none' });
        const e = cubicOut(p);
        setStyle(box, { transformOrigin: '50% 50%', transform: `translate(${px(left)}, ${px(top + (1 - e) * u * 2)})`, opacity: String(e), clipPath: `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)` });
      }
      return { left, top, width: bw, height: bh };
    },
  };
}

// ── Framed screen (gameplay / product images) ─────────────────────────────
/**
 * A themed frame around a content box. Returns { root, screen, render(t, enter) }.
 * `screen` is where content goes (overflow hidden, exact box size).
 *   box = { x, y, w, h } in scene pixels (the screen area, frame drawn outside it)
 */
export function makeScreenFrame(ctx, parent, box, { title = '', dims } = {}) {
  const { theme, u } = ctx;
  const root = el('div', { style: { position: 'absolute', left: px(box.x), top: px(box.y), width: px(box.w), height: px(box.h), transformOrigin: '50% 50%' } }, parent);
  const screen = el('div', { style: { position: 'absolute', inset: '0', overflow: 'hidden', background: '#000' } }, root);
  const decor = [];
  if (isPixel(theme)) {
    const b = snap(u * 1.2, 2);
    const bar = snap(u * 6, 2);
    const shadow = theme.colors.shadow || '#000';
    const chrome = el('div', { style: { position: 'absolute', left: px(-b), top: px(-b - bar), width: px(box.w + 2 * b), height: px(box.h + 2 * b + bar), background: theme.colors.primary, boxShadow: `${px(b * 1.6)} ${px(b * 1.6)} 0 ${shadow}, 0 0 0 ${px(b * 0.6)} ${shadow}`, zIndex: '-1' } }, root);
    const tb = el('div', { style: { position: 'absolute', left: '0', right: '0', top: '0', height: px(bar), display: 'flex', alignItems: 'center', padding: `0 ${px(u * 2)}`, color: theme.colors.shadow, font: `400 ${px(snap(u * 2.4, 2))}/1 var(--f-display)`, letterSpacing: '0.02em', overflow: 'hidden', whiteSpace: 'nowrap' } }, chrome);
    el('span', { text: title.toUpperCase(), style: { flex: '1', overflow: 'hidden', textOverflow: 'clip' } }, tb);
    for (const c of [theme.colors.accent, theme.colors.accent2 || theme.colors.accent, theme.colors.accent3 || theme.colors.accent]) {
      el('span', { style: { width: px(snap(u * 2, 2)), height: px(snap(u * 2, 2)), background: c, marginLeft: px(u * 1.2), boxShadow: `0 0 0 ${px(b * 0.4)} ${shadow}` } }, tb);
    }
    decor.push(chrome);
  } else {
    const line = theme.colors.line || '#fff';
    const acc = theme.colors.accent;
    const stroke = Math.max(2, u * 0.22);
    setStyle(screen, { outline: `${px(stroke)} solid ${acc}`, boxShadow: `0 ${px(u * 2)} ${px(u * 6)} rgba(0,0,0,0.55)` });
    const off = u * 1.6;
    const o = svg('svg', { width: box.w + off * 2 + u * 12, height: box.h + off * 2 + u * 12, style: { position: 'absolute', left: px(-off - u * 6), top: px(-off - u * 6), overflow: 'visible', pointerEvents: 'none' } }, root);
    const ox = u * 6;
    const g = svg('g', { transform: `translate(${ox},${ox})`, stroke: line, fill: 'none', 'stroke-width': Math.max(1, u * 0.14), opacity: 0.8 }, o);
    // offset outline with corner ticks
    const W = box.w + off * 2;
    const H = box.h + off * 2;
    const tick = u * 3.5;
    const paths = [
      svg('rect', { x: 0, y: 0, width: W, height: H, opacity: 0.45 }, g),
      ...[[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].map(([x, y, sx, sy]) =>
        svg('path', { d: `M${x - sx * tick} ${y} H${x + sx * tick} M${x} ${y - sy * tick} V${y + sy * tick}`, stroke: acc, 'stroke-width': Math.max(1.5, u * 0.22) }, g)
      ),
    ];
    // dimension line across the top, labelled with the game's CSS size
    const dy = -u * 3.4;
    const dim = svg('path', { d: `M0 ${dy} H${W} M0 ${dy - u} V${dy + u} M${W} ${dy - u} V${dy + u}`, 'stroke-width': Math.max(1, u * 0.14) }, g);
    const lbl = svg('text', { x: u * 1.5, y: dy - u * 0.9, fill: acc, stroke: 'none', 'text-anchor': 'start', style: { font: `500 ${px(u * 2)} var(--f-mono)`, letterSpacing: '0.12em' }, text: dims || title.toUpperCase() }, g);
    decor.push(o);
    paths.push(dim);
    root.__paths = paths;
    root.__label = lbl;
  }
  return {
    root,
    screen,
    /** enter: 0..1 entrance progress */
    render(t, enter = 1) {
      if (isPixel(theme)) {
        const s = enter >= 1 ? 1 : quantize(backOut(clamp(enter), 1.6), 0.0625);
        setStyle(root, { transform: `scale(${Math.max(0.001, s)})`, opacity: enter > 0 ? '1' : '0' });
      } else {
        const e = easing('quintOut')(clamp(enter));
        setStyle(root, { transform: `translate(0, ${px((1 - e) * u * 6)}) scale(${0.96 + 0.04 * e})`, opacity: String(clamp(enter * 1.6)) });
      }
    },
  };
}

// ── Grain ─────────────────────────────────────────────────────────────────
/** A seeded noise tile as a data URL (for film grain / paper texture). */
export function noiseTile(rng, size = 192, alpha = 255) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(rng() * 256);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = alpha;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** Window helper: envelope for an item shown from start to end with in/out durations. */
export function showWindow(t, start, end, fin = 0.35, fout = 0.3) {
  if (t < start || t > end) return 0;
  return Math.min(progress(t, start, fin), progress(end - t, 0, fout));
}

// ── Soft shadow ───────────────────────────────────────────────────────────
/**
 * A soft drop shadow for a w×h box, drawn once into a small canvas and scaled
 * up. A CSS box-shadow/blur on a moving element re-rasterises every frame;
 * this costs nothing per frame. Append it before the box, in the same parent.
 */
export function softShadow(ctx, parent, w, h, { blur, offsetY, alpha = 0.5, left = 0, top = 0 } = {}) {
  const { u } = ctx;
  const b = blur ?? u * 3.2;
  const pad = b * 2;
  const k = 0.25;
  const canvas = el('canvas', {
    attrs: { width: Math.max(1, Math.round((w + pad * 2) * k)), height: Math.max(1, Math.round((h + pad * 2) * k)) },
    style: { position: 'absolute', left: px(left - pad), top: px(top - pad + (offsetY ?? u * 0.8)), width: px(w + pad * 2), height: px(h + pad * 2), pointerEvents: 'none' },
  }, parent);
  const g = canvas.getContext('2d');
  g.shadowColor = `rgba(0,0,0,${alpha})`;
  g.shadowBlur = b * k;
  g.fillStyle = `rgba(0,0,0,${alpha})`;
  g.fillRect(pad * k, pad * k, w * k, h * k);
  return canvas;
}
