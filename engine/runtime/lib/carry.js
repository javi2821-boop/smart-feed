// Carried objects (docs/TECHNIQUES.md, item 1): one object keeps its identity across a scene boundary.
//
//   Hand-off: scene A says where its last object ends (an anchor: x, y, r, fill) and a carrier grows from it across
//             the overlap until it covers the frame in scene B's background colour, so the cut under it can't be seen
//             (the `flood` transition), or the camera dives through it, a letter's counter, into scene B (`dive`).
//   Actor:    one overlay whose whole state is a single function of time, actor(t) → { x, y, r, w, h, scaleX,
//             scaleY, fill }, never reset at a boundary (the `actor` library scene).
//
// Everything here is a pure function with no DOM, so the browser draws from it and Node tests read it.
//
// The anchor contract. A scene's setup may return { render, anchors, background }:
//   anchors     { name: { x, y, r, w?, h?, fill? } } in pixels of the frame, where its objects are at rest. By
//               convention `out` is where the scene's last object ends (a hand-off leaves from it) and `in` is
//               where its first object starts.
//   background  the scene's flat background colour (a hand-off into the scene floods in this colour).
// A composition can add or override both per scene (`scenes[i].anchors`, `scenes[i].background`), there in frame
// units: x and y as fractions of the width and height, r, w and h in u (1% of the short side).

import { spring, springOptions, hop, mixColor, clamp } from './anim.js';

/** How far a circle from (x, y) must reach to cover a width × height frame. */
export const reachFrom = (x, y, width, height) => Math.max(Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y));

/**
 * The scale ramp of a hand-off, frame by frame: from s0 to s1 in `frames` steps, accelerating in log space (each
 * frame grows by more than the one before: ln s = ln s0 + L·(a·q + (1 − a)·q²)). The measured floods grow ×1.4 to
 * ×2.5 a frame for 5 to 10 frames; the measured dives 15× to 29× with the per-frame ratio rising about 1.25 → 1.55.
 * Returns the scale at frame k (1-based; k = frames is s1).
 */
export function rampScale(k, frames, s0, s1, { linearShare = 0.6 } = {}) {
  const q = clamp(k / frames);
  const L = Math.log(s1 / s0);
  return s0 * Math.exp(L * (linearShare * q + (1 - linearShare) * q * q));
}

/** How many frames a ramp from s0 to s1 takes at a mean per-frame ratio, kept within [min, max]. */
export const rampFrames = (s0, s1, { ratio = 1.75, min = 5, max = 10 } = {}) => Math.max(1, Math.min(max, Math.max(min, Math.ceil(Math.log(s1 / s0) / Math.log(ratio)))));

/** Snap a value to a grid of `cell` pixels (whole cells; a cell of 1 or less leaves it alone). */
export const onGrid = (v, cell) => (cell > 1 ? Math.round(v / cell) * cell : v);

/** An anchor in frame units (as a composition writes it: x, y fractions of the frame; r, w, h in u) in pixels. */
export function anchorToPx(a, width, height) {
  const u = Math.min(width, height) / 100;
  const out = { ...a, x: a.x * width, y: a.y * height };
  for (const k of ['r', 'w', 'h']) if (a[k] !== undefined) out[k] = a[k] * u;
  return out;
}

/** A colour by theme name ("accent", "bg") or as written ("#ffcc00"). */
export const themeColor = (c, theme) => (c && theme?.colors?.[c]) || c;

/**
 * The flood: where the carrier is on frame k of a hand-off from anchor `a` into a scene of colour `fill`.
 * Returns { x, y, r, w, h, fill, covered } in pixels: a disc (or, for an anchor with w and h, a box: a cursor, a
 * bracket) grown about the anchor's centre, its colour turning from the object's own colour into the next scene's
 * over the first half of the growth (so its first frame is the object itself). `covered` is true once it covers
 * the frame (from the frame after the one it first covers it on): the transition then shows the next scene, whose
 * background is the same colour.
 */
