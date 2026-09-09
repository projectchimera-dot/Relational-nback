import { createTrialSequence, normalizeConfig, shapeIdsFromConfig } from './trialGenerator.js';
import { createScoreboard, scoreTrial, summarizeScoreboard, STREAMS } from './session.js';
import { render2DGrid, draw3DStimulus } from './renderers.js';
import { playDigit, preloadDigitAudio } from './audio.js';
import { renderWiki } from './wiki.js';
import { loadSettings, saveSettings, loadHistory, appendHistory, clearHistory } from './storage.js';
import { DEFAULT_SHAPE_POOL, DEFAULT_STREAMS, STREAM_HOTKEYS } from './constants.js';

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

const defaults = normalizeConfig({ n: 2, trials: 30, mode: '2d', intervalMs: 2500, visibleMs: 900, targetRate: 0.35, maxOffset: 4, feedback: true, streams: DEFAULT_STREAMS, variableN: false, variableFloor: 1, enabledShapes: DEFAULT_SHAPE_POOL });
applySettings(normalizeConfig({ ...defaults, ...(loadSettings() || {}) }));
renderWiki($('#wiki-content'));
renderHistory();
preloadDigitAudio().catch(() => {});
refreshVariableFloorUI();
wireShapePoolGuards();

$$('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
$('#setup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  startSession(readSettings());
});
$('#quit-session').addEventListener('click', () => finishSession(true));
$('#pause-session').addEventListener('click', togglePause);
$('#again-btn').addEventListener('click', () => state?.config && startSession(state.config));
$('#clear-history').addEventListener('click', () => { clearHistory(); renderHistory(); });
$$('.response-btn').forEach((button) => button.addEventListener('click', () => toggleResponse(button.dataset.stream)));
$('#variable-n').addEventListener('change', refreshVariableFloorUI);
$('#n-level').addEventListener('input', () => {
  const n = clampInt($('#n-level').value, 1, 9);
  $('#variable-floor').max = n;
  if (clampInt($('#variable-floor').value, 1, n) > n) $('#variable-floor').value = n;
});
window.addEventListener('keydown', (event) => {
  if (!views.game.classList.contains('active') || state?.paused) return;
  const map = { a: 'position', s: 'sound', d: 'shape', f: 'relation' };
  const stream = map[event.key.toLowerCase()];
  if (stream && state?.config.streams?.[stream]) { event.preventDefault(); toggleResponse(stream); }
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
  const base = normalizeConfig({
    mode: $('input[name="mode"]:checked').value,
    n: clampInt($('#n-level').value, 1, 9),
    trials: clampInt($('#trial-count').value, 5, 500),
    intervalMs: clampInt($('#trial-interval').value, 800, 10000),
    visibleMs: clampInt($('#visible-duration').value, 200, 8000),
    targetRate: clampInt($('#target-rate').value, 15, 65) / 100,
    maxOffset: clampInt($('#max-offset').value, 1, 9),
    feedback: $('#feedback-enabled').checked,
    variableN: $('#variable-n').checked,
    variableFloor: clampInt($('#variable-floor').value, 1, clampInt($('#n-level').value, 1, 9)),
    streams: {
      position: $('#stream-position').checked,
      sound: $('#stream-sound').checked,
      shape: $('#stream-shape').checked,
      relation: $('#stream-relation').checked,
    },
    enabledShapes: {
      CIRCLE: $('#shape-circle').checked,
      TRIANGLE: $('#shape-triangle').checked,
      SQUARE: $('#shape-square').checked,
      PENTAGON: $('#shape-pentagon').checked,
      HEXAGON: $('#shape-hexagon').checked,
    },
  });
  if (!Object.values(base.streams).some(Boolean)) base.streams.position = true;
  if (shapeIdsFromConfig(base.enabledShapes).length < 2) {
    base.enabledShapes = { ...DEFAULT_SHAPE_POOL };
    applyShapePool(base.enabledShapes);
  }
  return base;
}

function applySettings(config) {
  const normalized = normalizeConfig(config);
  $(`input[name="mode"][value="${normalized.mode}"]`).checked = true;
  $('#n-level').value = normalized.n;
  $('#trial-count').value = normalized.trials;
  $('#trial-interval').value = normalized.intervalMs;
  $('#visible-duration').value = normalized.visibleMs;
  $('#target-rate').value = Math.round(normalized.targetRate * 100);
  $('#max-offset').value = normalized.maxOffset;
  $('#feedback-enabled').checked = normalized.feedback;
  $('#variable-n').checked = normalized.variableN;
  $('#variable-floor').value = normalized.variableFloor;
  $('#variable-floor').max = normalized.n;
  $('#stream-position').checked = normalized.streams.position;
  $('#stream-sound').checked = normalized.streams.sound;
  $('#stream-shape').checked = normalized.streams.shape;
  $('#stream-relation').checked = normalized.streams.relation;
  applyShapePool(normalized.enabledShapes);
  refreshVariableFloorUI();
}

function startSession(config) {
  stopTimers();
  const normalized = normalizeConfig(config);
  saveSettings(normalized);
  const sequence = createTrialSequence(normalized);
  const activeStreams = STREAMS.filter((stream) => normalized.streams[stream]);
  state = {
    config: normalized,
    sequence,
    index: 0,
    responses: emptyResponses(),
    scoreboard: createScoreboard(activeStreams),
    activeStreams,
    running: true,
    paused: false,
    visible: true,
    lastVerdicts: null,
    startedAt: Date.now(),
  };
  navigate('game');
  $('#mode-label').textContent = modeName(normalized.mode);
  cube.style.display = normalized.mode === '2d' ? 'none' : 'block';
  grid2d.style.display = normalized.mode === '2d' ? 'grid' : 'none';
  $('#pause-overlay').hidden = true;
  $('#pause-session').textContent = 'PAUSE';
  clearVerdicts();
  syncVisibleResponseCards();
  rotationStart = performance.now();
  presentTrial();
  animateCube();
}

function presentTrial() {
  if (!state?.running || state.paused) return;
  state.responses = emptyResponses();
  state.visible = true;
  updateButtons();
  updateTrialHeader();
  renderPrompts();
  renderStimulus(true);
  if (state.config.streams.sound) playDigit(currentTrial().number, true);
  clearTimeout(hideTimer);
  clearTimeout(advanceTimer);
  hideTimer = setTimeout(() => {
    if (state?.running && !state.paused) {
      state.visible = false;
      renderStimulus(false);
    }
  }, Math.min(state.config.visibleMs, state.config.intervalMs - 100));
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
  const verdicts = scoreTrial(state.scoreboard, trial.targets, state.responses, trial.lures, state.activeStreams);
  state.lastVerdicts = verdicts;
  if (state.config.feedback) showVerdicts(verdicts);
}

function toggleResponse(stream) {
  if (!state?.running || state.paused || !currentTrial().scored || !state.config.streams[stream]) return;
  state.responses[stream] = !state.responses[stream];
  updateButtons();
}

function updateButtons() {
  STREAMS.forEach((stream) => {
    const button = $(`.response-btn[data-stream="${stream}"]`);
    if (!button) return;
    button.classList.remove('hit', 'miss', 'false-alarm', 'correct-rejection');
    button.classList.toggle('pressed', Boolean(state?.responses[stream]));
  });
}

function renderPrompts() {
  const p = currentTrial().prompts;
  $('#prompt-position').textContent = formatPosition(p.position);
  $('#prompt-sound').textContent = formatNumericPrompt(p.sound);
  $('#prompt-shape').textContent = formatShapePrompt(p.shape);
  $('#prompt-relation').textContent = ({ SAME: 'SAME RELATION', INVERSE: 'INVERSE', SAME_FAMILY: 'SAME FAMILY' })[p.relation] || p.relation;
}

function renderStimulus(visible) {
  if (!state?.running) return;
  if (state.config.mode === '2d') render2DGrid(grid2d, currentTrial(), visible, state.config.streams);
  else draw3DStimulus(cube, currentTrial(), { yaw: state.config.mode === '3d-static' ? 0.72 : getRotation(), pitch: -0.43, visible, streams: state.config.streams });
}

function animateCube() {
  cancelAnimationFrame(animationFrame);
  const loop = () => {
    if (state?.running && state.config.mode === '3d-rotating' && !state.paused) draw3DStimulus(cube, currentTrial(), { yaw: getRotation(), pitch: -0.43, visible: state.visible, streams: state.config.streams });
    if (state?.running) animationFrame = requestAnimationFrame(loop);
  };
  animationFrame = requestAnimationFrame(loop);
}
function getRotation() { return 0.45 + (performance.now() - rotationStart) / 4200; }

function updateTrialHeader() {
  const trial = currentTrial();
  const scoredNumber = Math.max(0, state.index - state.config.n + 1);
  $('#trial-label').textContent = trial.scored ? `TRIAL ${scoredNumber} / ${state.config.trials}` : `WARM-UP ${state.index + 1} / ${state.config.n}`;
  $('#n-label').textContent = state.config.variableN ? `${trial.nBack}-BACK · VAR` : `${state.config.n}-BACK`;
  $('#trial-n-display').textContent = `N = ${trial.nBack}`;
  $('#progress-fill').style.width = `${Math.min(100, (scoredNumber / state.config.trials) * 100)}%`;
}

function showVerdicts(verdicts) {
  STREAMS.forEach((stream) => {
    const el = $(`#verdict-${stream}`);
    const button = $(`.response-btn[data-stream="${stream}"]`);
    if (!el || !button) return;
    const verdict = verdicts[stream];
    if (verdict === 'INACTIVE') {
      el.textContent = '';
      el.className = 'verdict';
      return;
    }
    el.textContent = verdict.replaceAll('_', ' ');
    const good = verdict === 'HIT' || verdict === 'CORRECT_REJECTION';
    const warn = verdict === 'MISS';
    el.className = `verdict ${good ? 'good' : warn ? 'warn' : 'bad'}`;
    button.classList.toggle('hit', verdict === 'HIT');
    button.classList.toggle('miss', verdict === 'MISS');
    button.classList.toggle('false-alarm', verdict === 'FALSE_ALARM');
    button.classList.toggle('correct-rejection', verdict === 'CORRECT_REJECTION');
  });
  setTimeout(clearVerdicts, Math.min(650, state?.config.intervalMs / 3 || 650));
}

function clearVerdicts() {
  STREAMS.forEach((stream) => {
    const el = $(`#verdict-${stream}`);
    const button = $(`.response-btn[data-stream="${stream}"]`);
    if (el) { el.textContent = ''; el.className = 'verdict'; }
    if (button) button.classList.remove('hit', 'miss', 'false-alarm', 'correct-rejection');
  });
}

function togglePause() {
  if (!state?.running) return;
  state.paused = !state.paused;
  $('#pause-overlay').hidden = !state.paused;
  $('#pause-session').textContent = state.paused ? 'RESUME' : 'PAUSE';
  if (state.paused) {
    clearTimeout(advanceTimer);
    clearTimeout(hideTimer);
  } else {
    rotationStart = performance.now() - 800;
    presentTrial();
  }
}

function finishSession(aborted) {
  if (!state) { navigate('setup'); return; }
  stopTimers(); state.running = false;
  if (aborted) { navigate('setup'); state = null; return; }
  const summary = summarizeScoreboard(state.scoreboard, state.activeStreams);
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    mode: state.config.mode,
    n: state.config.n,
    variableN: state.config.variableN,
    variableFloor: state.config.variableFloor,
    trials: state.config.trials,
    durationSec: Math.round((Date.now() - state.startedAt) / 1000),
    combinedAccuracy: summary.combinedAccuracy,
    streams: Object.fromEntries(state.activeStreams.map((s) => [s, summary.streams[s].accuracy])),
  };
  appendHistory(record);
  renderResults(summary);
  renderHistory();
  navigate('results');
}
function stopTimers() { clearTimeout(advanceTimer); clearTimeout(hideTimer); cancelAnimationFrame(animationFrame); }

