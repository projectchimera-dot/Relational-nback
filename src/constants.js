export const SHAPES = Object.freeze([
  { id: 'CIRCLE', sides: 1, label: 'Circle' },
  { id: 'TRIANGLE', sides: 3, label: 'Triangle' },
  { id: 'SQUARE', sides: 4, label: 'Square' },
  { id: 'PENTAGON', sides: 5, label: 'Pentagon' },
  { id: 'HEXAGON', sides: 6, label: 'Hexagon' },
]);

export const SHAPE_SIDES = Object.freeze(Object.fromEntries(SHAPES.map((s) => [s.id, s.sides])));
export const SHAPE_BY_SIDES = Object.freeze(Object.fromEntries(SHAPES.map((s) => [s.sides, s.id])));
export const SHAPE_LABELS = Object.freeze(Object.fromEntries(SHAPES.map((s) => [s.id, s.label])));

export const RELATIONS = Object.freeze([
  { id: 'SAME', label: 'Same', family: 'EQUIVALENCE', inverse: 'SAME' },
  { id: 'OPPOSITE', label: 'Opposite', family: 'EQUIVALENCE', inverse: 'OPPOSITE' },
  { id: 'CONTAINS', label: 'Contains', family: 'CONTAINMENT', inverse: 'INSIDE' },
  { id: 'INSIDE', label: 'Inside', family: 'CONTAINMENT', inverse: 'CONTAINS' },
  { id: 'LEADS_TO', label: 'Leads to', family: 'SEQUENCE', inverse: 'FOLLOWS' },
  { id: 'FOLLOWS', label: 'Follows', family: 'SEQUENCE', inverse: 'LEADS_TO' },
  { id: 'GREATER', label: 'Greater', family: 'MAGNITUDE', inverse: 'LESS' },
  { id: 'LESS', label: 'Less', family: 'MAGNITUDE', inverse: 'GREATER' },
]);

export const RELATION_BY_ID = Object.freeze(Object.fromEntries(RELATIONS.map((r) => [r.id, r])));

export const POSITION_PROMPTS_2D = Object.freeze(['NORTH', 'SOUTH', 'EAST', 'WEST', 'ROW', 'COLUMN']);
export const POSITION_PROMPTS_3D = Object.freeze([...POSITION_PROMPTS_2D, 'ABOVE', 'BELOW']);
export const RELATION_PROMPTS = Object.freeze(['SAME', 'INVERSE', 'SAME_FAMILY']);
export const STREAMS = Object.freeze(['position', 'sound', 'shape', 'relation']);
export const STREAM_LABELS = Object.freeze({ position: 'Position', sound: 'Sound', shape: 'Shape', relation: 'Relation' });
export const STREAM_HOTKEYS = Object.freeze({ position: 'A', sound: 'S', shape: 'D', relation: 'F' });
export const DEFAULT_STREAMS = Object.freeze({ position: true, sound: true, shape: true, relation: true });
export const SOUND_MIN = 1;
export const SOUND_MAX = 8;
export const DEFAULT_SHAPE_POOL = Object.freeze(Object.fromEntries(SHAPES.map((shape) => [shape.id, true])));
