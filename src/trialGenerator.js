import {
  SHAPES,
  RELATIONS,
  POSITION_PROMPTS_2D,
  POSITION_PROMPTS_3D,
  RELATION_PROMPTS,
} from './constants.js';
import {
  positionMatches,
  numberMatches,
  shapeMatches,
  relationMatches,
  viableNumberPrompts,
  viableShapePrompts,
} from './relations.js';
import { RELATION_VARIANT_COUNT } from './symbols.js';

const DEFAULTS = Object.freeze({
  n: 2,
  trials: 30,
  mode: '2d',
  targetRate: 0.35,
  lureRate: 0,
  maxOffset: 4,
});

export function createTrialSequence(inputConfig = {}, rng = Math.random) {
  const config = { ...DEFAULTS, ...inputConfig };
  validateConfig(config);
  const sequence = [];
  let previousPrompts = null;
  const total = config.n + config.trials;

  for (let index = 0; index < total; index += 1) {
    const remembered = index >= config.n ? sequence[index - config.n] : null;
    const scored = Boolean(remembered);
    const targets = scored ? {
      position: rng() < config.targetRate,
      sound: rng() < config.targetRate,
      shape: rng() < config.targetRate,
      relation: rng() < config.targetRate,
    } : { position: false, sound: false, shape: false, relation: false };

    const positionPair = scored
      ? generatePosition(remembered.position, targets.position, config.mode, previousPrompts?.position, rng)
      : randomPositionWarmup(config.mode, previousPrompts?.position, rng);
    const soundPair = scored
      ? generateNumber(remembered.number, targets.sound, config.maxOffset, previousPrompts?.sound, rng)
      : randomNumberWarmup(config.maxOffset, previousPrompts?.sound, rng);
    const shapePair = scored
      ? generateShape(remembered.shape, targets.shape, previousPrompts?.shape, rng)
      : randomShapeWarmup(previousPrompts?.shape, rng);
    const relationPair = scored
      ? generateRelation(remembered.relation.semantic, targets.relation, previousPrompts?.relation, rng)
      : randomRelationWarmup(previousPrompts?.relation, rng);

    const trial = {
      index,
      scored,
      position: positionPair.value,
      number: soundPair.value,
      shape: shapePair.value,
      relation: {
        semantic: relationPair.value,
        variant: randomInt(0, RELATION_VARIANT_COUNT - 1, rng),
      },
      prompts: {
        position: positionPair.prompt,
        sound: soundPair.prompt,
        shape: shapePair.prompt,
        relation: relationPair.prompt,
      },
      targets,
      lures: { position: false, sound: false, shape: false, relation: false },
    };

    if (scored && config.n >= 2 && index > 0) {
      const near = sequence[index - 1];
      trial.lures = {
        position: !targets.position && positionMatches(trial.position, near.position, trial.prompts.position, config.mode),
        sound: !targets.sound && numberMatches(trial.number, near.number, trial.prompts.sound),
        shape: !targets.shape && shapeMatches(trial.shape, near.shape, trial.prompts.shape),
        relation: !targets.relation && relationMatches(trial.relation.semantic, near.relation.semantic, trial.prompts.relation),
      };
    }

    sequence.push(trial);
    previousPrompts = trial.prompts;
  }

  return sequence;
}

function validateConfig(config) {
  if (!Number.isInteger(config.n) || config.n < 1 || config.n > 9) throw new Error('n must be an integer from 1 to 9');
  if (!Number.isInteger(config.trials) || config.trials < 5 || config.trials > 500) throw new Error('trials must be an integer from 5 to 500');
  if (!['2d', '3d-static', '3d-rotating'].includes(config.mode)) throw new Error('invalid mode');
  if (config.targetRate <= 0 || config.targetRate >= 1) throw new Error('targetRate must be between 0 and 1');
}

function generatePosition(remembered, target, mode, previousPrompt, rng) {
  const positions = allPositions(mode);
  const prompts = mode === '2d' ? POSITION_PROMPTS_2D : POSITION_PROMPTS_3D;
  const candidates = [];
  for (const prompt of prioritizeDifferent(prompts, previousPrompt)) {
    for (const value of positions) {
      if (positionMatches(value, remembered, prompt, mode) === target) candidates.push({ value, prompt });
    }
  }
  return pick(candidates, rng);
}

