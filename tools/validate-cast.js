// Phase 3 check: every character has all four parts at the right size with transparency, and every background is
// the right size and solid. Placeholders and real art go through exactly the same checks and the same loader.
//
//   node tools/validate-cast.js          exit 0 = all good, 1 = problems (each one listed with what to do)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadCast } from '../factory/lib/cast.js';
import { pngInfo, pngAlpha } from '../factory/lib/png.js';

/** Returns { problems: [..], characters, backgrounds, summary }. */
export function validateCast(root) {
  const { spec, characters, backgrounds } = loadCast(root);
  const problems = [];
  const add = (where, msg) => problems.push(`${where}: ${msg}`);

  for (const name of spec.characters) if (!characters.some((c) => c.name === name)) add(`assets/cast/${name}`, 'the folder is missing (the cast list in assets/spec.json names it)');
  for (const name of spec.backgrounds) if (!backgrounds.some((b) => b.name === name)) add(`assets/backgrounds/${name}.png`, 'the file is missing (assets/spec.json names it)');

  for (const c of characters) {
    if (!/^[a-z][a-z0-9-]*$/.test(c.name)) add(`assets/cast/${c.name}`, 'folder names use lowercase letters, numbers and dashes only');
    for (const p of c.metaProblems) add(`assets/cast/${c.name}`, p);
    for (const [part, want] of Object.entries(spec.parts)) {
      const rel = `assets/cast/${c.name}/${want.file}`;
      const file = path.join(c.dir, want.file);
      if (!fs.existsSync(file)) { add(rel, `missing (every character needs ${Object.values(spec.parts).map((x) => x.file).join(', ')})`); continue; }
      try {
        const info = pngInfo(file);
        if (info.width !== want.width || info.height !== want.height) { add(rel, `is ${info.width}x${info.height}, must be exactly ${want.width}x${want.height}`); continue; }
        const a = pngAlpha(file);
        if (!a) { add(rel, 'has no transparency: export it as a PNG with a transparent background (RGBA)'); continue; }
        if (a.transparent < 0.03) add(rel, 'has almost no transparent pixels: the background must be see-through, not white');
        else if (part !== 'mouth-closed' && part !== 'mouth-open' && a.corners.slice(0, 2).some((v) => v > 8)) add(rel, 'its top corners are not transparent: the background must be see-through');
        if (a.opaque < 0.005) add(rel, 'is almost empty: nothing is drawn in it');
      } catch (e) {
        add(rel, e.message);
      }
    }
    const [mx, my] = c.anchors.mouth, [px, py] = c.anchors.headPivot, [nx, ny] = c.anchors.neck;
    if (mx < 0 || mx > spec.parts.head.width || my < 0 || my > spec.parts.head.height) add(`assets/cast/${c.name}`, 'meta.json: the mouth anchor is outside head.png');
    if (px < 0 || px > spec.parts.head.width || py < 0 || py > spec.parts.head.height) add(`assets/cast/${c.name}`, 'meta.json: the headPivot anchor is outside head.png');
    if (nx < 0 || nx > spec.parts.body.width || ny < 0 || ny > spec.parts.body.height) add(`assets/cast/${c.name}`, 'meta.json: the neck anchor is outside body.png');
  }

  for (const b of backgrounds) {
    const rel = `assets/backgrounds/${b.name}.png`;
    if (!/^[a-z][a-z0-9-]*$/.test(b.name)) add(rel, 'file names use lowercase letters, numbers and dashes only');
    try {
      const info = pngInfo(b.file);
      if (info.width !== spec.background.width || info.height !== spec.background.height) { add(rel, `is ${info.width}x${info.height}, must be exactly ${spec.background.width}x${spec.background.height}`); continue; }
      const a = pngAlpha(b.file);
      if (a && a.opaque < 0.999) add(rel, 'has see-through areas: a background must be solid edge to edge');
    } catch (e) {
      add(rel, e.message);
    }
  }
  const ph = characters.filter((c) => c.placeholder).length + backgrounds.filter((b) => b.placeholder).length;
  return { problems, characters, backgrounds, summary: `${characters.length} characters, ${backgrounds.length} backgrounds, ${ph} still placeholders` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const r = validateCast(root);
  for (const c of r.characters) console.log(`  cast/${c.name}${c.placeholder ? '  (placeholder)' : '  (real art)'}`);
  for (const b of r.backgrounds) console.log(`  backgrounds/${b.name}${b.placeholder ? '  (placeholder)' : '  (real art)'}`);
  console.log(r.summary);
  if (r.problems.length) {
    console.log(`\nFAIL: ${r.problems.length} problem${r.problems.length > 1 ? 's' : ''}`);
    for (const p of r.problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('PASS: every character has body, head, mouth-closed and mouth-open at the right size with transparency; every background is 1080x1920 and solid.');
}
