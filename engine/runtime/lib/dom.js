// Tiny DOM/SVG helpers for scenes. They don't touch the DOM at import time, so
// Node can import this module (for listing scenes, validation) without a browser.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * el('div', { class: 'x', style: { left: '10px' }, text: 'hi', attrs: {...} }, parent)
 */
export function el(tag, opts = {}, parent) {
  const node = document.createElement(tag);
  applyOpts(node, opts);
  if (parent) parent.appendChild(node);
  return node;
}

/** svg('line', { x1: 0, y1: 0, x2: 10, y2: 10, stroke: '#fff' }, parent) */
export function svg(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
}

function applyOpts(node, opts) {
  if (typeof opts === 'string') opts = { class: opts };
  const { class: cls, style, text, html, attrs } = opts;
  if (cls) node.className = cls;
  if (style) Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  if (html !== undefined) node.innerHTML = html;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
}

const ZERO_INSET = /^inset\(\s*(?:-?0(?:\.0+)?%?(?:px)?\s*){1,4}\)$/;

/**
 * Canonicalise values that look the same but render through different paths.
 * A finished reveal left at `inset(0 0.00% 0 0)` or opacity 0.99997 keeps a
 * clip/effect node alive, and Chromium's raster output then depends on which
 * frames were drawn before. That breaks parallel rendering determinism.
 */
function canonical(k, v) {
  if (k === 'clipPath' && typeof v === 'string' && ZERO_INSET.test(v)) return 'none';
  if (k === 'opacity') {
    const n = Number(v);
    if (Number.isFinite(n)) return n >= 0.999 ? '1' : n <= 0.001 ? '0' : String(Math.round(n * 1000) / 1000);
  }
  return v;
}

/**
 * Set style properties, skipping writes whose value hasn't changed since the
 * last call. Scenes call this every frame; skipping no-op writes keeps style
 * recalculation cheap. Values are canonicalised (see above).
 */
export function setStyle(node, styles) {
  const cache = node.__rmStyle || (node.__rmStyle = {});
  for (const k in styles) {
    const v = canonical(k, styles[k]);
    if (cache[k] !== v) {
      cache[k] = v;
      if (k.startsWith('--')) node.style.setProperty(k, v);
      else node.style[k] = v;
    }
  }
}

/** Set SVG/DOM attributes with the same no-op skipping. */
export function setAttrs(node, attrs) {
  const cache = node.__rmAttr || (node.__rmAttr = {});
  for (const k in attrs) {
    const v = attrs[k];
    if (cache[k] !== v) {
      cache[k] = v;
      node.setAttribute(k, v);
    }
  }
}

/** Fixed-precision number for style strings (avoids 1e-7 style noise). */
export const px = (v, digits = 2) => `${round(v, digits)}px`;
export const round = (v, digits = 2) => {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
};

/**
 * Stroke-draw an SVG path/line/polyline: p = 0 hidden, 1 fully drawn.
 * Call measureStroke(node) once in setup, then drawStroke(node, p) per frame.
 */
export function measureStroke(node) {
  const len = node.getTotalLength ? node.getTotalLength() : 0;
  node.__rmLen = len;
  setAttrs(node, { 'stroke-dasharray': `${len} ${len}` });
  return len;
}
export function drawStroke(node, p) {
  const len = node.__rmLen ?? measureStroke(node);
  // hidden at p = 0: a zero-length dash would still paint round/square line caps
  setAttrs(node, { 'stroke-dashoffset': String(round(len * (1 - Math.max(0, Math.min(1, p))), 2)), visibility: p <= 0 ? 'hidden' : 'visible' });
}

/** Load an image and resolve once it's decoded (throws a readable error on failure). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'sync';
    img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}
