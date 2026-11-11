// Photo shot planning: how each photo is framed and how it moves. Pure
// functions shared by the photo-story template (Node, at build time), the
// photo-reel scene (browser, every frame) and the tests.
//
// Coordinates: a crop is { x, y, w, h } in fractions of the photo (0..1).
// Frame boxes are fractions of the video frame. Faces are photo fractions.
//
// Three ways to show a photo:
//   full    fills the frame; a slow pan/zoom (Ken Burns) between two crops
//           that both keep every face inside the frame and clear of captions
//   matted  the whole photo as a print over a soft blurred copy of itself:
//           used when a crop would cut people off (a group across a wide photo
//           in a vertical video) or the photo is too small to fill the frame
//   pair    two matted photos of the "wrong" orientation share the frame
//           (two landscapes stacked in 9:16, two portraits side by side in 16:9)

import { createRng } from './rng.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, p) => a + (b - a) * p;

/** Largest crop of the frame's aspect that fits in the photo (fractions of the photo). */
export function coverCrop(photo, frame) {
  const A = frame.width / frame.height;
  const a = photo.width / photo.height;
  return a > A ? { w: A / a, h: 1 } : { w: 1, h: a / A };
}

/** Share of the photo's long axis that a full-frame crop keeps (1 = same shape). */
export const keepRatio = (photo, frame) => {
  const A = frame.width / frame.height;
  const a = photo.width / photo.height;
  return Math.min(A / a, a / A);
};

/** Photo pixels per frame pixel for the cover crop (below 1 means upscaling). */
export function coverDensity(photo, frame) {
  const c = coverCrop(photo, frame);
  return (c.w * photo.width) / frame.width;
}

/**
 * Union of the faces, padded for hair, chin and shoulders so a crop never
 * slices through a head. Returns null when there are no faces.
 */
