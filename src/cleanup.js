// Cleanup registry so Ctrl-C / SIGTERM (e.g. a cancelled CI job) kills ffmpeg,
// closes Chromium and removes partial output files before exiting.
const handlers = new Set();

/** Register a cleanup; returns a function that unregisters it. */
export function onCleanup(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

export async function runCleanups() {
  const list = [...handlers];
  handlers.clear();
  await Promise.allSettled(list.map((fn) => fn()));
}
