// Seeded randomness. Never use Math.random() in a scene: use ctx.rng (already
// seeded per scene) or createRng(seed).

/** 32-bit string hash (cyrb53-style), stable across platforms. */
export function hashString(str) {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** mulberry32 PRNG. Returns a function in [0, 1) with helpers attached. */
export function createRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = (lo, hi) => Math.floor(rng.range(lo, hi + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.sign = () => (rng() < 0.5 ? -1 : 1);
  rng.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  /** Independent child stream, e.g. rng.fork('particles'). */
  rng.fork = (label) => createRng(`${seed}::${label}`);
  return rng;
}

/**
 * Stateless value noise in [0, 1) for (i, j, seed). Use this when a value must
 * be random-looking yet recomputable at any t without keeping state.
 */
export function hashNoise(i, j = 0, seed = 0) {
  return hashString(`${seed}|${i}|${j}`) / 4294967296;
}
