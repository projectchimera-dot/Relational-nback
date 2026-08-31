import { createTrialSequence } from './trialGenerator.js';
import { createScoreboard, scoreTrial, summarizeScoreboard, STREAMS } from './session.js';
import { render2DGrid, draw3DStimulus } from './renderers.js';
import { playDigit } from './audio.js';
import { renderWiki } from './wiki.js';
import { loadSettings, saveSettings, loadHistory, appendHistory, clearHistory } from './storage.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const views = Object.fromEntries($$('.view').map((view) => [view.dataset.view, view]));
const grid2d = $('#grid-2d');
const cube = $('#cube-3d');

let state = null;
let advanceTimer = null;
let hideTimer = null;
let animationFrame = null;
let rotationStart = performance.now();

const defaults = { n:2, trials:30, mode:'2d', intervalMs:2500, visibleMs:900, targetRate:0.35, maxOffset:4, feedback:true, speak:true };
applySettings({ ...defaults, ...(loadSettings() || {}) });
renderWiki($('#wiki-content'));
renderHistory();

$$('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
$('#setup-form').addEventListener('submit', (event) => { event.preventDefault(); startSession(readSettings()); });
$('#quit-session').addEventListener('click', () => finishSession(true));
$('#pause-session').addEventListener('click', togglePause);
$('#again-btn').addEventListener('click', () => state?.config && startSession(state.config));
$('#clear-history').addEventListener('click', () => { clearHistory(); renderHistory(); });
$$('.response-btn').forEach((button) => button.addEventListener('click', () => toggleResponse(button.dataset.stream)));
window.addEventListener('keydown', (event) => {
  if (!views.game.classList.contains('active') || state?.paused) return;
  const map = { a:'position', s:'sound', d:'shape', f:'relation' };
  const stream = map[event.key.toLowerCase()];
  if (stream) { event.preventDefault(); toggleResponse(stream); }
  if (event.key === ' ') { event.preventDefault(); togglePause(); }
});
window.addEventListener('resize', () => renderStimulus(state?.visible ?? false));

function navigate(name) {
  if (name !== 'game' && state?.running) stopTimers();
  Object.entries(views).forEach(([key, view]) => view.classList.toggle('active', key === name));
  $$('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.nav === name));
  if (name === 'history') renderHistory();
}

function readSettings() {
  return {
    mode: $('input[name="mode"]:checked').value,
    n: clampInt($('#n-level').value, 1, 9),
    trials: clampInt($('#trial-count').value, 5, 500),
    intervalMs: clampInt($('#trial-interval').value, 800, 10000),
    visibleMs: clampInt($('#visible-duration').value, 200, 8000),
    targetRate: clampInt($('#target-rate').value, 15, 65) / 100,
    maxOffset: clampInt($('#max-offset').value, 1, 9),
    feedback: $('#feedback-enabled').checked,
    speak: $('#speak-enabled').checked,
  };
}

function applySettings(config) {
  $(`input[name="mode"][value="${config.mode}"]`).checked = true;
  $('#n-level').value = config.n; $('#trial-count').value = config.trials; $('#trial-interval').value = config.intervalMs; $('#visible-duration').value = config.visibleMs;
  $('#target-rate').value = Math.round(config.targetRate*100); $('#max-offset').value = config.maxOffset; $('#feedback-enabled').checked = config.feedback; $('#speak-enabled').checked = config.speak;
}

function startSession(config) {
  stopTimers();
  saveSettings(config);
  const sequence = createTrialSequence({ n:config.n, trials:config.trials, mode:config.mode, targetRate:config.targetRate, maxOffset:config.maxOffset });
  state = { config, sequence, index:0, responses:emptyResponses(), scoreboard:createScoreboard(), running:true, paused:false, visible:true, lastVerdicts:null, startedAt:Date.now() };
  navigate('game');
  $('#n-label').textContent = `${config.n}-BACK`;
  $('#mode-label').textContent = modeName(config.mode);
  cube.style.display = config.mode === '2d' ? 'none' : 'block';
  grid2d.style.display = config.mode === '2d' ? 'grid' : 'none';
  $('#pause-overlay').hidden = true; $('#pause-session').textContent = 'PAUSE';
  clearVerdicts();
  rotationStart = performance.now();
  presentTrial();
  animateCube();
}

function presentTrial() {
  if (!state?.running || state.paused) return;
  state.responses = emptyResponses(); state.visible = true;
  updateButtons(); updateTrialHeader(); renderPrompts(); renderStimulus(true);
  playDigit(currentTrial().number, state.config.speak);
  clearTimeout(hideTimer); clearTimeout(advanceTimer);
  hideTimer = setTimeout(() => { if(state?.running && !state.paused){ state.visible=false; renderStimulus(false); } }, Math.min(state.config.visibleMs, state.config.intervalMs-100));
  advanceTimer = setTimeout(advanceTrial, state.config.intervalMs);
}

function advanceTrial() {
  if (!state?.running || state.paused) return;
  finalizeCurrent();
  if (state.index >= state.sequence.length - 1) { finishSession(false); return; }
  state.index += 1;
  presentTrial();
}

function finalizeCurrent() {
  const trial = currentTrial();
  if (!trial.scored) return;
  const verdicts = scoreTrial(state.scoreboard, trial.targets, state.responses, trial.lures);
  state.lastVerdicts = verdicts;
  if (state.config.feedback) showVerdicts(verdicts);
}

function toggleResponse(stream) {
  if (!state?.running || state.paused || !currentTrial().scored) return;
  state.responses[stream] = !state.responses[stream];
  updateButtons();
}
function updateButtons() { STREAMS.forEach(stream => $(`.response-btn[data-stream="${stream}"]`).classList.toggle('pressed', Boolean(state?.responses[stream]))); }

function renderPrompts() {
  const p = currentTrial().prompts;
  $('#prompt-position').textContent = formatPosition(p.position);
  $('#prompt-sound').textContent = formatNumericPrompt(p.sound);
  $('#prompt-shape').textContent = formatShapePrompt(p.shape);
  $('#prompt-relation').textContent = ({SAME:'SAME RELATION',INVERSE:'INVERSE',SAME_FAMILY:'SAME FAMILY'})[p.relation] || p.relation;
}

function renderStimulus(visible) {
  if (!state?.running) return;
  if (state.config.mode === '2d') render2DGrid(grid2d, currentTrial(), visible);
  else draw3DStimulus(cube, currentTrial(), { yaw: state.config.mode === '3d-static' ? .72 : getRotation(), pitch:-.43, visible });
}
function animateCube() { cancelAnimationFrame(animationFrame); const loop=()=>{ if(state?.running && state.config.mode==='3d-rotating' && !state.paused) draw3DStimulus(cube,currentTrial(),{yaw:getRotation(),pitch:-.43,visible:state.visible}); if(state?.running) animationFrame=requestAnimationFrame(loop);}; animationFrame=requestAnimationFrame(loop); }
function getRotation() { return .45 + (performance.now()-rotationStart)/4200; }

function updateTrialHeader() {
  const trial = currentTrial();
  const scoredNumber = Math.max(0, state.index - state.config.n + 1);
  $('#trial-label').textContent = trial.scored ? `TRIAL ${scoredNumber} / ${state.config.trials}` : `WARM-UP ${state.index+1} / ${state.config.n}`;
  $('#progress-fill').style.width = `${Math.min(100, scoredNumber/state.config.trials*100)}%`;
}

function showVerdicts(verdicts) {
  STREAMS.forEach((stream) => {
    const el = $(`#verdict-${stream}`); const v = verdicts[stream];
    el.textContent = v.replaceAll('_',' ');
    el.className = `verdict ${v === 'HIT' || v === 'CORRECT_REJECTION' ? 'good' : 'bad'}`;
  });
  setTimeout(clearVerdicts, Math.min(650, state?.config.intervalMs/3 || 650));
}
function clearVerdicts() { STREAMS.forEach(stream=>{const el=$(`#verdict-${stream}`);el.textContent='';el.className='verdict';}); }

function togglePause() {
  if (!state?.running) return;
  state.paused = !state.paused;
  $('#pause-overlay').hidden = !state.paused;
  $('#pause-session').textContent = state.paused ? 'RESUME' : 'PAUSE';
  if (state.paused) { clearTimeout(advanceTimer);clearTimeout(hideTimer); if(globalThis.speechSynthesis) globalThis.speechSynthesis.cancel(); }
  else { rotationStart = performance.now() - 800; presentTrial(); }
}

function finishSession(aborted) {
  if (!state) { navigate('setup'); return; }
  stopTimers(); state.running = false;
  if (aborted) { navigate('setup'); state=null; return; }
  const summary = summarizeScoreboard(state.scoreboard);
  const record = { id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, date:new Date().toISOString(), mode:state.config.mode, n:state.config.n, trials:state.config.trials, durationSec:Math.round((Date.now()-state.startedAt)/1000), combinedAccuracy:summary.combinedAccuracy, streams:Object.fromEntries(STREAMS.map(s=>[s,summary.streams[s].accuracy])) };
  appendHistory(record); renderResults(summary); renderHistory(); navigate('results');
}
function stopTimers() { clearTimeout(advanceTimer);clearTimeout(hideTimer);cancelAnimationFrame(animationFrame); if(globalThis.speechSynthesis) globalThis.speechSynthesis.cancel(); }
function renderResults(summary) { $('#combined-score').textContent=`${summary.combinedAccuracy}%`; $('#result-streams').innerHTML=STREAMS.map(s=>`<div class="result-card"><span>${s.toUpperCase()}</span><strong>${summary.streams[s].accuracy}%</strong></div>`).join(''); }
function renderHistory() { const history=loadHistory(); $('#history-content').innerHTML = history.length ? `<div class="history-list">${history.map(item=>`<article class="history-item"><div><b>${modeName(item.mode)} · ${item.n}-BACK</b><br><small>${new Date(item.date).toLocaleString()} · ${item.trials} trials</small></div><strong>${item.combinedAccuracy}%</strong><div class="history-streams">${STREAMS.map(s=>`<span>${s[0].toUpperCase()} ${item.streams[s]}%</span>`).join('')}</div></article>`).join('')}</div>` : '<div class="empty-state">No completed sessions yet.</div>'; }

function currentTrial() { return state.sequence[state.index]; }
function emptyResponses() { return {position:false,sound:false,shape:false,relation:false}; }
function clampInt(value,min,max){return Math.min(max,Math.max(min,Number.parseInt(value,10)||min));}
function modeName(mode){return mode==='2d'?'2D':mode==='3d-static'?'3D STATIC':'3D ROTATING';}
function formatPosition(prompt){return ({NORTH:'NORTH ↑',SOUTH:'SOUTH ↓',EAST:'EAST →',WEST:'WEST ←',ROW:'ROW',COLUMN:'COLUMN',ABOVE:'ABOVE',BELOW:'BELOW'})[prompt]||prompt;}
function formatNumericPrompt(prompt){if(prompt.type==='BEFORE')return 'BEFORE';if(prompt.type==='AFTER')return 'AFTER';return `${prompt.delta>=0?'+':''}${prompt.delta}`;}
function formatShapePrompt(prompt){if(prompt.type==='FEWER')return 'FEWER SIDES';if(prompt.type==='MORE')return 'MORE SIDES';return `${prompt.delta>=0?'+':''}${prompt.delta} SIDES`;}