function randomPositionWarmup(mode, previousPrompt, rng) {
  const prompts = mode === '2d' ? POSITION_PROMPTS_2D : POSITION_PROMPTS_3D;
  return { value: pick(allPositions(mode), rng), prompt: pick(prioritizeDifferent(prompts, previousPrompt), rng) };
}

function generateNumber(remembered, target, maxOffset, previousPrompt, rng) {
  const candidates = [];
  for (let value = 0; value <= 9; value += 1) {
    for (const prompt of viableNumberPrompts(value, maxOffset)) {
      if (!samePrompt(prompt, previousPrompt) && numberMatches(value, remembered, prompt) === target) candidates.push({ value, prompt });
    }
  }
  if (!candidates.length) {
    for (let value = 0; value <= 9; value += 1) {
      for (const prompt of viableNumberPrompts(value, maxOffset)) {
        if (numberMatches(value, remembered, prompt) === target) candidates.push({ value, prompt });
      }
    }
  }
  return pick(candidates, rng);
}

function randomNumberWarmup(maxOffset, previousPrompt, rng) {
  for (let attempts = 0; attempts < 40; attempts += 1) {
    const value = randomInt(0, 9, rng);
    const prompts = viableNumberPrompts(value, maxOffset).filter((p) => !samePrompt(p, previousPrompt));
    if (prompts.length) return { value, prompt: pick(prompts, rng) };
  }
  const value = randomInt(0, 9, rng);
  return { value, prompt: pick(viableNumberPrompts(value, maxOffset), rng) };
}

function generateShape(remembered, target, previousPrompt, rng) {
  const candidates = [];
  for (const shape of SHAPES) {
    for (const prompt of viableShapePrompts(shape.id)) {
      if (!samePrompt(prompt, previousPrompt) && shapeMatches(shape.id, remembered, prompt) === target) candidates.push({ value: shape.id, prompt });
    }
  }
  if (!candidates.length) {
    for (const shape of SHAPES) {
      for (const prompt of viableShapePrompts(shape.id)) {
        if (shapeMatches(shape.id, remembered, prompt) === target) candidates.push({ value: shape.id, prompt });
      }
    }
  }
  return pick(candidates, rng);
}

function randomShapeWarmup(previousPrompt, rng) {
  const value = pick(SHAPES, rng).id;
  const prompts = viableShapePrompts(value).filter((p) => !samePrompt(p, previousPrompt));
  return { value, prompt: pick(prompts.length ? prompts : viableShapePrompts(value), rng) };
}

function generateRelation(remembered, target, previousPrompt, rng) {
  const candidates = [];
  for (const relation of RELATIONS) {
    for (const prompt of prioritizeDifferent(RELATION_PROMPTS, previousPrompt)) {
      if (relationMatches(relation.id, remembered, prompt) === target) candidates.push({ value: relation.id, prompt });
    }
  }
  return pick(candidates, rng);
}

function randomRelationWarmup(previousPrompt, rng) {
  return {
    value: pick(RELATIONS, rng).id,
    prompt: pick(prioritizeDifferent(RELATION_PROMPTS, previousPrompt), rng),
  };
}

function allPositions(mode) {
  const depth = mode === '2d' ? [1] : [0, 1, 2];
  const out = [];
  for (const z of depth) for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) out.push({ x, y, z });
  return out;
}

function prioritizeDifferent(values, previous) {
  const different = values.filter((value) => !samePrompt(value, previous));
  return different.length ? different : [...values];
}

function samePrompt(a, b) {
  if (a == null || b == null) return false;
  return typeof a === 'object' || typeof b === 'object'
    ? JSON.stringify(a) === JSON.stringify(b)
    : a === b;
}

function pick(items, rng) {
  if (!items.length) throw new Error('Generator reached an empty candidate set');
  return items[Math.floor(rng() * items.length)];
}

function randomInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}
