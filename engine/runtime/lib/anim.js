// Time → value helpers. Everything here is a pure function: the same inputs
// always produce the same output, which is what makes renders deterministic and
// lets frames render in parallel and in any order.
//
// cubicBezier and EASE are modified from video-shotcraft demos/_fixtures/Polish.tsx
// (Apache-2.0, Copyright 2026 Wei Yihao; see THIRD_PARTY.md): translated from
// TypeScript to plain JavaScript, plus four more named curves (friendly, camera,
// brake, roll) taken from shotcraft's recipe cards and demos.

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, p) => a + (b - a) * p;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const remap = (v, a0, a1, b0, b1, ease = linear) => lerp(b0, b1, ease(clamp(invLerp(a0, a1, v))));
export const quantize = (v, step) => Math.round(v / step) * step;
export const fract = (v) => v - Math.floor(v);
export const smoothstep = (p) => p * p * (3 - 2 * p);

// ── Easing ────────────────────────────────────────────────────────────────
export const linear = (p) => p;
export const quadIn = (p) => p * p;
export const quadOut = (p) => 1 - (1 - p) * (1 - p);
export const quadInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
export const cubicIn = (p) => p * p * p;
export const cubicOut = (p) => 1 - Math.pow(1 - p, 3);
export const cubicInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const quartOut = (p) => 1 - Math.pow(1 - p, 4);
export const quintOut = (p) => 1 - Math.pow(1 - p, 5);
export const quintInOut = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2);
export const expoOut = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const expoInOut = (p) =>
  p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
export const sineInOut = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
export const circOut = (p) => Math.sqrt(1 - Math.pow(p - 1, 2));
export const backOut = (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
export const elasticOut = (p) =>
  p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
/** Stepped easing for pixel/retro motion: quantises any easing into n steps. */
export const steps = (n, ease = linear) => (p) => Math.round(ease(p) * n) / n;

/**
 * CSS cubic-bezier(x1, y1, x2, y2) as an easing function (Newton's method, then
 * bisection). y may leave 0..1 for anticipation and overshoot. Modified from
 * video-shotcraft demos/_fixtures/Polish.tsx (Apache-2.0; see the note at the top).
 */
export function cubicBezier(x1, y1, x2, y2) {
  if (x1 === y1 && x2 === y2) return (p) => clamp(p);
  const ax = 1 - 3 * x2 + 3 * x1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 1 - 3 * y2 + 3 * y1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  const solve = (x) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - x;
      if (Math.abs(err) < 1e-7) return u;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : sy(solve(p)));
}

/**
 * Named curves for promo motion (shotcraft's presets): snappy entrances, smooth
 * camera moves, exits, a small anticipation, a landing overshoot, and the
 * "friendly" curve its brand table gives small local businesses.
 */
export const EASE = Object.freeze({
  snappy: cubicBezier(0.16, 1, 0.3, 1),
  out: cubicBezier(0.22, 1, 0.36, 1),
  smooth: cubicBezier(0.65, 0, 0.35, 1),
  swift: cubicBezier(0.4, 0, 0.2, 1),
  exit: cubicBezier(0.7, 0, 0.84, 0),
  anticip: cubicBezier(0.5, -0.32, 0.25, 1),
  overshoot: cubicBezier(0.34, 1.45, 0.64, 1),
  friendly: cubicBezier(0.25, 0.46, 0.45, 0.94),
  camera: cubicBezier(0.33, 0, 0.15, 1),
  brake: cubicBezier(0.45, 0, 0.06, 1),
  roll: cubicBezier(0.25, 0.8, 0.25, 1),
});

export const easings = {
  linear, quadIn, quadOut, quadInOut, cubicIn, cubicOut, cubicInOut, quartOut, quintOut,
  quintInOut, expoOut, expoInOut, sineInOut, circOut, backOut, elasticOut,
  ...EASE,
};
/** Look up an easing by name (or pass a function through). */
export const easing = (e) => (typeof e === 'function' ? e : easings[e] || cubicOut);