export function faceUnion(faces, { pad = true } = {}) {
  if (!faces?.length) return null;
  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  for (const f of faces) {
    const px = pad ? f.w * 0.3 : 0;
    x0 = Math.min(x0, f.x - px);
    x1 = Math.max(x1, f.x + f.w + px);
    y0 = Math.min(y0, f.y - (pad ? f.h * 0.45 : 0));
    y1 = Math.max(y1, f.y + f.h + (pad ? f.h * 0.3 : 0));
  }
  x0 = clamp(x0, 0, 1);
  y0 = clamp(y0, 0, 1);
  x1 = clamp(x1, 0, 1);
  y1 = clamp(y1, 0, 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Caption bands (fractions of the frame height). In tall formats the bottom
 * ~15 % is covered by the app's buttons and text on Reels/TikTok, so the
 * caption sits above it.
 */
export function captionBands(frame) {
  const tall = frame.height / frame.width >= 1.5;
  const wide = frame.width / frame.height > 1.2;
  if (tall) return { bottom: { y0: 0.64, y1: 0.84 }, top: { y0: 0.1, y1: 0.28 } };
  if (wide) return { bottom: { y0: 0.7, y1: 0.93 }, top: { y0: 0.06, y1: 0.28 } };
  return { bottom: { y0: 0.72, y1: 0.93 }, top: { y0: 0.06, y1: 0.25 } };
}

/**
 * The range of positions for the crop's start edge along one axis.
 *   len       crop length (fraction of the photo)
 *   t0, t1    padded faces: kept m0/m1 away from the crop edges where the
 *             photo allows (relaxed only when the photo itself ends there)
 *   r0, r1    raw faces: always fully inside, and h0/h1 away from the edges
 *             (the caption band: never relaxed)
 * Returns [lo, hi] or null when no position satisfies everything.
 */
function axisRange(len, t0, t1, r0, r1, m0, m1, h0, h1) {
  const max = 1 - len;
  let lo = clamp(t1 - len * (1 - m1), 0, max);
  let hi = clamp(t0 - len * m0, 0, max);
  if (lo > hi + 1e-9) return null; // padded faces don't fit in this crop
  lo = Math.max(lo, r1 - len * (1 - h1));
  hi = Math.min(hi, r0 - len * h0);
  return lo <= hi + 1e-9 ? [lo, Math.max(lo, hi)] : null;
}

function positions(size, target, raw, safe) {
  if (!target) return { x: [0, 1 - size.w], y: [0, 1 - size.h] };
  const x = axisRange(size.w, target.x, target.x + target.w, raw.x, raw.x + raw.w, safe.l, safe.r, 0, 0);
  const y = axisRange(size.h, target.y, target.y + target.h, raw.y, raw.y + raw.h, safe.t, safe.b, safe.hardT, safe.hardB);
  return x && y ? { x, y } : null;
}

/**
 * Plan a full-frame Ken Burns move for one photo, or null if no crop can keep
 * its faces in frame (and clear of the caption).
 *   captionAt  'bottom' | 'top' | null
 *   reserve    extra frame fraction to keep faces out of at the bottom (title overlay)
 */
export function planFull(photo, frame, { captionAt = null, reserve = 0, zoom = 1.14, maxZoom = 1.35, move = 'in', rng = createRng('plan'), bands = captionBands(frame) } = {}) {
  const cover = coverCrop(photo, frame);
  const faces = photo.faces || [];
  const focusFace = photo.focus ? [{ x: photo.focus.x - 0.05, y: photo.focus.y - 0.05, w: 0.1, h: 0.1 }] : [];
  const all = faces.length ? faces : focusFace;
  const target = faceUnion(all);
  const raw = faceUnion(all, { pad: false });
  const edge = 0.04;
  const safe = { l: edge, r: edge, t: edge, b: edge, hardT: 0, hardB: 0 };
  if (captionAt === 'bottom') safe.b = safe.hardB = 1 - bands.bottom.y0 + 0.02;
  if (captionAt === 'top') safe.t = safe.hardT = bands.top.y1 + 0.02;
  if (reserve) safe.b = safe.hardB = Math.max(safe.hardB, reserve);

  // zoom limits: never past the photo's resolution, never beyond maxZoom
  const density = (cover.w * photo.width) / frame.width;
  const zCap = Math.max(1, Math.min(maxZoom, density * 1.04));
  const at = (z) => {
    const size = { w: cover.w / z, h: cover.h / z };
    const pos = positions(size, target, raw, safe);
    return pos ? { size, pos } : null;
  };
  if (!at(1)) return null;
  let zMax = 1;
  for (let z = 1; z <= zCap + 1e-9; z += 0.005) {
    if (at(z)) zMax = z;
    else break;
  }

  // centre of interest: the faces, else the focus point, else a little above centre
  const cx = target ? target.x + target.w / 2 : 0.5;
  const cy = target ? target.y + target.h * 0.45 : 0.45;
  const place = (z, dx = 0, dy = 0) => {
    const { size, pos } = at(z);
    const x = clamp(cx - size.w / 2 + dx * size.w, pos.x[0], pos.x[1]);
    const y = clamp(cy - size.h / 2 + dy * size.h, pos.y[0], pos.y[1]);
    return { x, y, w: size.w, h: size.h };
  };

  const zHi = Math.min(zMax, zoom);
  const zLo = 1;
  let from;
  let to;
  // free travel along each axis at the wide end, as a fraction of the crop
  const wide = at(zLo);
  const freeX = (wide.pos.x[1] - wide.pos.x[0]) / wide.size.w;
  const freeY = (wide.pos.y[1] - wide.pos.y[0]) / wide.size.h;
  let kind = move;
  if (zHi - zLo < 0.03) kind = 'pan';
  if (kind === 'pan' && Math.max(freeX, freeY) < 0.06 && zHi - zLo >= 0.03) kind = 'in';

  if (kind === 'pan') {
    // drift across the photo at a gentle speed (≤ 16 % of the frame per shot)
    const z = Math.min(zHi, 1 + (zHi - 1) * 0.5);
    const along = freeX >= freeY ? 'x' : 'y';
    const s = rng() < 0.5 ? -1 : 1;
    const d = 0.08;
    from = along === 'x' ? place(z, -d * s, 0) : place(z, 0, -d * s);
    to = along === 'x' ? place(z, d * s, 0) : place(z, 0, d * s);
  } else {
    // zoom toward (or away from) the faces with a slight sideways drift
    const drift = (rng() - 0.5) * 0.12;
    const wideCrop = place(zLo, drift, 0);
    const tightCrop = place(zHi, 0, 0);
    [from, to] = kind === 'out' ? [tightCrop, wideCrop] : [wideCrop, tightCrop];
  }
  return { kind: 'full', from: roundCrop(from), to: roundCrop(to), motion: kind, zoom: [+(cover.w / from.w).toFixed(4), +(cover.w / to.w).toFixed(4)] };
}

const r5 = (v) => Math.round(v * 1e5) / 1e5;
const roundCrop = (c) => {
  const w = r5(c.w);
  const h = r5(c.h);
  return { x: Math.max(0, Math.min(r5(c.x), r5(1 - w))), y: Math.max(0, Math.min(r5(c.y), r5(1 - h))), w, h };
};

/**
 * The crop at progress p (0..1). Centre and size interpolate linearly, so
 * every intermediate crop also contains the faces (the constraints are convex).
 */
export function cropAt(shot, p) {
  const e = 0.72 * p + 0.28 * (0.5 - Math.cos(Math.PI * p) / 2); // gentle ease, never fully stops
  return {
    x: lerp(shot.from.x, shot.to.x, e),
    y: lerp(shot.from.y, shot.to.y, e),
    w: lerp(shot.from.w, shot.to.w, e),
    h: lerp(shot.from.h, shot.to.h, e),
  };
}

/** Area available for prints: frame minus margins, minus the caption band. */
function printArea(frame, captionAt, bands, reserve = 0) {
  const tall = frame.height / frame.width >= 1.5;
  const mx = tall ? 0.07 : 0.06;
  let y0 = tall ? 0.08 : 0.07;
  let y1 = tall ? 0.9 : 0.93;
  if (captionAt === 'bottom') y1 = Math.min(y1, bands.bottom.y0 - 0.025);
  if (captionAt === 'top') y0 = Math.max(y0, bands.top.y1 + 0.025);
  if (reserve) y1 = Math.min(y1, 1 - reserve - 0.02);
  return { x: mx, y: y0, w: 1 - 2 * mx, h: y1 - y0 };
}

function containIn(area, aspect, frame) {
  // area in frame fractions; aspect = photo w/h in pixels
  const aw = area.w * frame.width;
  const ah = area.h * frame.height;
  let w = aw;
  let h = w / aspect;
  if (h > ah) {
    h = ah;
    w = h * aspect;
  }
  return { x: r5(area.x + (area.w - w / frame.width) / 2), y: r5(area.y + (area.h - h / frame.height) / 2), w: r5(w / frame.width), h: r5(h / frame.height) };
}

export function planMatted(photo, frame, { captionAt = null, reserve = 0, bands = captionBands(frame), zoom = 1.04 } = {}) {
  const box = containIn(printArea(frame, captionAt, bands, reserve), photo.width / photo.height, frame);
  const u = faceUnion(photo.faces);
  const origin = u ? { x: r5(u.x + u.w / 2), y: r5(u.y + u.h / 2) } : { x: 0.5, y: 0.5 };
  return { kind: 'matted', box, origin, zoom: [1, zoom] };
}

export function planPair(a, b, frame, { captionAt = null, bands = captionBands(frame), rng = createRng('pair') } = {}) {
  const area = printArea(frame, captionAt, bands);
  const tall = frame.height >= frame.width;
  const gap = 0.035;
  const halves = tall
    ? [{ ...area, h: (area.h - gap) / 2 }, { ...area, y: area.y + (area.h + gap) / 2, h: (area.h - gap) / 2 }]
    : [{ ...area, w: (area.w - gap) / 2 }, { ...area, x: area.x + (area.w + gap) / 2, w: (area.w - gap) / 2 }];
  const boxes = [containIn(halves[0], a.width / a.height, frame), containIn(halves[1], b.width / b.height, frame)];
  const tilt = 0.6 + rng() * 0.8;
  return { kind: 'pair', boxes, rotate: [r5(-tilt), r5(tilt * 0.8)] };
}

/**
 * Decide how every photo is shown, in order.
 * photos: [{ width, height, faces, caption?, label?, fit?: 'auto'|'full'|'matted', focus? }]
 * opts:
 *   frame        { width, height } in pixels
 *   zoom         Ken Burns zoom ratio per shot (1.08 calm … 1.18 lively)
 *   pairs        allow pairing two mismatched photos
 *   titleReserve frame fraction at the bottom of the first shot kept clear for a title
 *   seed
 */
export function planShots(photos, { frame, zoom = 1.14, pairs = true, titleReserve = 0, seed = 'photos' } = {}) {
  const rng = createRng(`${seed}:plan`);
  const bands = captionBands(frame);
  const tallFrame = frame.height / frame.width > 1.05;
  const wideFrame = frame.width / frame.height > 1.05;
  const moves = ['in', 'out', 'in', 'pan', 'out', 'in', 'pan', 'out'];
  const singles = photos.map((photo, i) => {
    const reserve = i === 0 ? titleReserve : 0;
    const hasText = !!(photo.caption || photo.label);
    const keep = keepRatio(photo, frame);
    const density = coverDensity(photo, frame);
    const faces = photo.faces?.length || 0;
    const move = moves[(i + Math.floor(rng() * 2)) % moves.length];
    const base = { photo: i, caption: photo.caption || null, label: photo.label || null };
    const tryFull = () => {
      for (const captionAt of hasText ? ['bottom', 'top'] : [null]) {
        const f = planFull(photo, frame, { captionAt, reserve, zoom, move, rng, bands });
        if (f) return { ...base, ...f, captionAt };
      }
      return null;
    };
    const matted = (why) => ({ ...base, ...planMatted(photo, frame, { captionAt: hasText ? 'bottom' : null, reserve, bands }), captionAt: hasText ? 'bottom' : null, why });

    if (photo.fit === 'matted') return matted('requested');
    if (photo.fit === 'full') return tryFull() || matted('faces would be cut off');
    if (density < 0.85) return matted('too small to fill the frame');
    if (keep >= 0.72 || faces || photo.focus) {
      // mild crop, or faces that can all stay in frame
      if (keep >= 0.45 || faces || photo.focus) {
        const f = tryFull();
        if (f) return f;
      }
      return matted(faces ? 'faces would be cut off' : 'crop would lose too much');
    }
    if (keep >= 0.45) return tryFull() || matted('crop would lose too much');
    return matted('shape too different from the frame');
  });

  if (!pairs) return singles;
  // pair consecutive matted photos of the frame's opposite orientation (never the title shot)
  const out = [];
  for (let i = 0; i < singles.length; i++) {
    const a = singles[i];
    const b = singles[i + 1];
    const pa = photos[i];
    const pb = photos[i + 1];
    const mismatched = (p) => (tallFrame ? p.width / p.height > 1.1 : wideFrame ? p.width / p.height < 0.9 : false);
    const quiet = (s) => !s.caption && !s.label;
    if (i > 0 && b && a.kind === 'matted' && b.kind === 'matted' && a.why !== 'requested' && b.why !== 'requested' && mismatched(pa) && mismatched(pb) && quiet(a) && quiet(b)) {
      out.push({ ...planPair(pa, pb, frame, { rng, bands }), photos: [i, i + 1], caption: null, label: null, captionAt: null });
      i++;
      continue;
    }
    out.push({ ...a, photos: [i] });
  }
  return out.map(({ photo, why, ...s }) => (s.photos ? s : { ...s, photos: [photo] }));
}

/**
 * Timing: each shot gets a duration (seconds on screen, crossfades included);
 * consecutive shots overlap by `crossfade`. Captions extend a shot so they can
 * be read (about 2.6 words a second, plus a beat).
 */
export function timeShots(shots, { perShot = 3.6, crossfade = 1, first = 0, pairFactor = 1.4, minShot = 2.4, maxShot = 9, readRate = 2.6 } = {}) {
  let t = 0;
  return shots.map((s, i) => {
    const words = `${s.caption || ''} ${s.label || ''}`.trim().split(/\s+/).filter(Boolean).length;
    let d = perShot * (s.kind === 'pair' ? pairFactor : 1);
    if (words) d = Math.max(d, 1.4 + words / readRate + crossfade);
    if (i === 0 && first) d = Math.max(d, first);
    d = Math.round(clamp(d, minShot, Math.max(maxShot, first)) * 100) / 100;
    const start = Math.round(t * 1000) / 1000;
    t = start + d - crossfade;
    return { ...s, start, duration: d };
  });
}

/** Total reel length for timed shots. */
export const reelDuration = (timed) => (timed.length ? timed[timed.length - 1].start + timed[timed.length - 1].duration : 0);