function renderResults(summary) {
  $('#combined-score').textContent = `${summary.combinedAccuracy}%`;
  $('#result-streams').innerHTML = state.activeStreams.map((s) => {
    const streamSummary = summary.streams[s];
    return `<div class="result-card"><span>${s.toUpperCase()}</span><strong>${streamSummary.accuracy}%</strong><small>${streamSummary.hit + streamSummary.correctRejection}/${streamSummary.total}</small></div>`;
  }).join('');
}

function renderHistory() {
  const history = loadHistory();
  $('#history-content').innerHTML = history.length ? `<div class="history-list">${history.map(item => `<article class="history-item"><div><b>${modeName(item.mode)} · ${item.variableN ? `VAR ${item.variableFloor}-${item.n}` : `${item.n}-BACK`}</b><br><small>${new Date(item.date).toLocaleString()} · ${item.trials} trials</small></div><strong>${item.combinedAccuracy}%</strong><div class="history-streams">${Object.entries(item.streams).map(([s, accuracy]) => `<span>${s[0].toUpperCase()} ${accuracy}%</span>`).join('')}</div></article>`).join('')}</div>` : '<div class="empty-state">No completed sessions yet.</div>';
}

function currentTrial() { return state.sequence[state.index]; }
function emptyResponses() { return { position: false, sound: false, shape: false, relation: false }; }
function clampInt(value, min, max) { return Math.min(max, Math.max(min, Number.parseInt(value, 10) || min)); }
function modeName(mode) { return mode === '2d' ? '2D' : mode === '3d-static' ? '3D STATIC' : '3D ROTATING'; }
function formatPosition(prompt) { return ({ NORTH: 'NORTH ↑', SOUTH: 'SOUTH ↓', EAST: 'EAST →', WEST: 'WEST ←', ROW: 'ROW', COLUMN: 'COLUMN', ABOVE: 'ABOVE', BELOW: 'BELOW' })[prompt] || prompt; }
function formatNumericPrompt(prompt) { if (prompt.type === 'BEFORE') return 'BEFORE'; if (prompt.type === 'AFTER') return 'AFTER'; return `${prompt.delta >= 0 ? '+' : ''}${prompt.delta}`; }
function formatShapePrompt(prompt) { if (prompt.type === 'FEWER') return 'FEWER SIDES'; if (prompt.type === 'MORE') return 'MORE SIDES'; return `${prompt.delta >= 0 ? '+' : ''}${prompt.delta} SIDES`; }

