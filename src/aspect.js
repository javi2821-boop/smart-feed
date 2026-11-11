import { inputError } from './errors.js';

export const ASPECTS = ['9:16', '4:5', '1:1', '16:9', '4:3', '3:4', '2:3'];

/**
 * Resolve an aspect ratio to pixel dimensions. The short side is `resolution`
 * (default 1080). Both dimensions are rounded to even numbers (required by
 * yuv420p H.264).
 */
export function resolveSize({ aspect, width, height, resolution = 1080 } = {}) {
  if (width && height) {
    if (width % 2 || height % 2) throw inputError(`width and height must be even numbers (got ${width}x${height})`);
    return { width, height, aspect: aspect || `${width}:${height}` };
  }
  const a = aspect || '9:16';
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(String(a));
  if (!m) throw inputError(`aspect must look like "9:16", "4:5" or "1:1" (got ${JSON.stringify(a)})`);
  const rw = Number(m[1]);
  const rh = Number(m[2]);
  if (!rw || !rh) throw inputError(`aspect ratio parts must be positive (got ${a})`);
  const even = (v) => Math.round(v / 2) * 2;
  const short = resolution;
  const w = rw <= rh ? short : even((short * rw) / rh);
  const h = rw <= rh ? even((short * rh) / rw) : short;
  if (w > 4096 || h > 4096) throw inputError(`resolved size ${w}x${h} is too large (max 4096 per side)`);
  return { width: w, height: h, aspect: a };
}
