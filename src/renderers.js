import { relationVisualSVG } from './symbols.js';
import { rotatePoint, projectPoint } from './projection.js';
import { SHAPE_SIDES, DEFAULT_STREAMS } from './constants.js';

export function render2DGrid(container, trial, visible = true, streams = DEFAULT_STREAMS) {
  const hasVisual = Boolean(streams.position || streams.shape || streams.relation);
  const displayPosition = streams.position ? trial.position : { x: 1, y: 1, z: 1 };
  const activeIndex = displayPosition.y * 3 + displayPosition.x;
  container.innerHTML = Array.from({ length: 9 }, (_, index) => {
    const active = visible && hasVisual && index === activeIndex;
    const stimulus = active && (streams.shape || streams.relation)
      ? stimulusSvgMarkup(trial.shape, trial.relation, streams)
      : '';
    return `<div class="grid-cell${active ? ' active' : ''}" data-cell="${index}">${stimulus}</div>`;
  }).join('');
}

export function stimulusSvgMarkup(shapeId, relationVisual, streams = DEFAULT_STREAMS) {
  const outline = streams.shape ? outerShape(shapeId) : '';
  const relationSvg = streams.relation
    ? relationVisualSVG(relationVisual, 'stimulus-relation').replace('<svg ', '<svg x="14" y="14" width="92" height="92" ')
    : '';
  return `<svg class="stimulus-svg" viewBox="0 0 120 120" aria-label="enabled visual streams">${outline}${relationSvg}</svg>`;
}

export function draw3DStimulus(canvas, trial, options = {}) {
  const { yaw = 0.65, pitch = -0.42, visible = true, streams = DEFAULT_STREAMS } = options;
  const ratio = globalThis.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 720;
  const cssHeight = canvas.clientHeight || 560;
  if (canvas.width !== Math.round(cssWidth * ratio) || canvas.height !== Math.round(cssHeight * ratio)) {
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const logical = [];
  for (let z = 0; z < 3; z += 1) for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) {
    const world = { x: (x - 1) * 1.12, y: (y - 1) * 1.12, z: (z - 1) * 1.12 };
    const rotated = rotatePoint(world, yaw, pitch);
    const projected = projectPoint(rotated, cssWidth, cssHeight, 5.2, Math.min(cssWidth, cssHeight) * 0.75);
    logical.push({ x, y, z, projected });
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2c2c31';
  for (const a of logical) {
    for (const b of logical) {
      const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
      if (distance !== 1) continue;
      if (a.x * 9 + a.y * 3 + a.z >= b.x * 9 + b.y * 3 + b.z) continue;
      ctx.beginPath(); ctx.moveTo(a.projected.x, a.projected.y); ctx.lineTo(b.projected.x, b.projected.y); ctx.stroke();
    }
  }

  const hasVisual = Boolean(streams.position || streams.shape || streams.relation);
  const displayPosition = streams.position ? trial.position : { x: 1, y: 1, z: 1 };
  const sorted = [...logical].sort((a, b) => a.projected.depth - b.projected.depth).reverse();
  for (const point of sorted) {
    const isActive = visible && hasVisual && point.x === displayPosition.x && point.y === displayPosition.y && point.z === displayPosition.z;
    const size = Math.max(5, Math.min(15, point.projected.scale * 0.09));
    ctx.fillStyle = isActive ? '#f0c443' : '#202024';
    ctx.fillRect(point.projected.x - size / 2, point.projected.y - size / 2, size, size);
  }

  if (visible && (streams.shape || streams.relation)) {
    const active = logical.find((p) => p.x === displayPosition.x && p.y === displayPosition.y && p.z === displayPosition.z);
    if (active) drawCanvasStimulus(ctx, active.projected.x, active.projected.y, trial.shape, trial.relation, streams, Math.max(34, Math.min(58, active.projected.scale * 0.34)));
  }
}

function drawCanvasStimulus(ctx, cx, cy, shapeId, relationVisual, streams, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  if (streams.shape) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f5f5f2';
    ctx.fillStyle = '#0b0b0c';
    drawOuterCanvas(ctx, shapeId, radius);
    ctx.fill(); ctx.stroke();
  }
  if (streams.relation) {
    ctx.strokeStyle = '#f0c443';
    ctx.lineWidth = 2.2;
    for (const node of relationVisual.nodes) {
      drawShapeCanvas(ctx, node.shape, (node.cx - 60) * (radius / 48), (node.cy - 60) * (radius / 48), node.size * (radius / 48));
    }
  }
  ctx.restore();
}

function drawShapeCanvas(ctx, shapeId, x, y, radius) {
  ctx.beginPath();
  if (shapeId === 'CIRCLE') ctx.arc(x, y, radius, 0, Math.PI * 2);
  else {
    const sides = SHAPE_SIDES[shapeId] || 4;
    for (let i = 0; i < sides; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.stroke();
}

function outerShape(shapeId) {
  if (shapeId === 'CIRCLE') return '<circle cx="60" cy="60" r="48" class="stimulus-outline"/>';
  const sides = SHAPE_SIDES[shapeId] || 4;
  return `<polygon points="${polygonPoints(60, 60, 49, sides)}" class="stimulus-outline"/>`;
}
function polygonPoints(cx, cy, r, sides) { return Array.from({ length: sides }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI * 2) / sides; return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`; }).join(' '); }
function drawOuterCanvas(ctx, shapeId, r) {
  const sides = shapeId === 'CIRCLE' ? 0 : (SHAPE_SIDES[shapeId] || 4);
  ctx.beginPath();
  if (!sides) { ctx.arc(0, 0, r, 0, Math.PI * 2); return; }
  for (let i = 0; i < sides; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
