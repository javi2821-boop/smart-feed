// The factory. Turns every script in scripts/inbox into a clip.
//
//   node factory/run.js                 process scripts/inbox (what the GitHub workflow runs)
//   node factory/run.js --check         only check the scripts' format; nothing is rendered or moved
//   node factory/run.js --format        check the format and move the wrong ones to scripts/failed (the workflow's fast first step)
//   node factory/run.js --try <file.md> [--stills]   render one script to out/try/ without touching the feed
//
// For each script: check the format → narration (Kokoro) → render → check the MP4 → add it to feed/feed.json →
// move the script to scripts/done. A script that fails at any step moves to scripts/failed with a note beside it
// saying why (<name>.why.txt). One bad script never stops the others.
// Exit code: 0 when every script made a clip, 1 when at least one failed (after all the others were handled).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../src/paths.js';
import { parseScript } from './lib/script.js';
import { loadCast } from './lib/cast.js';

// The renderer (Chromium) and the voice step load only when a script has passed the format check, so
// `--format` runs on a bare runner in a second, before anything is installed.
let heavy = null;
async function tools() {
  heavy ??= {
    ...(await import('./lib/render.js')),
    ...(await import('./lib/voice.js')),
    ...(await import('./lib/compose.js')),
    ...(await import('../src/inspect.js')),
    ffmpeg: await import('../src/ffmpeg.js'),
  };
  return heavy;
}
const closeBrowser = async () => { if (heavy) await heavy.closeBrowser(); };

export const LIMITS = { minSeconds: 35, maxSeconds: 45, maxBytes: 10 * 1024 * 1024 };
const rel = (p) => path.relative(REPO_ROOT, p).split(path.sep).join('/');
const INBOX = path.join(REPO_ROOT, 'scripts/inbox');
const DONE = path.join(REPO_ROOT, 'scripts/done');
const FAILED = path.join(REPO_ROOT, 'scripts/failed');
const CLIPS = path.join(REPO_ROOT, 'clips');
const FEED = path.join(REPO_ROOT, 'feed/feed.json');
const WORK = path.join(REPO_ROOT, 'out/work');

export const readFeed = () => (fs.existsSync(FEED) ? JSON.parse(fs.readFileSync(FEED, 'utf8')) : { clips: [] });
const writeFeed = (feed) => fs.writeFileSync(FEED, JSON.stringify(feed, null, 2) + '\n');

function known() {
  const { characters, backgrounds } = loadCast(REPO_ROOT);
  return { characters: characters.map((c) => c.name), backgrounds: backgrounds.map((b) => b.name) };
}

class ScriptError extends Error {
  constructor(step, lines) {
    super(lines[0]);
    this.step = step;
    this.lines = lines;
  }
}

