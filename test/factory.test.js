import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { parseScript, tidy } from '../factory/lib/script.js';
import { validateCast } from '../tools/validate-cast.js';
import { loadCast } from '../factory/lib/cast.js';
import { narrationWindow, extraSeconds } from '../factory/lib/voice.js';

const known = { characters: ['philosopher', 'old-man'], backgrounds: ['study', 'city-street'] };
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ') + '.';
const make = (head, body) => `---\n${head}\n---\n${body}\n`;
const HEAD = 'type: lesson\ntitle: A title\ncharacter: philosopher\nbackground: study\nsource: Someone, Somewhere';

test('a good script parses', () => {
  const r = parseScript(make(HEAD, words(100)), known, 'a-good-one.md');
  assert.equal(r.ok, true, r.errors.join('\n'));
  assert.equal(r.script.id, 'a-good-one');
  assert.equal(r.script.words, 100);
});

test('names with spaces or capitals are accepted for character and background', () => {
  const r = parseScript(make(HEAD.replace('philosopher', 'Old Man').replace('study', 'City Street'), words(100)), known, 'x1.md');
  assert.equal(r.ok, true, r.errors.join('\n'));
  assert.equal(r.script.character, 'old-man');
  assert.equal(r.script.background, 'city-street');
});

test('every kind of mistake gets a plain reason', () => {
  const bad = (text, name, re) => {
    const r = parseScript(text, known, name);
    assert.equal(r.ok, false);
    assert.match(r.errors.join('\n'), re);
  };
  bad(words(100), 'no-header.md', /must start with a line holding only three dashes/);
  bad(`---\n${HEAD}\n${words(100)}`, 'unclosed.md', /never closed/);
  bad(make(HEAD.replace('type: lesson', 'type: sermon'), words(100)), 'x1.md', /must be one of: lesson, question, story, scripture/);
  bad(make(HEAD.replace('philosopher', 'wizard'), words(100)), 'x1.md', /no character "wizard".*philosopher/s);
  bad(make(HEAD.replace('study', 'moon'), words(100)), 'x1.md', /no background "moon"/);
  bad(make(HEAD.replace(/\nsource:.*/, ''), words(100)), 'x1.md', /missing "source:"/);
  bad(make(HEAD + '\nmood: calm', words(100)), 'x1.md', /Unknown header line "mood:"/);
  bad(make(HEAD, words(40)), 'x1.md', /40 words.*add about 60/s);
  bad(make(HEAD, words(160)), 'x1.md', /160 words.*cut about 60/s);
  bad(make(HEAD, ''), 'x1.md', /no narration/);
  bad(make(HEAD, words(100)), 'Bad Name.md', /lowercase letters, numbers and dashes/);
  bad(make(HEAD, words(100)), 'notes.txt', /must end in \.md/);
  bad(make(HEAD.replace('type: lesson', 'type: question'), words(100)), 'x1.md', /must end on the question itself/);
});

test('a question clip keeps its closing question for the screen', () => {
  const r = parseScript(make(HEAD.replace('type: lesson', 'type: question'), `${words(95)} Would you plug in?`), known, 'q1.md');
  assert.equal(r.ok, true, r.errors.join('\n'));
  assert.equal(r.script.question, 'Would you plug in?');
});

test('tidy swaps curly quotes and long dashes for plain ones', () => {
  assert.equal(tidy('He said “no” — and left…'), 'He said "no", and left...');
});

test('every clip type lands between 35 and 45 seconds when the narration is inside its window', () => {
  for (const type of ['lesson', 'question', 'story', 'scripture']) {
    const w = narrationWindow(type);
    assert.ok(w.lo + extraSeconds(type) >= 35 && w.hi + extraSeconds(type) <= 45, type);
    assert.ok(w.lo < w.target && w.target < w.hi);
  }
});

test('the cast on disk passes validation, and placeholders load exactly like real art', () => {
  const r = validateCast(process.cwd());
  assert.deepEqual(r.problems, []);
  const { spec, characters, backgrounds } = loadCast(process.cwd());
  for (const name of spec.characters) assert.ok(characters.some((c) => c.name === name), name);
  for (const name of spec.backgrounds) assert.ok(backgrounds.some((b) => b.name === name), name);
});

test('the cast validator catches wrong sizes, missing parts, non-PNG files and bad anchors', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cast-'));
  fs.cpSync('assets', path.join(tmp, 'assets'), { recursive: true });
  const cast = path.join(tmp, 'assets/cast');
  fs.rmSync(path.join(cast, 'king/head.png'));
  fs.copyFileSync(path.join(cast, 'monk/head.png'), path.join(cast, 'monk/body.png')); // wrong size
  fs.copyFileSync(path.join(cast, 'dad/head.png'), path.join(tmp, 'assets/backgrounds/study.png')); // wrong size
  fs.copyFileSync(path.join(tmp, 'assets/backgrounds/church.png'), path.join(cast, 'mother/head.png')); // wrong size, no alpha
  fs.writeFileSync(path.join(cast, 'kid/meta.json'), '{"mouth":[900,10],"nose":[1,2]}');
  fs.writeFileSync(path.join(cast, 'pastor/mouth-open.png'), 'not a png, and long enough to be read as a header');
  fs.rmSync(path.join(cast, 'farmer'), { recursive: true });
  const text = validateCast(tmp).problems.join('\n');
  assert.match(text, /cast\/king\/head\.png: missing/);
  assert.match(text, /cast\/monk\/body\.png: is 600x600, must be exactly 800x1000/);
  assert.match(text, /backgrounds\/study\.png: is 600x600, must be exactly 1080x1920/);
  assert.match(text, /cast\/mother\/head\.png: is 1080x1920/);
  assert.match(text, /cast\/kid: meta\.json: unknown key "nose"/);
  assert.match(text, /cast\/pastor\/mouth-open\.png: not a PNG file/);
  assert.match(text, /cast\/farmer: the folder is missing/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('the feed shows unwatched clips first with the types mixed, then watched ones', () => {
  // run the page's script with just enough of a browser around it to reach its ordering function
  const noop = () => {};
  const node = () => ({ addEventListener: noop, appendChild: noop, querySelector: () => node(), classList: { add: noop, remove: noop, contains: () => false }, dataset: {}, style: {}, scrollTo: noop });
  const sandbox = {
    document: { getElementById: node, addEventListener: noop, createElement: node, hidden: false },
    localStorage: { getItem: () => null, setItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop },
    IntersectionObserver: class { observe() {} disconnect() {} },
    fetch: () => new Promise(noop),
    location: { reload: noop },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync('feed/feed.js', 'utf8'), sandbox);
  const clip = (id, type, added) => ({ id, type, added });
  const all = [clip('l1', 'lesson', '1'), clip('l2', 'lesson', '2'), clip('l3', 'lesson', '3'), clip('q1', 'question', '1'), clip('s1', 'story', '1'), clip('c1', 'scripture', '1'), clip('old', 'story', '0'), clip('older', 'lesson', '0')];
  const { list, fresh } = sandbox.smartfeed.order(all, { old: 200, older: 100 });
  const ids = list.map((c) => c.id);
  assert.equal(fresh, 6);
  assert.equal(ids.slice(6).join(), 'older,old'); // watched last, least recently watched first
  assert.equal(list.slice(0, 4).map((c) => c.type).sort().join(), 'lesson,question,scripture,story'); // one of each before any repeats
  assert.ok(ids.indexOf('l3') < ids.indexOf('l2') && ids.indexOf('l2') < ids.indexOf('l1')); // newest first within a type
});