function syncVisibleResponseCards() {
  STREAMS.forEach((stream) => {
    const card = $(`.response-card[data-card="${stream}"]`);
    card?.classList.toggle('hidden', !state.config.streams[stream]);
    if (!state.config.streams[stream]) {
      const verdict = $(`#verdict-${stream}`);
      if (verdict) verdict.textContent = '';
    }
  });
}

function refreshVariableFloorUI() {
  const enabled = $('#variable-n').checked;
  $('#variable-floor-row').hidden = !enabled;
}

function applyShapePool(pool) {
  $('#shape-circle').checked = pool.CIRCLE !== false;
  $('#shape-triangle').checked = pool.TRIANGLE !== false;
  $('#shape-square').checked = pool.SQUARE !== false;
  $('#shape-pentagon').checked = pool.PENTAGON !== false;
  $('#shape-hexagon').checked = pool.HEXAGON !== false;
}

function wireShapePoolGuards() {
  $$('.shape-toggle input').forEach((input) => input.addEventListener('change', () => {
    if (currentShapeSelectionCount() >= 2) return;
    input.checked = true;
  }));
  $$('.stream-toggle input').forEach((input) => input.addEventListener('change', () => {
    if (currentStreamSelectionCount() >= 1) return;
    input.checked = true;
  }));
}

function currentShapeSelectionCount() {
  return ['#shape-circle', '#shape-triangle', '#shape-square', '#shape-pentagon', '#shape-hexagon'].filter((selector) => $(selector).checked).length;
}

function currentStreamSelectionCount() {
  return ['#stream-position', '#stream-sound', '#stream-shape', '#stream-relation'].filter((selector) => $(selector).checked).length;
}