// ── Time windows ──────────────────────────────────────────────────────────
/** 0 → 1 as t goes from start to start + duration (clamped). */
export const progress = (t, start, duration) => (duration <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / duration));

/** Tween a number from → to over [start, start + duration]. */
export const tween = (t, start, duration, from, to, ease = cubicOut) =>
  lerp(from, to, easing(ease)(progress(t, start, duration)));

/**
 * Piecewise keyframes: keyframes(t, [[0, 0], [1, 100, 'cubicOut'], [2, 50]]).
 * Values may be numbers or equal-length arrays of numbers. The easing on a key
 * applies to the segment that ends at that key.
 */
export function keyframes(t, keys) {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const p = easing(e || 'linear')(progress(t, t0, t1 - t0));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], p)) : lerp(v0, v1, p);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * Analytic damped spring from 0 → 1. No simulation state, so it's safe to
 * evaluate at any t in any order. t in seconds. `velocity` is the initial
 * velocity toward the target (units per second).
 *
 * Solves m·x'' + c·x' + k·x = 0 for the displacement x = value − 1, with
 * x(0) = −1 and x'(0) = velocity, in its three regimes:
 *   ζ < 1  underdamped (overshoots and rings)
 *   ζ = 1  critically damped (fastest settle without overshoot)
 *   ζ > 1  overdamped (two real decay rates, slower settle)
 */