/** One script file → one MP4 (+ poster). Throws ScriptError with a plain reason. */
export async function buildClip(file, { outDir = CLIPS, taken = [], stills = false } = {}) {
  const name = path.basename(file);
  const t0 = Date.now();
  const parsed = parseScript(fs.readFileSync(file, 'utf8'), known(), name);
  if (!parsed.ok) throw new ScriptError('format', parsed.errors);
  const script = parsed.script;
  if (taken.includes(script.id)) throw new ScriptError('format', [`A clip named "${script.id}" is already on the feed. Give this script a different file name.`]);

  const { narrate, frameLevels, composeClip, FPS, render, probe, ffmpeg: ff } = await tools();
  const wav = path.join(WORK, `${script.id}.wav`);
  let voice;
  try {
    voice = narrate(script.narration, wav, { type: script.type });
  } catch (e) {
    throw new ScriptError('voice', [e.message]);
  }
  const tVoice = Date.now();
  const { levels, seconds } = frameLevels(wav, FPS);
  const composition = composeClip(script, { wav, seconds, levels });
  const total = composition.scenes[0].duration;
  if (total < LIMITS.minSeconds || total > LIMITS.maxSeconds) {
    const off = Math.round(Math.abs(total - 40) * 2.7);
    throw new ScriptError('length', [`The clip would be ${total.toFixed(1)} seconds, outside 35 to 45, even after adjusting the reading speed (${script.words} words). ${total < 35 ? `Add about ${off} words.` : `Cut about ${off} words.`}`]);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${script.id}.mp4`);
  const poster = path.join(outDir, `${script.id}.jpg`);
  try {
    if (stills) {
      const times = [0.4, 1.2, 2.5, 6, total * 0.5, total - 3.2, total - 1.5, total - 0.1];
      await render(composition, { out: path.join(outDir, `${script.id}.png`), still: times, quiet: true });
    }
    await render(composition, { out, quiet: true });
    const info = await probe(out);
    const bytes = fs.statSync(out).size;
    const v = info?.streams.find((s) => s.codec_type === 'video');
    const problems = [];
    if (!v || v.width !== 1080 || v.height !== 1920) problems.push(`the video is ${v?.width}x${v?.height}, not 1080x1920`);
    if (!info.streams.some((s) => s.codec_type === 'audio')) problems.push('the video has no sound');
    if (info.duration < LIMITS.minSeconds || info.duration > LIMITS.maxSeconds) problems.push(`the video is ${info.duration.toFixed(1)} s, outside 35 to 45`);
    if (bytes > LIMITS.maxBytes) problems.push(`the video is ${(bytes / 1048576).toFixed(1)} MB, over the 10 MB limit`);
    if (problems.length) throw new Error(problems.join('; '));
    const { ffmpeg } = ff.findFfmpeg();
    const p = await ff.run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '2.6', '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '5', poster]);
    if (p.code !== 0) throw new Error(`could not make the poster image: ${p.stderr.trim()}`);
    const tEnd = Date.now();
    return {
      script,
      out,
      poster,
      seconds: Math.round(info.duration * 100) / 100,
      bytes,
      voice: voice.voice,
      speed: voice.speed,
      narrationSeconds: Math.round(seconds * 100) / 100,
      took: { voice: (tVoice - t0) / 1000, render: (tEnd - tVoice) / 1000, total: (tEnd - t0) / 1000 },
    };
  } catch (e) {
    fs.rmSync(out, { force: true });
    fs.rmSync(poster, { force: true });
    if (e instanceof ScriptError) throw e;
    throw new ScriptError('render', [e.message, ...(e.details || [])]);
  }
}

const inboxFiles = () => (fs.existsSync(INBOX) ? fs.readdirSync(INBOX).filter((f) => !f.startsWith('.') && fs.statSync(path.join(INBOX, f)).isFile()).sort() : []);

/** Move a script out of the inbox; a name already used in the destination gets -2, -3, ... */
function moveScript(file, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  let dest = path.join(dir, base + ext);
  for (let n = 2; fs.existsSync(dest); n++) dest = path.join(dir, `${base}-${n}${ext}`);
  fs.renameSync(file, dest);
  return dest;
}

const REPORT = path.join(REPO_ROOT, 'out/factory-report.json');
const readReport = () => (fs.existsSync(REPORT) ? JSON.parse(fs.readFileSync(REPORT, 'utf8')) : { made: [], failed: [], started: new Date().toISOString() });

/** Move a failed script to scripts/failed and write the note that says why. */
function fail(file, step, lines, report) {
  const f = path.basename(file);
  const dest = moveScript(file, FAILED);
  const note = [
    `${path.basename(dest)} was not made into a clip.`,
    `When: ${new Date().toISOString()}`,
    `Step that failed: ${step}`,
    '',
    'Why:',
    ...lines.map((l) => `- ${l}`),
    '',
    'To try again: fix the script, then put it back in scripts/inbox (delete this note and the failed copy).',
    'The format is explained in scripts/README.md.',
    '',
  ].join('\n');
  fs.writeFileSync(`${dest}.why.txt`, note);
  report.failed.push({ file: f, step, why: lines });
  console.log(`FAILED (${step}), moved to ${rel(dest)}:`);
  for (const l of lines) console.log(`  - ${l}`);
}

function writeReport(report, feed) {
  const md = ['## Factory run', ''];
  md.push(`${report.made.length} clip${report.made.length === 1 ? '' : 's'} made, ${report.failed.length} script${report.failed.length === 1 ? '' : 's'} failed. The feed now has ${feed.clips.length} clip${feed.clips.length === 1 ? '' : 's'}.`, '');
  if (report.made.length) {
    md.push('| Clip | Type | Words | Length | Size | Voice step | Render step | Total |', '|---|---|---|---|---|---|---|---|');
    for (const m of report.made) md.push(`| ${m.id} | ${m.type} | ${m.words} | ${m.seconds} s | ${m.mb.toFixed(2)} MB | ${m.took.voice.toFixed(0)} s | ${m.took.render.toFixed(0)} s | ${m.took.total.toFixed(0)} s |`);
    md.push('');
  }
  for (const x of report.failed) md.push(`**Failed: \`${x.file}\`** (${x.step})`, ...x.why.map((l) => `- ${l}`), '');
  fs.mkdirSync(path.join(REPO_ROOT, 'out'), { recursive: true });
  fs.writeFileSync(path.join(REPO_ROOT, 'out/factory-report.md'), md.join('\n'));
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
}

/**
 * The fast first pass: check every inbox script's format and move the wrong ones to scripts/failed right away.
 * Prints how many are left to render (and writes `good=<n>` for the workflow).
 */
