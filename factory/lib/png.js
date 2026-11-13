// Just enough PNG reading to check the cast's art: size, whether it has an alpha channel, and how much of it is
// see-through. No dependencies (zlib is part of Node).
import fs from 'node:fs';
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** { width, height, bitDepth, colorType, interlace, hasAlpha } or throws with a plain reason. */
export function pngInfo(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG file (wrong file type, or a JPEG renamed to .png)');
  const info = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bitDepth: buf[24], colorType: buf[25], interlace: buf[28] };
  info.hasAlpha = info.colorType === 6 || info.colorType === 4;
  return { ...info, buf };
}

/**
 * Alpha facts for an 8-bit RGBA PNG: { transparent, opaque (fractions of all pixels), corners: [a, a, a, a] }.
 * Returns null when the file has no alpha channel. Throws for PNG flavours the engine's art should not use.
 */
export function pngAlpha(file) {
  const { width: w, height: h, bitDepth, colorType, interlace, buf } = pngInfo(file);
  if (colorType !== 6) return null;
  if (bitDepth !== 8 || interlace !== 0) throw new Error('save it as a plain 8-bit RGBA PNG (not 16-bit, not interlaced)');
  const parts = [];
  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    if (type === 'IDAT') parts.push(buf.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = w * 4;
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? px[o + x - 4] : 0;
      const b = y > 0 ? px[o + x - stride] : 0;
      const c = x >= 4 && y > 0 ? px[o + x - stride - 4] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[o + x] = v & 255;
    }
  }
  let transparent = 0, opaque = 0;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] === 0) transparent++;
    else if (px[i] === 255) opaque++;
  }
  const at = (x, y) => px[(y * w + x) * 4 + 3];
  return { transparent: transparent / (w * h), opaque: opaque / (w * h), corners: [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)] };
}