export function spring(t, { stiffness = 170, damping = 20, mass = 1, velocity = 0 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = -1;
  const v0 = velocity;
  let x;
  if (Math.abs(zeta - 1) < 1e-6) {
    x = (x0 + (v0 + w0 * x0) * t) * Math.exp(-w0 * t);
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = Math.exp(-zeta * w0 * t) * (x0 * Math.cos(wd * t) + ((v0 + zeta * w0 * x0) / wd) * Math.sin(wd * t));
  } else {
    // roots of m·r² + c·r + k = 0: r1 (slow) and r2 (fast), both negative
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * w0 + s;
    const r2 = -zeta * w0 - s;
    const c1 = (v0 - r2 * x0) / (r1 - r2);
    const c2 = x0 - c1;
    x = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
  return 1 + x;
}

// ── Motion kit: springs that retarget, entrances, hops ────────────────────
// Still pure functions of t: a value that changes target many times is a sum of closed-form springs, one per change,
// so any frame can be rendered alone, in any order.

/**
 * Spring settings from what a designer asks for: how far past the target it may go (0.08 = 8% of the move; 0 is
 * critically damped, no overshoot) and roughly when it is within 2% of the target (seconds).
 */
export function springOptions({ overshoot = 0, settle = 0.35 } = {}) {
  if (!(overshoot > 0)) {
    const w = 5.8 / settle; // critically damped: within 2% after about 5.8 / w
    return { stiffness: w * w, damping: 2 * w, mass: 1 };
  }
  const l = Math.log(Math.min(overshoot, 0.95));
  const zeta = -l / Math.sqrt(Math.PI * Math.PI + l * l);
  const w = 4 / (zeta * settle);
  return { stiffness: w * w, damping: 2 * zeta * w, mass: 1 };
}

/**
 * A value that moves to a new target at each key: springTo(t, [[0, 10], [1.2, 40], [2, 25, { overshoot: 0.08 }]]).
 * The first key is the starting value; each later key starts one spring step response toward its value from its
 * time, and the value is their sum, so a retarget mid-flight keeps the motion continuous. A key's third element sets
 * that move's spring (springOptions, or stiffness/damping/mass); `opts` is the default for every move. Values may be
 * numbers or equal-length arrays (a position).
 */
export function springTo(t, keys, opts = {}) {
  if (!keys.length) return 0;
  const first = keys[0][1];
  let acc = Array.isArray(first) ? [...first] : first;
  for (let k = 1; k < keys.length; k++) {
    const [tk, vk, o] = keys[k];
    if (t <= tk) break;
    const set = o || opts;
    const s = spring(t - tk, 'overshoot' in set || 'settle' in set ? springOptions(set) : set);
    const prev = keys[k - 1][1];
    acc = Array.isArray(acc) ? acc.map((a, j) => a + (vk[j] - prev[j]) * s) : acc + (vk - prev) * s;
  }
  return acc;
}

/**
 * An entrance that is already moving: from `from` at t0, closing a fixed share of the remaining distance every
 * moment (an exponential ease-out), so the first frame of an entrance is its fastest and nothing starts from rest.
 * `rate` 14 covers about 37% of the way per frame at 30 fps and is within a pixel of 60 px in 0.3 s. Before t0 it is
 * `from`. Numbers or arrays.
 */
export function arrive(t, t0, from, to, { rate = 14 } = {}) {
  const k = t <= t0 ? 1 : Math.exp(-rate * (t - t0));
  return Array.isArray(from) ? from.map((a, j) => to[j] + (a - to[j]) * k) : to + (from - to) * k;
}

/**
 * A hop under gravity from `from` to `to` ([x, y], y down): a parabola with its apex `height` above the straight
 * line, taking `duration`, then `bounces` smaller hops on the spot, each restitution² as high and restitution as long
 * (constant gravity). Returns { x, y, sx, sy, contact, done }: sx/sy squash the dot flat for one frame at each
 * contact and stretch it along the fall in the frame before; contact is true on a landing frame.
 */
export function hop(t, t0, { from, to, height = 20, duration = 0.45, bounces = 0, restitution = 0.55, squash = 0.25, frame = 1 / 30 } = {}) {
  const rest = { x: to[0], y: to[1], sx: 1, sy: 1, contact: false, done: true };
  if (t < t0) return { x: from[0], y: from[1], sx: 1, sy: 1, contact: false, done: false };
  const lands = [t0 + duration];
  for (let k = 1; k <= bounces; k++) lands.push(lands[k - 1] + duration * restitution ** k);
  const end = lands[lands.length - 1];
  const contact = lands.some((l) => t >= l && t < l + frame);
  const before = lands.some((l) => t >= l - frame && t < l);
  const shape = contact ? { sx: 1 + squash, sy: 1 - squash } : before ? { sx: 1 - squash * 0.4, sy: 1 + squash * 0.6 } : { sx: 1, sy: 1 };
  if (t >= end) return { ...rest, ...shape, contact, done: !contact };
  if (t < lands[0]) {
    const p = (t - t0) / duration;
    return { x: lerp(from[0], to[0], p), y: lerp(from[1], to[1], p) - 4 * height * p * (1 - p), ...shape, contact, done: false };
  }
  const k = lands.findIndex((l) => t < l); // in bounce k (1-based)
  const d = duration * restitution ** k;
  const p = (t - lands[k - 1]) / d;
  return { x: to[0], y: to[1] - 4 * height * restitution ** (2 * k) * p * (1 - p), ...shape, contact, done: false };
}

/** Delay for the i-th item of a staggered group. */
export const stagger = (i, each, from = 0) => from + i * each;

/** In → hold → out envelope: 0..1..0 with eased edges. */
export function envelope(t, start, end, fadeIn = 0.3, fadeOut = 0.3, ease = cubicOut) {
  if (t < start || t > end) return 0;
  const e = easing(ease);
  const a = fadeIn > 0 ? e(progress(t, start, fadeIn)) : 1;
  const b = fadeOut > 0 ? e(progress(end - t, 0, fadeOut)) : 1;
  return Math.min(a, b);
}

/** Smooth periodic wobble: sin wave in [-1, 1] with period in seconds. */
export const wave = (t, period = 1, phase = 0) => Math.sin(((t / period) + phase) * Math.PI * 2);

// ── Colour ────────────────────────────────────────────────────────────────
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex, a = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
export function mixColor(a, b, p) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(lerp(v, cb[i], clamp(p))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