function formatPass() {
  const report = readReport();
  const feed = readFeed();
  const taken = feed.clips.map((c) => c.id);
  let good = 0;
  for (const f of inboxFiles()) {
    const file = path.join(INBOX, f);
    const r = /\.md$/i.test(f) ? parseScript(fs.readFileSync(file, 'utf8'), known(), f) : { ok: false, errors: [`"${f}" is not a script: scripts are text files whose names end in .md.`] };
    if (r.ok && taken.includes(r.script.id)) { r.ok = false; r.errors = [`A clip named "${r.script.id}" is already on the feed. Give this script a different file name.`]; }
    if (r.ok) { good++; taken.push(r.script.id); console.log(`ok     ${f} (${r.script.type}, ${r.script.words} words)`); }
    else { console.log(`\n── ${f}`); fail(file, 'format', r.errors, report); }
  }
  writeReport(report, feed);
  console.log(`\n${good} script${good === 1 ? '' : 's'} ready to render, ${report.failed.length} failed the format check.`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `good=${good}\nfailed=${report.failed.length}\n`);
  return 0;
}

async function runInbox() {
  const files = inboxFiles();
  const report = readReport();
  if (!files.length) console.log('The inbox is empty. Nothing to do.');
  const feed = readFeed();
  for (const f of files) {
    const file = path.join(INBOX, f);
    console.log(`\n── ${f}`);
    try {
      if (!/\.md$/i.test(f)) throw new ScriptError('format', [`"${f}" is not a script: scripts are text files whose names end in .md.`]);
      const r = await buildClip(file, { taken: feed.clips.map((c) => c.id) });
      feed.clips.push({
        id: r.script.id,
        type: r.script.type,
        title: r.script.title,
        source: r.script.source,
        character: r.script.character,
        background: r.script.background,
        file: `clips/${r.script.id}.mp4`,
        poster: `clips/${r.script.id}.jpg`,
        seconds: r.seconds,
        bytes: r.bytes,
        added: new Date().toISOString(),
      });
      writeFeed(feed);
      moveScript(file, DONE);
      report.made.push({ file: f, id: r.script.id, type: r.script.type, seconds: r.seconds, mb: r.bytes / 1048576, words: r.script.words, speed: r.speed, took: r.took });
      console.log(`made clips/${r.script.id}.mp4: ${r.seconds} s, ${(r.bytes / 1048576).toFixed(2)} MB, in ${r.took.total.toFixed(0)} s (voice ${r.took.voice.toFixed(0)} s, render ${r.took.render.toFixed(0)} s)`);
    } catch (e) {
      fail(file, e instanceof ScriptError ? e.step : 'unexpected', e instanceof ScriptError ? e.lines : [`Unexpected error: ${e.message}`], report);
    }
  }
  await closeBrowser();
  writeReport(report, feed);
  console.log(`\n${report.made.length} made, ${report.failed.length} failed.`);
  return report.failed.length ? 1 : 0;
}

function checkOnly() {
  let bad = 0;
  for (const f of inboxFiles()) {
    const r = /\.md$/i.test(f) ? parseScript(fs.readFileSync(path.join(INBOX, f), 'utf8'), known(), f) : { ok: false, errors: ['not a .md file'] };
    console.log(`${r.ok ? 'ok    ' : 'WRONG '} ${f}${r.ok ? ` (${r.script.type}, ${r.script.words} words)` : ''}`);
    for (const e of r.errors) console.log(`        - ${e}`);
    if (!r.ok) bad++;
  }
  return bad ? 1 : 0;
}

async function tryOne(file, stills) {
  try {
    const r = await buildClip(path.resolve(file), { outDir: path.join(REPO_ROOT, 'out/try'), stills });
    await (await tools()).inspectVideo(r.out, { every: Math.round((r.seconds / 12) * 100) / 100 });
    console.log(`${rel(r.out)}: ${r.seconds} s, ${(r.bytes / 1048576).toFixed(2)} MB, narration ${r.narrationSeconds} s at speed ${r.speed}, took ${r.took.total.toFixed(0)} s (voice ${r.took.voice.toFixed(0)}, render ${r.took.render.toFixed(0)})`);
    return 0;
  } catch (e) {
    console.log(`FAILED${e.step ? ` (${e.step})` : ''}:`);
    for (const l of e.lines || [e.message]) console.log(`  - ${l}`);
    return 1;
  } finally {
    await closeBrowser();
  }
}

const args = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')}` || process.argv[1]?.endsWith(path.join('factory', 'run.js'))) {
  let code;
  if (args[0] === '--check') code = checkOnly();
  else if (args[0] === '--format') code = formatPass();
  else if (args[0] === '--try') code = await tryOne(args[1], args.includes('--stills'));
  else code = await runInbox();
  process.exit(code);
}
