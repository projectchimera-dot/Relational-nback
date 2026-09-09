import { SHAPES } from './constants.js';
import { relationGuideData } from './symbols.js';

export function renderWiki(container) {
  const guides = relationGuideData();
  container.innerHTML = `
    <section class="wiki-section">
      <h3>THE COMPARISON DIRECTION</h3>
      <div class="wiki-grid">
        <article class="wiki-card"><h4>One rule everywhere</h4><p><b>Remembered N-back = prompt(Current).</b> If the current sound is 9 and the prompt is -3, press Sound only when the digit N trials ago was 6.</p></article>
        <article class="wiki-card"><h4>Variable N</h4><p>When Variable N is enabled, each scored trial can compare against a different distance between the chosen floor and the current max N.</p></article>
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
      <h3>SOUND · DIGITS 1–8</h3>
      <div class="wiki-grid">
        <article class="wiki-card"><h4>Pre-recorded clips</h4><p>Put your digit audio files in <code>assets/audio</code> as 1–8. The app looks for mp3, wav, ogg, or m4a files.</p></article>
        <article class="wiki-card"><h4>Before / After / ±x</h4><p>Before means current - 1. After means current + 1. Signed offsets are only generated when they stay inside 1–8.</p></article>
      </div>
    </section>
    <section class="wiki-section">
      <h3>SHAPE · SIDE VALUES</h3>
      <table class="wiki-table"><thead><tr><th>SHAPE</th><th>VALUE</th></tr></thead><tbody>${SHAPES.map(s => `<tr><td>${s.label}</td><td>${s.sides}</td></tr>`).join('')}</tbody></table>
      <div class="wiki-grid" style="margin-top:10px"><article class="wiki-card"><h4>Fewer / More</h4><p>The remembered outer shape must have fewer or more sides than the current outer shape.</p></article><article class="wiki-card"><h4>Shape pool</h4><p>You can disable relation shapes you do not want, but at least two must stay enabled.</p></article></div>
    </section>
    <section class="wiki-section">
      <h3>RELATION ICONS</h3>
      <div class="wiki-grid">
        <article class="wiki-card"><h4>How to read them</h4><p>The two shapes are never the same. Count their sides first: Circle = 1, Triangle = 3, Square = 4, Pentagon = 5, Hexagon = 6. <b>Left vs right never determines the relation.</b></p></article>
        <article class="wiki-card"><h4>Contains / Inside</h4><p><b>Contains:</b> the more-sided shape is outside and contains the fewer-sided shape. <b>Inside:</b> the more-sided shape is inside the fewer-sided shape.</p></article>
        <article class="wiki-card"><h4>Greater / Less</h4><p><b>Greater:</b> the more-sided shape is larger. <b>Less:</b> the more-sided shape is smaller. Which shape is on the left or right does not matter.</p></article>
        <article class="wiki-card"><h4>Leads to / Follows</h4><p>The shapes sit diagonally and overlap visibly near the center. <b>Leads to:</b> the more-sided shape is above. <b>Follows:</b> the more-sided shape is below. Left/right placement does not matter.</p></article>
        <article class="wiki-card"><h4>Meta-prompts</h4><p><b>Same relation</b> means exact same semantic relation. <b>Inverse</b> means its inverse pair. <b>Same family</b> means both belong to equivalence, containment, sequence, or magnitude.</p></article>
      </div>
      <div class="symbol-row">${guides.map((guide) => `<div class="symbol-tile">${guide.svg}<span>${guide.label}</span></div>`).join('')}</div>
      <div class="wiki-card" style="margin-top:10px"><h4>Reference sheet</h4><p>The uploaded guide sheet is included below as an extra visual reference.</p><img src="./assets/relations/relation-guide.png" alt="Relation icon guide" style="width:100%;border-radius:6px;border:1px solid #28282c"></div>
    </section>`;
}
