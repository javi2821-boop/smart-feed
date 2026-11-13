// Scene-to-scene transitions. A transition gets a progress p in (0, 1) and two
// style objects (outgoing `from`, incoming `to`) that it mutates. The runtime
// applies them to the scene containers. For effects that need their own pixels
// (scan line, pixel blocks) it can draw into `fx`, a layer above all scenes and
// below overlays.
//
// Every transition is a pure function of p, so it stays deterministic.

import { cubicInOut, cubicOut, quintInOut, easing, createRng, rgba, clamp, floodAt, diveAt, themeColor, anchorToPx } from 'render-machine';

const pct = (v) => `${(v * 100).toFixed(3)}%`;

/** The pixel grid a hand-off snaps to: `cols` cells across, else 180 across on a pixel theme, else none. */
const gridCell = (opts, theme, width) => (opts.cols ? width / opts.cols : theme.style === 'pixel' ? width / 180 : 0);

/**
 * The anchor a hand-off leaves from: `opts.at` written in the composition (frame units), else the outgoing scene's
 * anchor named `opts.anchor` (default `out`).
 */
function handoffAnchor(name, opts, c) {
  if (opts.at) return anchorToPx(opts.at, c.width, c.height);
  const key = opts.anchor || 'out';
  const a = c.anchors?.from?.[key];
  if (!a) {
    const have = Object.keys(c.anchors?.from || {});
    throw new Error(`${name}: the outgoing scene has no anchor "${key}" (${have.length ? `it has: ${have.join(', ')}` : 'it exports none'}); give the scene's setup an \`anchors\` result, the scene entry \`anchors\`, or the transition \`props.at\``);
  }
  return a;
}

/** A filled circle as rows of whole cells (a pixel disc), centre and radius in pixels. */
function cellDisc(g, cx, cy, r, cell) {
  const n = Math.round(r / cell);
  const ox = Math.round(cx / cell), oy = Math.round(cy / cell);
  for (let dy = -n; dy <= n; dy++) {
    const h = Math.floor(Math.sqrt(n * n - dy * dy) + 0.5);
    g.fillRect((ox - h) * cell, (oy + dy) * cell, (2 * h + 1) * cell, cell);
  }
}

/** The same disc as a clip-path polygon of axis-aligned steps on cell edges. */
function cellDiscPath(cx, cy, r, cell) {
  const n = Math.round(r / cell);
  const ox = Math.round(cx / cell), oy = Math.round(cy / cell);
  const q = (v) => `${(v * cell).toFixed(2)}px`;
  const right = [], left = [];
  for (let dy = -n; dy <= n; dy++) {
    const h = Math.floor(Math.sqrt(n * n - dy * dy) + 0.5);
    right.push(`${q(ox + h + 1)} ${q(oy + dy)}`, `${q(ox + h + 1)} ${q(oy + dy + 1)}`);
    left.unshift(`${q(ox - h)} ${q(oy + dy + 1)}`, `${q(ox - h)} ${q(oy + dy)}`);
  }
  return `polygon(${[...right, ...left].join(', ')})`;
}

/** Default overlap per transition type, in seconds (else the theme's, else 0.6). */
export const transitionDurations = { flood: 0.34, dive: 0.4 };

