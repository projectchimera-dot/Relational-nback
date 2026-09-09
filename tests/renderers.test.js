import test from 'node:test';
import assert from 'node:assert/strict';
import { render2DGrid, stimulusSvgMarkup } from '../src/renderers.js';

const trial = {
  position: { x: 2, y: 0, z: 1 },
  shape: 'HEXAGON',
  relation: {
    semantic: 'GREATER',
    nodes: [
      { shape: 'HEXAGON', cx: 36, cy: 60, size: 20 },
      { shape: 'CIRCLE', cx: 82, cy: 60, size: 11 },
    ],
  },
};

test('disabled shape and relation streams are absent from 2D stimulus markup', () => {
  const html = stimulusSvgMarkup(trial.shape, trial.relation, { position: true, sound: false, shape: false, relation: false });
  assert.doesNotMatch(html, /stimulus-outline/);
  assert.doesNotMatch(html, /stimulus-relation/);
});

test('disabled relation stream removes relation icon but preserves enabled outer shape', () => {
  const html = stimulusSvgMarkup(trial.shape, trial.relation, { position: true, sound: false, shape: true, relation: false });
  assert.match(html, /stimulus-outline/);
  assert.doesNotMatch(html, /stimulus-relation/);
});

test('disabled shape stream removes outer shape but preserves enabled relation icon', () => {
  const html = stimulusSvgMarkup(trial.shape, trial.relation, { position: false, sound: false, shape: false, relation: true });
  assert.doesNotMatch(html, /stimulus-outline/);
  assert.match(html, /stimulus-relation/);
});

test('when position is disabled, remaining visual stimulus is rendered in the center cell', () => {
  const container = { innerHTML: '' };
  render2DGrid(container, trial, true, { position: false, sound: false, shape: true, relation: true });
  assert.match(container.innerHTML, /data-cell="4"[^>]*>\s*<svg/);
  assert.doesNotMatch(container.innerHTML, /data-cell="2"[^>]*>\s*<svg/);
});

test('sound-only mode renders no visual stimulus or active position cell', () => {
  const container = { innerHTML: '' };
  render2DGrid(container, trial, true, { position: false, sound: true, shape: false, relation: false });
  assert.doesNotMatch(container.innerHTML, /stimulus-svg/);
  assert.doesNotMatch(container.innerHTML, /grid-cell active/);
});
