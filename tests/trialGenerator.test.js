import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialSequence } from '../src/trialGenerator.js';
import { positionMatches, numberMatches, shapeMatches, relationMatches } from '../src/relations.js';

function rng(seed = 123456) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function verifyTruth(sequence, config) {
  for (let i = config.n; i < sequence.length; i += 1) {
    const trial = sequence[i];
    const remembered = sequence[i - config.n];
    assert.equal(positionMatches(trial.position, remembered.position, trial.prompts.position, config.mode), trial.targets.position, `position trial ${i}`);
    assert.equal(numberMatches(trial.number, remembered.number, trial.prompts.sound), trial.targets.sound, `sound trial ${i}`);
    assert.equal(shapeMatches(trial.shape, remembered.shape, trial.prompts.shape), trial.targets.shape, `shape trial ${i}`);
    assert.equal(relationMatches(trial.relation.semantic, remembered.relation.semantic, trial.prompts.relation), trial.targets.relation, `relation trial ${i}`);
  }
}

test('sequence contains N warmups plus requested scored trials', () => {
  const config = { n: 2, trials: 30, mode: '2d', targetRate: 0.35, lureRate: 0 };
  const sequence = createTrialSequence(config, rng());
  assert.equal(sequence.length, 32);
  assert.equal(sequence.filter((t) => t.scored).length, 30);
  assert.equal(sequence[0].scored, false);
  assert.equal(sequence[1].scored, false);
});

test('stored ground truth always agrees with actual relational algebra in 2D', () => {
  const config = { n: 3, trials: 80, mode: '2d', targetRate: 0.4, lureRate: 0.1 };
  const sequence = createTrialSequence(config, rng(4));
  verifyTruth(sequence, config);
});

test('stored ground truth agrees in rotating 3D mode', () => {
  const config = { n: 2, trials: 80, mode: '3d-rotating', targetRate: 0.4, lureRate: 0.1 };
  const sequence = createTrialSequence(config, rng(8));
  verifyTruth(sequence, config);
});

test('prompts do not simply repeat on consecutive trials', () => {
  const config = { n: 2, trials: 50, mode: '3d-static', targetRate: 0.35, lureRate: 0 };
  const sequence = createTrialSequence(config, rng(22));
  for (let i = 1; i < sequence.length; i += 1) {
    assert.notEqual(sequence[i].prompts.position, sequence[i - 1].prompts.position);
    assert.notDeepEqual(sequence[i].prompts.sound, sequence[i - 1].prompts.sound);
    assert.notDeepEqual(sequence[i].prompts.shape, sequence[i - 1].prompts.shape);
    assert.notEqual(sequence[i].prompts.relation, sequence[i - 1].prompts.relation);
  }
});

test('every relation stimulus chooses a defined visual variant', () => {
  const sequence = createTrialSequence({ n: 2, trials: 50, mode: '2d', targetRate: 0.35, lureRate: 0 }, rng(3));
  for (const trial of sequence) {
    assert.equal(typeof trial.relation.semantic, 'string');
    assert.equal(Number.isInteger(trial.relation.variant), true);
    assert.equal(trial.relation.variant >= 0 && trial.relation.variant <= 2, true);
  }
});

test('long sessions actually use a broad mix of relational demands', () => {
  const sequence = createTrialSequence({ n: 2, trials: 120, mode: '3d-rotating', targetRate: 0.35, lureRate: 0, maxOffset: 5 }, rng(77));
  assert.ok(new Set(sequence.map(t => t.prompts.position)).size >= 6, 'position should use at least six prompt types in 3D');
  assert.equal(new Set(sequence.map(t => t.prompts.relation)).size, 3, 'all relation meta-prompts should appear');
  assert.ok(new Set(sequence.map(t => t.prompts.sound.type)).size >= 3, 'sound should use before, after and delta');
  assert.ok(new Set(sequence.map(t => t.prompts.shape.type)).size >= 3, 'shape should use fewer, more and delta');
});