export function floodAt(k, a, { width, height, fill, cell = 0, fps = 30, frames = Infinity } = {}) {
  const box = a.w !== undefined && a.h !== undefined;
  const r0 = Math.max(1, a.r || 1);
  // the scale at which it covers the frame (a box: both half-sides past the far edges), a hair over
  const s1 = 1.02 * (box
    ? Math.max(Math.max(a.x, width - a.x) / Math.max(1, a.w / 2), Math.max(a.y, height - a.y) / Math.max(1, a.h / 2))
    : reachFrom(a.x, a.y, width, height) / r0);
  // the measured pace is per frame at 30 fps: 5 to 10 frames at about ×1.75 a frame on average
  const f = fps / 30;
  const n = rampFrames(1, s1, { ratio: 1.75 ** (1 / f), min: Math.round(5 * f), max: Math.min(frames, Math.round(10 * f)) });
  const s = rampScale(Math.min(k, n), n, 1, s1);
  const from = a.fill || fill;
  const c = !fill || from === fill ? fill || from : mixColor(from, fill, clamp((k - 1) / Math.max(1, n / 2)));
  const x = onGrid(a.x, cell), y = onGrid(a.y, cell);
  const out = { x, y, fill: c, frames: n, covered: k > n, scale: s };
  if (box) Object.assign(out, { w: onGrid(a.w * s, cell), h: onGrid(a.h * s, cell) });
  else out.r = onGrid(r0 * s, cell);
  return out;
}

/**
 * The dive: the outgoing scene scales up about anchor `a` (a letter's counter, a ring, a hole in a logo) and the
 * incoming scene shows through the opening as it grows. The measured dives magnify 15× to 29× in 0.2 to 0.4 s, faster
 * every frame, so the scale is kept in [minScale, maxScale]; when the opening still doesn't cover the frame at the
 * top of the ramp, the last frames dissolve to the incoming scene's flat colour (`fade`, 0-1, that colour's opacity).
 * Returns { x, y, scale, r, rx?, ry?, fade, frames, covered } on frame k.
 */
export function diveAt(k, a, { width, height, cell = 0, minScale = 15, maxScale = 29, fps = 30, frames = Infinity } = {}) {
  const oval = a.w !== undefined && a.h !== undefined; // a counter is usually taller than it is wide
  const r0 = Math.max(1, oval ? Math.min(a.w, a.h) / 2 : a.r || 1);
  const need = (reachFrom(a.x, a.y, width, height) / r0) * 1.02;
  const s1 = Math.min(maxScale, Math.max(minScale, need));
  const f = fps / 30;
  const n = rampFrames(1, s1, { ratio: 1.4 ** (1 / f), min: Math.round(6 * f), max: Math.min(frames, Math.round(12 * f)) });
  const kk = Math.min(k, n);
  const s = rampScale(kk, n, 1, s1);
  // short of covering: dissolve over the last two frames (at 30 fps)
  const tail = Math.max(1, Math.round(2 * f));
  const fade = need > s1 ? clamp((kk - (n - tail)) / (tail + 1)) : 0;
  const out = { x: onGrid(a.x, cell), y: onGrid(a.y, cell), scale: s, r: onGrid(r0 * s, cell), fade, frames: n, covered: k > n };
  if (oval) Object.assign(out, { rx: onGrid((a.w / 2) * s, cell), ry: onGrid((a.h / 2) * s, cell) });
  return out;
}

// ── The persistent actor ──────────────────────────────────────────────────

const MOVE = springOptions({ overshoot: 0.06, settle: 0.4 });
const PROPS = ['x', 'y', 'r', 'w', 'h'];

/** One axis of a spring from `a` to `b` that starts with velocity v (units/s): superposition of two step responses. */
function springAxis(tau, a, b, v, o) {
  const s0 = spring(tau, o);
  return b + (a - b) * (1 - s0) + (v ? v * (spring(tau, { ...o, velocity: 1 }) - s0) : 0);
}

