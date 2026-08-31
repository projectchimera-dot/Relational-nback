import { getRelationSymbol } from './symbols.js';
import { rotatePoint, projectPoint } from './projection.js';

export function render2DGrid(container, trial, visible = true) {
  const activeIndex = trial.position.y * 3 + trial.position.x;
  container.innerHTML = Array.from({ length: 9 }, (_, index) => {
    const active = visible && index === activeIndex;
    return `<div class="grid-cell${active ? ' active' : ''}" data-cell="${index}">${active ? stimulusSvgMarkup(trial.shape, trial.relation.semantic, trial.relation.variant) : ''}</div>`;
  }).join('');
}

export function stimulusSvgMarkup(shapeId, relationId, variant = 0) {
  const symbol = getRelationSymbol(relationId, variant);
  const outline = outerShape(shapeId);
  const left = innerNode(symbol.left, 39, 60);
  const right = innerNode(symbol.right, 81, 60);
  return `<svg class="stimulus-svg" viewBox="0 0 120 120" aria-label="${shapeId.toLowerCase()} containing an abstract relation symbol">${outline}${left}${right}<text x="60" y="67" text-anchor="middle" class="stimulus-mark">${symbol.mark}</text></svg>`;
}

export function draw3DStimulus(canvas, trial, options = {}) {
  const { yaw = 0.65, pitch = -0.42, visible = true } = options;
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
    logical.push({ x, y, z, world, rotated, projected });
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2c2c31';
  for (const a of logical) {
    for (const b of logical) {
      const distance = Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z);
      if (distance !== 1) continue;
      if (a.x*9+a.y*3+a.z >= b.x*9+b.y*3+b.z) continue;
      ctx.beginPath();ctx.moveTo(a.projected.x,a.projected.y);ctx.lineTo(b.projected.x,b.projected.y);ctx.stroke();
    }
  }

  const sorted = [...logical].sort((a,b) => a.projected.depth - b.projected.depth).reverse();
  for (const point of sorted) {
    const isActive = visible && point.x === trial.position.x && point.y === trial.position.y && point.z === trial.position.z;
    const size = Math.max(5, Math.min(15, point.projected.scale * .09));
    ctx.fillStyle = isActive ? '#f0c443' : '#202024';
    ctx.fillRect(point.projected.x-size/2, point.projected.y-size/2, size, size);
  }

  if (visible) {
    const active = logical.find((p) => p.x === trial.position.x && p.y === trial.position.y && p.z === trial.position.z);
    if (active) drawCanvasStimulus(ctx, active.projected.x, active.projected.y, trial.shape, trial.relation.semantic, trial.relation.variant, Math.max(34, Math.min(58, active.projected.scale * .34)));
  }
}

function drawCanvasStimulus(ctx, cx, cy, shapeId, relationId, variant, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f5f5f2';
  ctx.fillStyle = '#0b0b0c';
  drawOuterCanvas(ctx, shapeId, radius);
  ctx.fill();ctx.stroke();
  const symbol = getRelationSymbol(relationId, variant);
  ctx.strokeStyle = '#f0c443';ctx.fillStyle = '#f0c443';ctx.lineWidth = 2;
  drawNodeCanvas(ctx, symbol.left, -radius*.34, 0, radius*.13);
  drawNodeCanvas(ctx, symbol.right, radius*.34, 0, radius*.13);
  ctx.font = `800 ${Math.max(16, radius*.42)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';ctx.textBaseline = 'middle';ctx.fillText(symbol.mark, 0, 1);
  ctx.restore();
}

function outerShape(shapeId) {
  if (shapeId === 'CIRCLE') return '<circle cx="60" cy="60" r="48" class="stimulus-outline"/>';
  const sides = { TRIANGLE: 3, SQUARE: 4, PENTAGON: 5, HEXAGON: 6 }[shapeId] || 4;
  return `<polygon points="${polygonPoints(60,60,49,sides)}" class="stimulus-outline"/>`;
}
function innerNode(kind, cx, cy) {
  if (kind === 'circle') return `<circle cx="${cx}" cy="${cy}" r="8" class="stimulus-node"/>`;
  if (kind === 'square') return `<rect x="${cx-8}" y="${cy-8}" width="16" height="16" class="stimulus-node"/>`;
  return `<rect x="${cx-7}" y="${cy-7}" width="14" height="14" transform="rotate(45 ${cx} ${cy})" class="stimulus-node"/>`;
}
function polygonPoints(cx,cy,r,sides) { return Array.from({length:sides},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/sides;return `${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`;}).join(' '); }
function drawOuterCanvas(ctx, shapeId, r) { const sides = shapeId === 'CIRCLE' ? 0 : ({TRIANGLE:3,SQUARE:4,PENTAGON:5,HEXAGON:6}[shapeId]||4);ctx.beginPath();if(!sides){ctx.arc(0,0,r,0,Math.PI*2);return;}for(let i=0;i<sides;i+=1){const a=-Math.PI/2+i*Math.PI*2/sides;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath(); }
function drawNodeCanvas(ctx, kind, x, y, r) { ctx.beginPath();if(kind==='circle'){ctx.arc(x,y,r,0,Math.PI*2);}else if(kind==='square'){ctx.rect(x-r,y-r,r*2,r*2);}else{ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();}ctx.stroke(); }
