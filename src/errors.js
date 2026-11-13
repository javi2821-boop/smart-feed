// Error types and process exit codes. A nightly job keys off these, so they are
// part of the public contract: never renumber, only add.

export const EXIT = Object.freeze({
  OK: 0,
  UNEXPECTED: 1,     // bug or unclassified failure
  USAGE: 2,          // bad CLI arguments
  INVALID_INPUT: 3,  // inputs / composition / manifest failed validation
  MISSING_ASSET: 4,  // a referenced file (inputs, scene, image, audio, game) does not exist
  RENDER_FAILED: 5,  // a scene threw, the browser crashed, a frame timed out, capture failed
  ENCODE_FAILED: 6,  // ffmpeg missing or failed, output verification failed
  BATCH_FAILED: 7,   // manifest finished but one or more jobs failed
  INTERRUPTED: 130,  // SIGINT / SIGTERM
});

const NAMES = Object.fromEntries(Object.entries(EXIT).map(([k, v]) => [v, k]));

export class RenderError extends Error {
  /**
   * @param {number} code  one of EXIT
   * @param {string} message  one line, human readable, says what failed
   * @param {object} [opts]
   * @param {string} [opts.hint]  one line, says what to do about it
   * @param {string[]} [opts.details]  extra lines (e.g. every validation problem)
   * @param {Error} [opts.cause]
   */
  constructor(code, message, { hint, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RenderError';
    this.code = code;
    this.hint = hint;
    this.details = details || [];
  }

  get codeName() {
    return NAMES[this.code] || 'UNKNOWN';
  }
}

export const usageError = (msg, opts) => new RenderError(EXIT.USAGE, msg, opts);
export const inputError = (msg, opts) => new RenderError(EXIT.INVALID_INPUT, msg, opts);
export const assetError = (msg, opts) => new RenderError(EXIT.MISSING_ASSET, msg, opts);
export const renderFailed = (msg, opts) => new RenderError(EXIT.RENDER_FAILED, msg, opts);
export const encodeFailed = (msg, opts) => new RenderError(EXIT.ENCODE_FAILED, msg, opts);

/** Normalise anything thrown into a RenderError. */
export function toRenderError(err) {
  if (err instanceof RenderError) return err;
  if (err && err.code === 'ENOENT') {
    return assetError(`File not found: ${err.path || err.message}`, { cause: err });
  }
  const e = new RenderError(EXIT.UNEXPECTED, err?.message || String(err), { cause: err });
  e.stack = err?.stack;
  return e;
}

/** Multi-line, readable description used by the CLI and batch reports. */
export function formatError(err, { verbose = false } = {}) {
  const e = toRenderError(err);
  const lines = [`error[${e.codeName} exit=${e.code}]: ${e.message}`];
  for (const d of e.details) lines.push(`  - ${d}`);
  if (e.hint) lines.push(`  hint: ${e.hint}`);
  if (verbose && (e.cause?.stack || e.stack)) lines.push('', e.cause?.stack || e.stack);
  return lines.join('\n');
}
