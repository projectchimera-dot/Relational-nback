import { RELATION_BY_ID, SHAPES, SHAPE_SIDES, SHAPE_LABELS } from './constants.js';

const SAME_SIZE = 18;
const BIG_SIZE = 20;
const SMALL_SIZE = 11;
const OVERLAP_SIZE = 17;

export function createRelationVisual(relationId, options = {}, rng = Math.random) {
  const { enabledShapes = SHAPES.map((shape) => shape.id), previousPairKey = '' } = options;
  const relation = RELATION_BY_ID[relationId];
  if (!relation) throw new Error(`Unknown relation: ${relationId}`);
  const allowed = uniqueShapeIds(enabledShapes);
  if (allowed.length < 2) throw new Error('At least two shapes must be enabled for relation symbols');

  const pairs = createPairs(allowed).filter((pair) => pair.key !== previousPairKey);
  const sourcePairs = pairs.length ? pairs : createPairs(allowed);
  const pair = pick(sourcePairs, rng);
  const [a, b] = pair.shapes;
  const moreShape = SHAPE_SIDES[a] >= SHAPE_SIDES[b] ? a : b;
  const lessShape = moreShape === a ? b : a;
  const flipPlacement = rng() < 0.5;

  const nodes = relationNodes(relationId, { moreShape, lessShape, flipPlacement });
  return {
    semantic: relationId,
    label: relation.label,
    family: relation.family,
    inverse: relation.inverse,
    pairKey: pair.key,
    nodes,
  };
}

export function relationGlyphSVG(relationId, variant = 0, className = '', enabledShapes = SHAPES.map((shape) => shape.id)) {
  const visual = createRelationVisual(relationId, { enabledShapes, previousPairKey: variant % 2 ? '__skip__' : '' }, seededRng(relationId, variant));
  return relationVisualSVG(visual, className);
}

export function relationVisualSVG(visual, className = '') {
  const relation = RELATION_BY_ID[visual.semantic];
  const body = visual.nodes.map((node) => shapeSvg(node.shape, node.cx, node.cy, node.size, 'glyph-node')).join('');
  return `<svg class="relation-glyph ${className}" viewBox="0 0 120 120" role="img" aria-label="${escapeHtml(relation?.label || visual.semantic)}">${body}</svg>`;
}

export function relationGuideData(enabledShapes = SHAPES.map((shape) => shape.id)) {
  return Object.keys(RELATION_BY_ID).map((id, index) => ({
    id,
    label: RELATION_BY_ID[id].label,
    svg: relationGlyphSVG(id, index, '', enabledShapes),
  }));
}

function relationNodes(relationId, { moreShape, lessShape, flipPlacement }) {
  switch (relationId) {
    case 'SAME':
      return [
        { shape: moreShape, cx: 60, cy: 60, size: SAME_SIZE },
        { shape: lessShape, cx: 60, cy: 60, size: SAME_SIZE },
      ];
    case 'OPPOSITE':
      return flipPlacement
        ? [
            { shape: lessShape, cx: 39, cy: 60, size: SAME_SIZE },
            { shape: moreShape, cx: 81, cy: 60, size: SAME_SIZE },
          ]
        : [
            { shape: moreShape, cx: 39, cy: 60, size: SAME_SIZE },
            { shape: lessShape, cx: 81, cy: 60, size: SAME_SIZE },
          ];
    case 'CONTAINS':
      return [
        { shape: moreShape, cx: 60, cy: 60, size: 30 },
        { shape: lessShape, cx: 60, cy: 60, size: 15 },
      ];
    case 'INSIDE':
      return [
        { shape: lessShape, cx: 60, cy: 60, size: 30 },
        { shape: moreShape, cx: 60, cy: 60, size: 15 },
      ];
    case 'GREATER':
      return flipPlacement
        ? [
            { shape: lessShape, cx: 36, cy: 60, size: SMALL_SIZE },
            { shape: moreShape, cx: 82, cy: 60, size: BIG_SIZE },
          ]
        : [
            { shape: moreShape, cx: 36, cy: 60, size: BIG_SIZE },
            { shape: lessShape, cx: 82, cy: 60, size: SMALL_SIZE },
          ];
    case 'LESS':
      return flipPlacement
        ? [
            { shape: moreShape, cx: 38, cy: 60, size: SMALL_SIZE },
            { shape: lessShape, cx: 83, cy: 60, size: BIG_SIZE },
          ]
        : [
            { shape: lessShape, cx: 38, cy: 60, size: BIG_SIZE },
            { shape: moreShape, cx: 83, cy: 60, size: SMALL_SIZE },
          ];
    case 'LEADS_TO': {
      const topShape = moreShape;
      const bottomShape = lessShape;
      return flipPlacement
        ? [
            { shape: bottomShape, cx: 46, cy: 72, size: OVERLAP_SIZE },
            { shape: topShape, cx: 74, cy: 44, size: OVERLAP_SIZE },
          ]
        : [
            { shape: topShape, cx: 46, cy: 44, size: OVERLAP_SIZE },
            { shape: bottomShape, cx: 74, cy: 72, size: OVERLAP_SIZE },
          ];
    }
    case 'FOLLOWS': {
      const topShape = lessShape;
      const bottomShape = moreShape;
      return flipPlacement
        ? [
            { shape: bottomShape, cx: 46, cy: 72, size: OVERLAP_SIZE },
            { shape: topShape, cx: 74, cy: 44, size: OVERLAP_SIZE },
          ]
        : [
            { shape: topShape, cx: 46, cy: 44, size: OVERLAP_SIZE },
            { shape: bottomShape, cx: 74, cy: 72, size: OVERLAP_SIZE },
          ];
    }
    default:
      throw new Error(`Unknown relation visual: ${relationId}`);
  }
}

function shapeSvg(shapeId, cx, cy, radius, className) {
  if (shapeId === 'CIRCLE') return `<circle cx="${cx}" cy="${cy}" r="${radius}" class="${className}"/>`;
  const sides = SHAPE_SIDES[shapeId];
  return `<polygon points="${polygonPoints(cx, cy, radius, sides)}" class="${className}"/>`;
}

function polygonPoints(cx, cy, radius, sides) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
}

function createPairs(shapes) {
  const pairs = [];
  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      const a = shapes[i];
      const b = shapes[j];
      pairs.push({ shapes: [a, b], key: [a, b].sort().join('|') });
    }
  }
  return pairs;
}

function uniqueShapeIds(ids) {
  return [...new Set(ids)].filter((id) => SHAPE_SIDES[id]);
}

function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function seededRng(relationId, variant) {
  let seed = [...`${relationId}:${variant}`].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 17) >>> 0;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const RELATION_VARIANT_COUNT = 3;
export { SHAPE_LABELS };
