// The one door into the copied engine (src/, engine/): give it a composition, get an MP4 or stills.
import path from 'node:path';
import { normalizeComposition } from '../../src/composition.js';
import { renderComposition, defaultConcurrency } from '../../src/renderer.js';
import { closeBrowser } from '../../src/browser.js';
import { probe } from '../../src/ffmpeg.js';
import { REPO_ROOT } from '../../src/paths.js';
import { log } from '../../src/log.js';

export { closeBrowser, probe, REPO_ROOT };

/** Encoder settings every clip shares: small files (a 45 s clip stays well under 10 MB), web-streamable. */
export const OUTPUT = { crf: 23, preset: 'medium', maxBitrate: '1400k', audioBitrate: '96k', frameFormat: 'jpeg', loudness: { lufs: -16, truePeak: -1.5 } };

/**
 * Render a composition to `out` (.mp4), or stills when `still` is a list of seconds (out-01.png, ...).
 * Returns { out, seconds, frames, duration, bytes? }.
 */
export async function render(composition, { out, still, quiet = false } = {}) {
  log.setLevel(quiet ? 'quiet' : 'info');
  const norm = await normalizeComposition(composition, { baseDir: REPO_ROOT });
  const result = await renderComposition(norm, { out: path.resolve(out), still, concurrency: defaultConcurrency(), label: path.basename(out) });
  return { ...result, duration: norm.duration };
}
