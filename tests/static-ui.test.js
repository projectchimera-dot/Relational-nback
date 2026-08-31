import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { relationGlyphSVG } from '../src/symbols.js';

const root = new URL('../', import.meta.url);
async function read(path) { return readFile(new URL(path, root), 'utf8'); }

test('entry page exposes setup, game, wiki, history and all four response channels', async () => {
  const html = await read('index.html');
  for (const id of ['setup-view', 'game-view', 'wiki-view', 'history-view']) assert.match(html, new RegExp(`id="${id}"`));
  for (const stream of ['position', 'sound', 'shape', 'relation']) assert.match(html, new RegExp(`data-stream="${stream}"`));
  assert.match(html, /3D Rotating/);
  assert.match(html, /Remembered N-back/);
});

test('stylesheet includes responsive 3x3 grid and four-column response deck', async () => {
  const css = await read('styles.css');
  assert.match(css, /grid-template-columns:\s*repeat\(3/);
  assert.match(css, /\.response-deck/);
  assert.match(css, /@media/);
});

test('app module wires trial generation, scoring and wiki', async () => {
  const app = await read('src/app.js');
  assert.match(app, /createTrialSequence/);
  assert.match(app, /scoreTrial/);
  assert.match(app, /renderWiki/);
  assert.match(app, /keydown/);
});

test('relation glyph variants remain semantically labelled SVGs', () => {
  const svg = relationGlyphSVG('CONTAINS', 2);
  assert.match(svg, /<svg/);
  assert.match(svg, /aria-label="Contains"/);
  assert.match(svg, /⊃/);
});

test('per-trial feedback is not erased synchronously when the next trial is presented', async () => {
  const app = await read('src/app.js');
  const match = app.match(/function presentTrial\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'presentTrial should exist');
  assert.doesNotMatch(match[1], /clearVerdicts\(\)/);
});
