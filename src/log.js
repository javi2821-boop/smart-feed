// Logging goes to stderr so stdout stays clean for --json output.
const levels = { quiet: 0, info: 1, debug: 2 };
let level = levels.info;
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s`;

export const log = {
  setLevel(name) {
    level = levels[name] ?? levels.info;
  },
  info(...a) {
    if (level >= levels.info) process.stderr.write(`${stamp()}  ${a.join(' ')}\n`);
  },
  warn(...a) {
    process.stderr.write(`${stamp()}  warning: ${a.join(' ')}\n`);
  },
  debug(...a) {
    if (level >= levels.debug) process.stderr.write(`${stamp()}  [debug] ${a.join(' ')}\n`);
  },
  /** Single-line progress (overwritten in a TTY, throttled lines otherwise). */
  progress(label, done, total) {
    if (level < levels.info) return;
    const pct = Math.floor((done / total) * 100);
    if (process.stderr.isTTY) {
      process.stderr.write(`\r${stamp()}  ${label} ${done}/${total} (${pct}%)${done === total ? '\n' : ''}`);
    } else if (done === total || done % Math.max(1, Math.round(total / 5)) === 0) {
      process.stderr.write(`${stamp()}  ${label} ${done}/${total} (${pct}%)\n`);
    }
  },
};
