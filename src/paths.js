import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SCENES_LIBRARY = path.join(REPO_ROOT, 'scenes', 'library');
export const SCENES_CUSTOM = path.join(REPO_ROOT, 'scenes', 'custom');
export const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');
export const THEMES_DIR = path.join(REPO_ROOT, 'themes');
export const RUNTIME_DIR = path.join(REPO_ROOT, 'engine', 'runtime');
export const CACHE_DIR = process.env.RENDER_MACHINE_CACHE || path.join(REPO_ROOT, '.cache');
export const TMP_ROOT = path.join(os.tmpdir(), 'render-machine');

/** Origin used inside the headless browser. Requests to it are served from disk; nothing listens on a port. */
export const ORIGIN = 'http://render-machine.local';
