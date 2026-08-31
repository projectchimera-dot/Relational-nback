import { RELATIONS, SHAPES } from './constants.js';
import { relationGlyphSVG } from './symbols.js';

export function renderWiki(container) {
  container.innerHTML = `
    <section class="wiki-section">
      <h3>THE COMPARISON DIRECTION</h3>
      <div class="wiki-grid">
        <article class="wiki-card"><h4>One rule everywhere</h4><p><b>Remembered N-back = prompt(Current).</b> If the current sound is 9 and the prompt is -3, press Sound only when the digit N trials ago was 6.</p></article>
        <article class="wiki-card"><h4>Why prompts change</h4><p>The current prompt is part of the problem. A visual or auditory item is not a target by itself; it becomes a target only when its relation to the N-back item satisfies the prompt shown for that stream.</p></article>
      </div>
    </section>
    <section class="wiki-section">
      <h3>POSITION</h3>
      <table class="wiki-table"><thead><tr><th>PROMPT</th><th>TARGET CONDITION</th><th>MODES</th></tr></thead><tbody>
        <tr><td>North</td><td>N-back cell is one logical cell north of current.</td><td>2D + 3D</td></tr>
        <tr><td>South / East / West</td><td>Same rule in that logical direction.</td><td>2D + 3D</td></tr>
        <tr><td>Row</td><td>Same local Y row, different X.</td><td>2D + 3D</td></tr>
        <tr><td>Column</td><td>Same local X column, different Y.</td><td>2D + 3D</td></tr>
        <tr><td>Above / Below</td><td>N-back cell is ±1 on the cube-local Z axis.</td><td>3D only</td></tr>
      </tbody></table>
    </section>
    <section class="wiki-section">
      <h3>SOUND · DIGITS 0–9</h3>
      <div class="wiki-grid">
        <article class="wiki-card"><h4>Before / After</h4><p>Before means current - 1. After means current + 1. Example: current 4 + After → remembered 5.</p></article>
        <article class="wiki-card"><h4>±x</h4><p>Add the displayed signed offset to the current digit. Only offsets that stay inside 0–9 are generated.</p></article>
      </div>
    </section>
    <section class="wiki-section">
      <h3>SHAPE · SIDE VALUES</h3>
      <table class="wiki-table"><thead><tr><th>SHAPE</th><th>VALUE</th></tr></thead><tbody>${SHAPES.map(s=>`<tr><td>${s.label}</td><td>${s.sides}</td></tr>`).join('')}</tbody></table>
      <div class="wiki-grid" style="margin-top:10px"><article class="wiki-card"><h4>Fewer / More</h4><p>The remembered shape must have fewer or more sides than the current outline.</p></article><article class="wiki-card"><h4>±x</h4><p>Apply the offset to the side value. Square (4) with -3 targets Circle (1). Unreachable side counts are never generated.</p></article></div>
    </section>
    <section class="wiki-section">
      <h3>RELATION SYMBOL BANK</h3>
      <div class="wiki-grid">${RELATIONS.map(relation => `<article class="wiki-card"><h4>${relation.label}</h4><p>Family: <b>${relation.family}</b> · Inverse: <b>${relation.inverse.replaceAll('_',' ')}</b></p><div class="symbol-row">${[0,1,2].map(v=>`<div class="symbol-tile">${relationGlyphSVG(relation.id,v)}</div>`).join('')}</div></article>`).join('')}</div>
      <div class="wiki-grid" style="margin-top:10px"><article class="wiki-card"><h4>Same relation</h4><p>Current and N-back decode to the exact same semantic relation, regardless of glyph variant.</p></article><article class="wiki-card"><h4>Inverse relation</h4><p>Contains ↔ Inside, Leads to ↔ Follows, Greater ↔ Less. Surface symbols may still use different node shapes.</p></article><article class="wiki-card"><h4>Same family</h4><p>Both decoded relations belong to the same structural family: equivalence, containment, sequence or magnitude.</p></article></div>
    </section>`;
}