export const transitions = {
  cut() {},

  fade(p, { from, to }, opts) {
    const e = easing(opts.ease || 'sineInOut')(p);
    from.opacity = 1 - e;
    to.opacity = e;
  },

  /** Dip: the outgoing scene fades out completely before the incoming one fades in. */
  'fade-through'(p, { from, to }) {
    from.opacity = clamp(1 - p * 2);
    to.opacity = clamp(p * 2 - 1);
  },

  'slide-up'(p, { from, to }, opts) {
    const e = easing(opts.ease || 'quintInOut')(p);
    to.transform = `translate(0, ${pct(1 - e)})`;
    from.transform = `translate(0, ${pct(-0.25 * e)})`;
    from.opacity = 1 - e * 0.8;
  },

  'slide-left'(p, { from, to }, opts) {
    const e = easing(opts.ease || 'quintInOut')(p);
    to.transform = `translate(${pct(1 - e)}, 0)`;
    from.transform = `translate(${pct(-0.25 * e)}, 0)`;
    from.opacity = 1 - e * 0.8;
  },

  wipe(p, { from, to }, opts) {
    const e = easing(opts.ease || 'cubicInOut')(p);
    to.clipPath = `inset(0 ${pct(1 - e)} 0 0)`;
    from.clipPath = `inset(0 0 0 ${pct(e)})`;
  },

  zoom(p, { from, to }, opts) {
    const e = easing(opts.ease || 'cubicInOut')(p);
    from.transform = `scale(${1 + 0.12 * e})`;
    from.opacity = 1 - e;
    to.transform = `scale(${0.94 + 0.06 * cubicOut(p)})`;
    to.opacity = e;
  },

  /**
   * Blueprint scan: a bright drafting line sweeps down the frame, handing over
   * from the outgoing to the incoming scene exactly at the line.
   */
  scan(p, { from, to, fx, theme, width, height }, opts) {
    const e = quintInOut(p);
    const y = e * height;
    to.clipPath = `inset(0 0 ${pct(1 - e)} 0)`;
    from.clipPath = `inset(${pct(e)} 0 0 0)`;
    const color = opts.color || theme.colors.accent || '#5ce1ff';
    const g = fx.ctx();
    const glow = Math.max(24, height * 0.03);
    const grad = g.createLinearGradient(0, y - glow, 0, y + glow * 0.25);
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(0.85, rgba(color, 0.22));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, y - glow, width, glow * 1.25);
    g.fillStyle = rgba('#ffffff', 0.95);
    g.fillRect(0, y - 1.5, width, 3);
    g.fillStyle = rgba(color, 0.9);
    g.fillRect(0, y - 4, width, 1.5);
    g.fillRect(0, y + 2.5, width, 1.5);
    // tick marks riding the line, like a drafting rule
    g.fillStyle = rgba('#ffffff', 0.8);
    const step = width / 24;
    for (let i = 0; i <= 24; i++) {
      const h = i % 6 === 0 ? 22 : i % 2 === 0 ? 12 : 7;
      g.fillRect(i * step - 1, y - h, 2, h);
    }
  },

  /**
   * Retro pixel dissolve: chunky blocks fill the frame in a seeded order, the
   * scenes swap underneath, then the blocks clear in another order.
   */
  pixel(p, { from, to, fx, theme, width, height, seed }, opts) {
    const size = opts.blockSize || Math.round(Math.min(width, height) / 12);
    const cols = Math.ceil(width / size);
    const rows = Math.ceil(height / size);
    const n = cols * rows;
    const cacheKey = `${seed}|${cols}x${rows}`;
    if (!fx.cache[cacheKey]) {
      const rng = createRng(cacheKey);
      const idx = Array.from({ length: n }, (_, i) => i);
      fx.cache[cacheKey] = { inOrder: rng.shuffle(idx), outOrder: rng.shuffle(idx) };
    }
    const { inOrder, outOrder } = fx.cache[cacheKey];
    const palette = opts.colors || [theme.colors.bg, theme.colors.bgAlt || theme.colors.bg, theme.colors.accent, theme.colors.primary].filter(Boolean);
    const g = fx.ctx();
    let blocks;
    if (p < 0.5) {
      const k = Math.floor(cubicInOut(p * 2) * n);
      blocks = inOrder.slice(0, k);
      to.opacity = 0;
    } else {
      const k = Math.floor((1 - cubicInOut((p - 0.5) * 2)) * n);
      blocks = outOrder.slice(0, k);
      from.opacity = 0;
    }
    for (const b of blocks) {
      const c = b % cols;
      const r = Math.floor(b / cols);
      g.fillStyle = palette[(c * 7 + r * 13) % palette.length];
      g.fillRect(c * size, r * size, size, size);
    }
  },

  /**
   * Iris: the incoming scene opens through a circle that grows from a point, slow at first, then fast. For pixel
   * art, give the art's grid (`cols` cells across) and a point on it (`x`, `y`): the circle is then a staircase of
   * whole cells (the rows a pixel disc has), so its edge never blurs. `reach` is the radius that covers the frame, in
   * cells (default: to the farthest corner). `smooth` draws a plain circle instead, for art that isn't pixel art.
   */
  iris(p, { to, width, height }, opts) {
    const cols = opts.cols || width;
    const cell = width / cols;
    const rowsN = Math.round(height / cell);
    const cx = Math.round(opts.x ?? cols / 2), cy = Math.round(opts.y ?? rowsN / 2);
    const reach = opts.reach ?? Math.ceil(Math.max(...[[0, 0], [cols, 0], [0, rowsN], [cols, rowsN]].map(([a, b]) => Math.hypot(a - cx, b - cy)))) + 2;
    const r = Math.round(reach * p * p);
    if (opts.smooth) { // a plain circle for art that isn't pixel art, centred on the point's cell
      to.clipPath = `circle(${(r * cell).toFixed(2)}px at ${((cx + 0.5) * cell).toFixed(2)}px ${((cy + 0.5) * cell).toFixed(2)}px)`;
      return;
    }
    const half = (dy) => Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    const px = (v) => `${(v * cell).toFixed(2)}px`;
    // the right edge going down, then the left edge going up: a polygon of axis-aligned steps on cell edges
    const right = [], left = [];
    for (let dy = -r; dy <= r; dy++) {
      const h = half(dy);
      right.push(`${px(cx + h + 1)} ${px(cy + dy)}`, `${px(cx + h + 1)} ${px(cy + dy + 1)}`);
      left.unshift(`${px(cx - h)} ${px(cy + dy + 1)}`, `${px(cx - h)} ${px(cy + dy)}`);
    }
    to.clipPath = `polygon(${[...right, ...left].join(', ')})`;
  },

  /**
   * Pan: the camera moves right, so the outgoing scene slides out to the left as the incoming one slides in from the
   * right, edge to edge. With `cols` (the art's grid), every step is a whole cell, so pixel art stays hard.
   */
  'pan-left'(p, { from, to, width }, opts) {
    const e = easing(opts.ease || 'cubicInOut')(p);
    const cell = opts.cols ? width / opts.cols : 1;
    const off = Math.round((e * width) / cell) * cell;
    from.transform = `translate(${(-off).toFixed(2)}px, 0)`;
    to.transform = `translate(${(width - off).toFixed(2)}px, 0)`;
  },

  /**
   * Flood (a hand-off): the outgoing scene's last object (its `out` anchor: a full stop, a cursor, a bracket, a hole)
   * grows until it covers the frame, turning into the incoming scene's background colour as it grows, so the cut
   * under it can't be seen. Accelerating, about ×1.4 to ×2.5 a frame for 5 to 10 frames (docs/TECHNIQUES.md, item 1).
   * Props: `anchor` (name, default "out") or `at` ({ x, y, r | w, h } in frame units), `fill` (default the incoming
   * scene's background), `cols` (a pixel grid; a pixel theme snaps to 180 across).
   */
  flood(p, c, opts) {
    const { from, to, fx, theme, width, height } = c;
    const a = handoffAnchor('flood', opts, c);
    const fill = themeColor(opts.fill, theme) || c.background?.to || theme.colors.bg;
    const cell = gridCell(opts, theme, width);
    const f = floodAt(c.frame, { ...a, fill: themeColor(a.fill, theme) }, { width, height, fill, cell, fps: c.fps, frames: c.frames });
    if (f.covered) {
      from.opacity = 0;
      return;
    }
    to.opacity = 0;
    const g = fx.ctx();
    g.fillStyle = f.fill;
    if (f.w !== undefined) {
      const snap = (v) => (cell ? Math.round(v / cell) * cell : Math.round(v));
      g.fillRect(snap(f.x - f.w / 2), snap(f.y - f.h / 2), snap(f.w), snap(f.h));
    } else if (cell) {
      cellDisc(g, f.x, f.y, f.r, cell);
    } else {
      g.beginPath();
      g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      g.fill();
    }
  },

  /**
   * Dive (a hand-off): the camera dives through the outgoing scene's `out` anchor (a letter's counter, a ring, a hole
   * in a logo): the scene scales up about it, 15× to 29× and faster every frame, and the incoming scene shows through
   * the opening as it grows (a small counter that would need more than `maxScale` dissolves to the incoming scene's
   * background over the last two frames instead). Props: `anchor` / `at` as for flood (w and h make the opening an oval), `minScale` (15),
   * `maxScale` (29), `fill` (the dissolve's colour), `cols`.
   */
  dive(p, c, opts) {
    const { from, to, theme, width, height } = c;
    const a = handoffAnchor('dive', opts, c);
    const cell = gridCell(opts, theme, width);
    const d = diveAt(c.frame, a, { width, height, cell, minScale: opts.minScale, maxScale: opts.maxScale, fps: c.fps, frames: c.frames });
    if (d.covered) {
      from.opacity = 0;
      return;
    }
    if (d.fade > 0) {
      // short of covering: dissolve to the incoming scene's flat colour (it takes over on the next frame)
      const g = c.fx.ctx();
      g.fillStyle = rgba(themeColor(opts.fill, theme) || c.background?.to || theme.colors.bg, d.fade);
      g.fillRect(0, 0, width, height);
    }
    // scale about the anchor: CSS scales about the layer's centre, so shift by (1 − s)·(anchor − centre)
    const tx = (1 - d.scale) * (d.x - width / 2), ty = (1 - d.scale) * (d.y - height / 2);
    from.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${d.scale.toFixed(5)})`;
    const at = `at ${d.x.toFixed(2)}px ${d.y.toFixed(2)}px`;
    to.clipPath = cell ? cellDiscPath(d.x, d.y, d.r, cell) : d.rx !== undefined ? `ellipse(${d.rx.toFixed(2)}px ${d.ry.toFixed(2)}px ${at})` : `circle(${d.r.toFixed(2)}px ${at})`;
  },
};

export const transitionNames = Object.keys(transitions);
