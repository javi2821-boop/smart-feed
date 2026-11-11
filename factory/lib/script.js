// A script is one small text file: a header between two --- lines, then the narration.
// This module reads one and says, in plain words, everything that is wrong with it.

export const TYPES = ['lesson', 'question', 'story', 'scripture'];
export const KEYS = ['type', 'title', 'character', 'background', 'source'];
export const WORDS = { min: 80, max: 125 };

const slug = (s) => String(s).trim().toLowerCase().replace(/[\s_]+/g, '-');

/** Characters a voice reads badly or a font may lack, swapped for plain ones. The meaning never changes. */
export function tidy(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/…/g, '...')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const sentences = (text) => text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];

/**
 * @param {string} text      the file's contents
 * @param {object} known     { characters: [names], backgrounds: [names] } found in assets/
 * @param {string} fileName  e.g. "marcus-control.md"
 * @returns {{ ok: boolean, errors: string[], script?: object }}
 */
export function parseScript(text, known, fileName = 'script.md') {
  const errors = [];
  const id = fileName.replace(/\.md$/i, '');
  if (!/\.md$/i.test(fileName)) errors.push(`The file name must end in .md (got "${fileName}").`);
  else if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) errors.push(`The file name "${fileName}" may only use lowercase letters, numbers and dashes, 2 to 60 characters, like "marcus-control.md".`);

  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (lines[i]?.trim() !== '---') {
    return { ok: false, errors: [...errors, 'The file must start with a line holding only three dashes (---), then the header, then another --- line. See scripts/README.md.'] };
  }
  const end = lines.findIndex((l, n) => n > i && l.trim() === '---');
  if (end < 0) return { ok: false, errors: [...errors, 'The header is never closed: put a line holding only --- after the "source:" line.'] };

  const head = {};
  for (const line of lines.slice(i + 1, end)) {
    if (!line.trim()) continue;
    const m = /^([A-Za-z]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!m) { errors.push(`Header line not understood: "${line.trim()}". Each header line looks like "title: Short title".`); continue; }
    const key = m[1].toLowerCase();
    if (!KEYS.includes(key)) { errors.push(`Unknown header line "${m[1]}:". The header has exactly these lines: ${KEYS.join(', ')}.`); continue; }
    if (key in head) errors.push(`The header has "${key}:" twice.`);
    head[key] = m[2].trim().replace(/^["'](.*)["']$/, '$1').trim();
  }
  for (const k of KEYS) if (!head[k]) errors.push(`The header is missing "${k}:" (or it is empty).`);

  const type = slug(head.type || '');
  if (head.type && !TYPES.includes(type)) errors.push(`type is "${head.type}", but it must be one of: ${TYPES.join(', ')}.`);
  if (head.type && /\|/.test(head.type)) errors.push('type still lists every choice: keep just one of them.');
  if (head.title && head.title.length > 60) errors.push(`The title is ${head.title.length} characters; keep it to 60 or fewer (it sits on a card).`);
  if (head.source && head.source.length > 90) errors.push(`The source is ${head.source.length} characters; keep it to 90 or fewer.`);
  const character = slug(head.character || '');
  if (head.character && !known.characters.includes(character)) errors.push(`There is no character "${head.character}". Characters: ${known.characters.join(', ')}.`);
  const background = slug(head.background || '');
  if (head.background && !known.backgrounds.includes(background)) errors.push(`There is no background "${head.background}". Backgrounds: ${known.backgrounds.join(', ')}.`);

  const narration = tidy(lines.slice(end + 1).join(' '));
  const words = narration ? narration.split(' ').length : 0;
  if (!words) errors.push('There is no narration under the header.');
  else if (words < WORDS.min) errors.push(`The narration is ${words} words. It needs ${WORDS.min} to ${WORDS.max} (about 100) to fill 35 to 45 seconds: add about ${100 - words}.`);
  else if (words > WORDS.max) errors.push(`The narration is ${words} words. It needs ${WORDS.min} to ${WORDS.max} (about 100) to fit 35 to 45 seconds: cut about ${words - 100}.`);
  if (/\[[^\]]*\]|\bTODO\b|lorem ipsum/i.test(narration)) errors.push('The narration still has a placeholder in it (square brackets, TODO or lorem ipsum).');

  let question = '';
  if (type === 'question' && words) {
    const last = sentences(narration).pop() || '';
    if (!/\?["')\]]*$/.test(last)) errors.push('A question clip must end on the question itself: the last sentence of the narration has to end with a question mark. It is the line held on screen.');
    else if (last.length > 170) errors.push(`The closing question is ${last.length} characters; keep it to 170 or fewer so it fits on screen.`);
    else question = last;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], script: { id, type, title: head.title, character, background, source: head.source, narration, words, question } };
}
