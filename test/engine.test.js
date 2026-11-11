import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeComposition } from '../src/composition.js';

test('the paper theme and the sample scene load through the copied engine', async () => {
  const norm = await normalizeComposition({ width: 1080, height: 1920, fps: 30, theme: 'paper', scenes: [{ type: 'custom/sample-card', duration: 4 }] }, { baseDir: process.cwd() });
  assert.equal(norm.totalFrames, 120);
  assert.equal(norm.width, 1080);
  assert.ok(norm.fontCss.length >= 2);
});

test('ENGINE.md records the source commit', () => {
  assert.match(fs.readFileSync('ENGINE.md', 'utf8'), /dae6661c60dbc40fe3c56ef28fa40f2527df1ca9/);
});