/**
 * An actor's track: keys [{ at, x, y, r?, w?, h?, fill?, move?, ... }] in seconds and pixels, sorted by time. The first
 * key is where it starts. Each later key sends it to its point from its time:
 *   move: 'spring' (default; `overshoot`, `settle`) keeps its velocity, so a new target mid-flight bends the path
 *         instead of restarting it;
 *   move: 'hop' (`height` in pixels, `duration`, `bounces`) a hop under gravity, squashed flat for a frame on landing;
 *   move: 'cut' it is simply there (a hard cut where the actor holds its screen position needs no key at all).
 * fill flips at the key's time (or blends over `fade` seconds). `cell` snaps position and size to a pixel grid.
 * Returns actor(t) → { x, y, r, w, h, scaleX, scaleY, fill, contact }.
 */
export function actorTrack(keys, { cell = 0, frame = 1 / 30 } = {}) {
  if (!keys.length) throw new Error('an actor needs at least one key');
  const ks = [...keys].sort((p, q) => p.at - q.at);
  const fillAt = (t) => {
    let c = ks[0].fill, prev = c, k0 = null;
    for (const k of ks) {
      if (k.at > t) break;
      if (k.fill !== undefined) { prev = c; c = k.fill; k0 = k; }
    }
    if (k0 && k0.fade > 0 && prev && t < k0.at + k0.fade) return mixColor(prev, c, (t - k0.at) / k0.fade);
    return c;
  };
  // the state each segment starts from: where the previous one had got to, and how fast it was going
  const starts = [{ ...pick(ks[0]), v: {} }];
  const seg = (i, t) => {
    const k = ks[i], s = starts[i];
    const tau = t - k.at;
    const out = {};
    if (i === 0 || k.move === 'cut') { for (const p of PROPS) out[p] = k[p] ?? s[p]; return { ...out, sx: 1, sy: 1, contact: false }; }
    if (k.move === 'hop') {
      const h = hop(t, k.at, { from: [s.x, s.y], to: [k.x ?? s.x, k.y ?? s.y], height: k.height ?? 40, duration: k.duration ?? 0.45, bounces: k.bounces ?? 0, restitution: k.restitution ?? 0.55, squash: k.squash ?? 0.3, frame });
      const p = clamp(tau / (k.duration ?? 0.45));
      for (const q of ['r', 'w', 'h']) if (s[q] !== undefined || k[q] !== undefined) out[q] = (s[q] ?? k[q]) + ((k[q] ?? s[q]) - (s[q] ?? k[q])) * p;
      return { ...out, x: h.x, y: h.y, sx: h.sx, sy: h.sy, contact: h.contact };
    }
    const o = 'stiffness' in k ? k : k.overshoot !== undefined || k.settle !== undefined ? springOptions({ overshoot: k.overshoot ?? 0, settle: k.settle ?? 0.4 }) : MOVE;
    for (const p of PROPS) {
      if (s[p] === undefined && k[p] === undefined) continue;
      const a = s[p] ?? k[p], b = k[p] ?? a;
      out[p] = springAxis(tau, a, b, s.v[p] || 0, o);
    }
    return { ...out, sx: 1, sy: 1, contact: false };
  };
  const h = 1e-3;
  for (let i = 1; i < ks.length; i++) {
    const t = ks[i].at;
    const a = seg(i - 1, t), b = seg(i - 1, t - h);
    const v = {};
    for (const p of PROPS) if (a[p] !== undefined && b[p] !== undefined) v[p] = (a[p] - b[p]) / h;
    starts.push({ ...pick(a), v });
  }
  return (t) => {
    let i = 0;
    while (i + 1 < ks.length && ks[i + 1].at <= t) i++;
    const st = seg(i, Math.max(t, ks[0].at));
    return {
      x: onGrid(st.x, cell),
      y: onGrid(st.y, cell),
      r: st.r === undefined ? undefined : onGrid(st.r, cell),
      w: st.w === undefined ? undefined : onGrid(st.w, cell),
      h: st.h === undefined ? undefined : onGrid(st.h, cell),
      scaleX: st.sx,
      scaleY: st.sy,
      fill: fillAt(t),
      contact: st.contact,
    };
  };
}

function pick(o) {
  const out = {};
  for (const p of PROPS) if (o[p] !== undefined) out[p] = o[p];
  return out;
}
