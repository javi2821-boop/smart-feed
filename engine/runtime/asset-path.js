// Shared by Node and the browser: native paths must stay on the render origin,
// including Windows drive/UNC paths and filenames containing URL delimiters.
export const encodeAssetPath = (p) => encodeURI(p).replace(/[?#'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function fsUrl(abs) {
  const p = abs.replace(/\\/g, '/');
  return `/@fs${p.startsWith('/') ? '' : '/'}${encodeAssetPath(p)}`;
}

export function resolveAsset(p, baseUrl, origin) {
  if (!p || /^(https?:|data:|blob:|\/@)/.test(p)) return p;
  if (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\')) return fsUrl(p);
  return new URL(encodeAssetPath(p.replace(/\\/g, '/')), `${origin}${baseUrl}`).pathname;
}
