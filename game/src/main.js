// Boot and the one loop: input is read once a frame, the run advances in fixed 1/60 s steps (several
// in a slow frame, none in a fast one) and the renderer paints whatever is there. Screens: title,
// play, paused, caught, escaped.
//
// ?seed=N fixes the course. ?shot=start|play|caught|escaped stages one frame of a fresh run (through
// shots.js when it is there) and sets window.__shotReady once that frame is on the canvas.
import { BEST_KEY, FARMER } from './config.js';
import { createRun, OUTCOME_NONE, OUTCOME_CAUGHT, OUTCOME_ESCAPED,
  EVT_JUMP, EVT_CORN, EVT_CRASH, EVT_ESCAPE } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawBackground, drawTurkey, drawFarmer, drawObstacles, drawHud,
  drawTitle, drawPaused, drawCaught, drawEscaped } from './render.js';

const FIXED = 1 / 60;      // simulation step, seconds
const MAX_FRAME = 0.25;    // a longer stall (hidden tab) is dropped, never replayed
const MAX_STEPS = 8;       // catch-up cap per frame
const W = 1280;
const H = 800;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('announce') ?? { textContent: '' };
canvas.width = W;
canvas.height = H;

let run = createRun(seed);
let input = null;
const audio = createAudio();
let screen = 'title';
let best = readBest();
let clock = 1;             // seconds on the page; drives the prompts on the title and end screens
let acc = 0;
let last = performance.now();
let painted = false;

/** Best score so far, read through a guard: storage can be off (private windows). */
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** The world, then the readout, then whichever screen sits over it. */
function paint() {
  const state = run.state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state.shake > 0) {
    ctx.translate(Math.sin(state.time * 47) * state.shake, Math.cos(state.time * 59) * state.shake * 0.6);
  }
  drawBackground(ctx, state);
  drawObstacles(ctx, state);
  drawFarmer(ctx, state);
  drawTurkey(ctx, state);
  ctx.restore();
  drawHud(ctx, state);
  // The screens pulse their prompts off the page clock; the run's own time is left alone.
  const view = { ...state, time: clock };
  if (screen === 'title') drawTitle(ctx, view, best);
  else if (screen === 'paused') drawPaused(ctx);
  else if (screen === 'caught') drawCaught(ctx, view);
  else if (screen === 'escaped') drawEscaped(ctx, view);
  if (!painted) {
    painted = true;
    window.__shotReady = true;
  }
}

/** Move to a screen; a run only ever starts from a fresh world. */
function go(next, message) {
  if (next === 'play' && screen !== 'paused') run = createRun(seed);
  screen = next;
  acc = 0;
  status.textContent = message;
}

function finishRun() {
  if (run.state.score > best) {
    best = run.state.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // Storage off: the best lasts this visit only.
    }
  }
  const escaped = run.state.outcome === OUTCOME_ESCAPED;
  clock = 1;
  go(escaped ? 'escaped' : 'caught', `${escaped ? 'Escaped' : 'Caught'}. Score ${run.state.score}. Best ${best}.`);
}

/** One fixed step with this frame's intents, and the sounds the events ask for. */
const SOUNDS = [[EVT_JUMP, 'playJump'], [EVT_CORN, 'playPickup'], [EVT_CRASH, 'playHit'], [EVT_ESCAPE, 'playEscape']];

function simulate() {
  const events = run.step(FIXED, {
    jump: input.consumeJump(),
    slide: input.consumeSlidePress(),
    hold: input.isSliding(),
  });
  for (const [flag, sound] of SOUNDS) if (events & flag) audio[sound]();
  if (run.state.outcome !== OUTCOME_NONE) {
    if (run.state.outcome === OUTCOME_CAUGHT) audio.playCaught();
    finishRun();
  }
}

function handleKeys() {
  if (input.consumeMute()) status.textContent = audio.toggleMute() ? 'Muted.' : 'Sound on.';
  if (input.consumePause()) {
    if (screen === 'paused') go('play', 'Running.');
    else if (screen === 'play') go('paused', 'Paused.');
  }
  if (input.consumeRestart() && screen !== 'title') go('play', 'Running.');
  if (input.consumeConfirm()) {
    if (screen === 'paused') go('play', 'Running.');
    else if (screen !== 'play') go('play', 'Running. Three lives, 1500 metres to the treeline.');
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  clock += elapsed;
  handleKeys();
  if (screen === 'play') {
    acc += elapsed;
    let steps = 0;
    while (acc >= FIXED && screen === 'play' && steps < MAX_STEPS) {
      simulate();
      acc -= FIXED;
      steps += 1;
    }
    if (screen !== 'play') acc = 0;
  } else {
    acc = 0;
  }
  paint();
}

function bootGame() {
  input = createInput(canvas, () => audio.unlock());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') go('paused', 'Paused.');
  });
  status.textContent = 'Turkey Run. Press Space or click to start.';
  requestAnimationFrame(frame);
}

// --- ?shot=: stage one frame, then stand still -----------------------------------------------

/** Simple look-ahead pilot: jump low shapes, slide under high ones. */
function autopilot(horizon) {
  const ahead = run.nearestAhead(0);
  if (ahead === null) return { jump: false, slide: false, hold: false };
  const reach = (ahead.x - 330) / Math.max(180, run.state.speed);
  const near = reach > 0 && reach < horizon;
  if (ahead.high) return { jump: false, slide: near, hold: near };
  return { jump: near && !run.state.turkey.airborne, slide: false, hold: false };
}

/** Play `seconds` with the pilot; on a lost run, start a fresh one and keep filling the time. */
function playScripted(seconds, horizon, restarts) {
  for (let i = 0; i < seconds / FIXED; i += 1) {
    if (run.state.outcome !== OUTCOME_NONE) {
      if (!restarts) return;
      run.reset();
    }
    run.step(FIXED, autopilot(horizon));
  }
}

function shoot() {
  clock = 1;
  let frames = 0;
  function staged() {
    paint();
    frames += 1;
    if (frames < 2) requestAnimationFrame(staged);
    else window.__shotReady = true;
  }
  requestAnimationFrame(staged);
}

/** The staged scenes for when shots.js is not there: start, a mid-run frame, and the two endings. */
const SCENES = {
  start: () => { playScripted(5, 0.45, false); screen = 'title'; },
  play: () => { playScripted(26, 0.45, true); screen = 'play'; },
  escaped: () => { playScripted(600, 0.45, true); run.state.outcome = OUTCOME_ESCAPED; screen = 'escaped'; },
  caught: () => {
    playScripted(600, 0.18, false);
    if (run.state.outcome === OUTCOME_NONE) {
      run.state.outcome = OUTCOME_CAUGHT;
      run.state.lives = 0;
      run.state.gap = FARMER.catchGap;
    }
    screen = 'caught';
  },
};

async function bootShot(name) {
  try {
    const mod = await import('./shots.js');
    if (typeof mod.stageShot === 'function') {
      const scene = mod.stageShot(name, run);
      if (scene && typeof scene.screen === 'string') screen = scene.screen;
      if (scene && Number.isFinite(scene.best)) best = scene.best;
      shoot();
      return;
    }
  } catch {
    // shots.js is not written yet: fall through to the staging below.
  }
  (SCENES[name === 'end' ? 'caught' : name] ?? SCENES.start)();
  shoot();
}

if (shot !== null) bootShot(shot);
else bootGame();

// A read-only window onto the loop, for the screenshot pass and for poking at a live run.
window.__turkeyRun = { get screen() { return screen; }, get state() { return run.state; }, get best() { return best; } };
