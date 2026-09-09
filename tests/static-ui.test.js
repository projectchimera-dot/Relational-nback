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
  assert.match(html, /discord\.gg\/chmr/);
  assert.match(html, /variable-floor/);
});

test('stylesheet includes responsive 3x3 grid and four-column response deck', async () => {
  const css = await read('styles.css');
  assert.match(css, /grid-template-columns:\s*repeat\(3/);
  assert.match(css, /\.response-deck/);
  assert.match(css, /@media/);
  assert.match(css, /height:\s*min\(520px, 92vw\)/);
});

test('app module wires trial generation, scoring and wiki', async () => {
  const app = await read('src/app.js');
  assert.match(app, /createTrialSequence/);
  assert.match(app, /scoreTrial/);
  assert.match(app, /renderWiki/);
  assert.match(app, /variableFloor/);
  assert.match(app, /keydown/);
});

test('relation glyph variants remain semantically labelled SVGs', () => {
  const svg = relationGlyphSVG('CONTAINS', 2);
  assert.match(svg, /<svg/);
  assert.match(svg, /aria-label="Contains"/);
  assert.match(svg, /polygon|circle/);
});

test('per-trial feedback is not erased synchronously when the next trial is presented', async () => {
  const app = await read('src/app.js');
  const match = app.match(/function presentTrial\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'presentTrial should exist');
  assert.doesNotMatch(match[1], /clearVerdicts\(\)/);
});

test('sound stream ships with the Quad Box Natural-Numbers 1-8 recordings and no TTS', async () => {
  const audioModule = await read('src/audio.js');
  assert.doesNotMatch(audioModule, /speechSynthesis|SpeechSynthesisUtterance/);
  for (let digit = 1; digit <= 8; digit += 1) {
    const file = new URL(`assets/audio/${digit}.mp3`, root);
    const bytes = await readFile(file);
    assert.ok(bytes.length > 1000, `audio ${digit}.mp3 should be a real recording`);
  }
});
