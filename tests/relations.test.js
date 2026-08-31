import test from 'node:test';
import assert from 'node:assert/strict';
import {
  positionMatches,
  numberMatches,
  shapeMatches,
  relationMatches,
  validNumberPrompts,
  validShapePrompts,
} from '../src/relations.js';

test('position prompt uses current-to-N-back direction in 2D', () => {
  const current = { x: 1, y: 1, z: 1 };
  assert.equal(positionMatches(current, { x: 1, y: 0, z: 1 }, 'NORTH', '2d'), true);
  assert.equal(positionMatches(current, { x: 2, y: 1, z: 1 }, 'EAST', '2d'), true);
  assert.equal(positionMatches(current, { x: 0, y: 1, z: 1 }, 'EAST', '2d'), false);
  assert.equal(positionMatches(current, { x: 2, y: 1, z: 1 }, 'ROW', '2d'), true);
  assert.equal(positionMatches(current, { x: 1, y: 2, z: 1 }, 'COLUMN', '2d'), true);
});

test('3D above and below operate in cube-local coordinates', () => {
  const current = { x: 1, y: 1, z: 1 };
  assert.equal(positionMatches(current, { x: 1, y: 1, z: 2 }, 'ABOVE', '3d-static'), true);
  assert.equal(positionMatches(current, { x: 1, y: 1, z: 0 }, 'BELOW', '3d-rotating'), true);
});

test('digit offsets follow N-back = current + delta', () => {
  assert.equal(numberMatches(9, 6, { type: 'DELTA', delta: -3 }), true);
  assert.equal(numberMatches(4, 5, { type: 'AFTER' }), true);
  assert.equal(numberMatches(4, 3, { type: 'BEFORE' }), true);
  assert.equal(numberMatches(9, 9, { type: 'DELTA', delta: 0 }), true);
});

test('digit prompt generation excludes impossible offsets', () => {
  const prompts = validNumberPrompts(9, 4);
  assert.equal(prompts.some((p) => p.type === 'DELTA' && p.delta === 2), false);
  assert.equal(prompts.some((p) => p.type === 'DELTA' && p.delta === -5), true);
});

test('shape offsets use semantic side values, including circle=1', () => {
  assert.equal(shapeMatches('SQUARE', 'CIRCLE', { type: 'DELTA', delta: -3 }), true);
  assert.equal(shapeMatches('TRIANGLE', 'SQUARE', { type: 'MORE' }), true);
  assert.equal(shapeMatches('HEXAGON', 'PENTAGON', { type: 'FEWER' }), true);
});

test('shape prompt generation only returns reachable side counts', () => {
  const prompts = validShapePrompts('HEXAGON', 'CIRCLE');
  assert.equal(prompts.some((p) => p.type === 'DELTA' && p.delta === 1), false);
  assert.equal(prompts.some((p) => p.type === 'DELTA' && p.delta === -5), true);
});

test('relation matching separates semantics from glyph variants', () => {
  assert.equal(relationMatches('CONTAINS', 'INSIDE', 'INVERSE'), true);
  assert.equal(relationMatches('GREATER', 'LESS', 'INVERSE'), true);
  assert.equal(relationMatches('CONTAINS', 'INSIDE', 'SAME_FAMILY'), true);
  assert.equal(relationMatches('LEADS_TO', 'GREATER', 'SAME_FAMILY'), false);
  assert.equal(relationMatches('FOLLOWS', 'FOLLOWS', 'SAME'), true);
});
