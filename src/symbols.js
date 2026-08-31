import { RELATION_BY_ID } from './constants.js';

const SURFACES = [
  { left: 'circle', right: 'square' },
  { left: 'diamond', right: 'circle' },
  { left: 'square', right: 'diamond' },
];

const MARKS = Object.freeze({
  SAME: '=',
  OPPOSITE: '≠',
  CONTAINS: '⊃',
  INSIDE: '⊂',
  LEADS_TO: '→',
  FOLLOWS: '←',
  GREATER: '>',
  LESS: '<',
});

export function getRelationSymbol(relationId, variant = 0) {
  const relation = RELATION_BY_ID[relationId];
  if (!relation) throw new Error(`Unknown relation: ${relationId}`);
  const surface = SURFACES[((variant % SURFACES.length) + SURFACES.length) % SURFACES.length];
  return {
    relationId,
    variant: ((variant % SURFACES.length) + SURFACES.length) % SURFACES.length,
    left: surface.left,
    right: surface.right,
    mark: MARKS[relationId],
    label: relation.label,
    family: relation.family,
    inverse: relation.inverse,
  };
}

export function relationGlyphSVG(relationId, variant = 0, className = '') {
  const def = getRelationSymbol(relationId, variant);
  const left = shapeSvg(def.left, 21, 32);
  const right = shapeSvg(def.right, 59, 32);
  return `<svg class="relation-glyph ${className}" viewBox="0 0 80 64" role="img" aria-label="${escapeHtml(def.label)}"><g>${left}${right}<text x="40" y="38" text-anchor="middle" class="relation-mark">${escapeHtml(def.mark)}</text></g></svg>`;
}

function shapeSvg(shape, cx, cy) {
  if (shape === 'circle') return `<circle cx="${cx}" cy="${cy}" r="8" class="glyph-node"/>`;
  if (shape === 'square') return `<rect x="${cx - 8}" y="${cy - 8}" width="16" height="16" rx="1" class="glyph-node"/>`;
  return `<rect x="${cx - 7}" y="${cy - 7}" width="14" height="14" transform="rotate(45 ${cx} ${cy})" class="glyph-node"/>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const RELATION_VARIANT_COUNT = SURFACES.length;
