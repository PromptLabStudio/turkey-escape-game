// Staged scenes for the ?shot= screenshots: each takes the run from createRun(seed), plays the real
// world rules forward with a deterministic autopilot, and hands back the screen main.js should paint.
import { TURKEY, STAGES, FIELD, stageIndex } from './config.js';
import { OUTCOME_NONE, OUTCOME_CAUGHT, OUTCOME_ESCAPED } from './world.js';

const FIXED = 1 / 60;
const GROUND = FIELD.groundY;
const IDLE = { jump: false, slide: false, hold: false };
const NOSE = TURKEY.screenX + TURKEY.bodyW / 2;   // front edge of the body
const TAIL = TURKEY.screenX - TURKEY.bodyW / 2;   // back edge of the body
const LIFT = Math.abs(TURKEY.jumpVelocity);       // launch speed, 1080 px/s
const PULL = Math.abs(TURKEY.gravity);            // gravity, 2600 px/s²
const AIR = (2 * LIFT) / PULL;                    // whole arc in the air, 0.83 s
const bestFor = (run, floor) => Math.max(floor, run.state.score + 350);   // HUD "best" per scene
/** Deterministic noise in [0, 1); the clumsy pilot's slips come from here, never from Math.random. */
function noise(seed, tick) {
  let h = (Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(tick + 1, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
/** The nearest obstacle whose box still reaches past the turkey's tail. */
function nearestAhead(run) {
  let best = null;
  for (const ob of run.state.obstacles) if (ob.x + ob.w >= TAIL && (best === null || ob.x < best.x)) best = ob;
  return best;
}
/** Seconds until the body first meets `node`; negative while already inside it, -1 when behind. */
function lead(state, node) {
  const speed = Math.max(1, state.speed);
  if (node.x + node.w < TAIL) return -1;
  return node.x > NOSE ? (node.x - NOSE) / speed : -0.5;
}
/**
 * Walk the jump arc a launch on this step would take, frame for frame, while a box `w` wide at `x`
 * scrolls past: `hit(feet)` reports a touch, and the answer says whether the box was passed and
 * whether the arc ever touched it. The engine's own arithmetic, so a launch chosen here lands.
 */
function sweepJump(state, x, w, hit) {
  const stage = STAGES[state.stageNow];
  const target = stage.speed + stage.ramps * Math.max(0, state.metres - stage.start);
  let speed = Math.max(1, state.speed);
  let travel = 0;
  let y = 0;
  let vy = LIFT;
  let touched = false;
  for (let k = 1; k <= Math.ceil(AIR / FIXED); k += 1) {
    vy -= PULL * FIXED;
    y += vy * FIXED;
    speed += (target - speed) * Math.min(1, FIXED * 2.2);   // the stage keeps ramping under the arc
    travel += speed * FIXED;
    const bx = x - travel;
    if (bx + w >= TAIL - 4 && bx <= NOSE + 4 && hit(y)) touched = true;
    if (bx + w < TAIL - 4) return { passed: y > 0, touched };
    if (y <= 0) return { passed: false, touched };
  }
  return { passed: false, touched };
}

/**
 * The good pilot: slide under hanging shapes early enough to be down for the whole crossing, jump
 * low ones on the one step whose arc clears them, and hop for corn only when the road is open.
 */
function goodPilot(run) {
  const state = run.state;
  const turkey = state.turkey;
  const node = nearestAhead(run);
  let open = AIR + 0.4;   // seconds of clear road needed before a corn hop

  if (node !== null) {
    const t = lead(state, node);
    const span = (node.w + TURKEY.bodyW) / Math.max(1, state.speed);
    open = t;
    if (node.high && node.clear > TURKEY.crouchH + 12) {          // hanging: go under it
      const down = !turkey.airborne && t < span * 0.85 && t + span > -0.4;
      return { jump: false, slide: down, hold: down };
    }
    if (!turkey.airborne) {
      const sweep = sweepJump(state, node.x, node.w, (y) => y < node.h);
      if (sweep.passed && !sweep.touched) return { jump: true, slide: false, hold: false };
      if (t < AIR) return IDLE;   // too close to clear: stay on the ground
    }
  }

  if (!turkey.airborne && turkey.mercy === 0 && open > AIR + 0.4) {
    let corn = null;
    for (const p of state.pickups) if (!p.taken && p.x >= NOSE - 24 && (corn === null || p.x < corn.x)) corn = p;
    const touch = corn !== null && sweepJump(state, corn.x, 34, (y) =>
      GROUND - y - TURKEY.bodyH < corn.y + 24 && GROUND - y > corn.y - 24).touched;
    if (touch) return { jump: true, slide: false, hold: false };
  }
  return IDLE;
}

/**
 * Step the world at 1/60 s with `pilot` steering, for `seconds` or until `metres` is reached (whichever
 * comes first), stopping the moment the run ends.
 */
function play(run, seconds, pilot, metres = Infinity) {
  const steps = Math.round(seconds / FIXED);
  for (let i = 0; i < steps && run.state.outcome === OUTCOME_NONE && run.state.metres < metres; i += 1) {
    run.step(FIXED, pilot(run, i));
  }
}
/** Clear knives, sparks, flash and shake so a staged frame reads clean; `knives` puts a few back. */
function dress(run, knives = 0) {
  const state = run.state;
  const t = state.turkey;
  state.knives.length = 0;
  state.particles.length = 0;
  state.flash = 0;
  state.shake = 0;
  // A slide that has nothing left to duck under reads as a bug in a still frame: stand back up.
  const box = run.turkeyBox();
  const under = state.obstacles.some((ob) => ob.high && ob.x < box.x + box.w && ob.x + ob.w > box.x);
  if (t.sliding && !under) { t.sliding = false; t.slideLeft = 0; }
  for (let i = 0; i < knives; i += 1) {
    state.knives.push({ x: 640 + i * 300, y: 200 + i * 90, vy: 520, angle: 0.4 + i * 0.5, spin: 1.2, stuck: 0 });
  }
}
/** Footprints of the shapes a scene may place, mirroring world.js SHAPES. */
const DIMS = { fence: [76, 58], hay: [108, 74], crate: [80, 68], sack: [86, 64], oven: [132, 118] };
/** Put a `shape` at `x` unless one is already on screen, so the staged frame always shows it. */
function ensureShape(run, shape, x) {
  const state = run.state;
  if (state.obstacles.some((ob) => ob.shape === shape && ob.x + ob.w > 0 && ob.x < FIELD.width)) return;
  const [w, h] = DIMS[shape];
  const oven = shape === 'oven';
  state.obstacles.push({ shape, x, w, h, high: false, clear: 0, hit: false,
    lit: oven ? 0.5 : 1, fire: oven ? 0.6 : 0, wobble: 0, seed: 7 });
}

/** Lively farmyard behind the title: a couple of seconds of running, nothing close enough to hit. */
function sceneStart(run) {
  run.reset();
  dress(run);
  play(run, 2.4, goodPilot);
  // Push anything near the turkey's clear space out to the right; the scene keeps moving anyway.
  for (const ob of run.state.obstacles) if (ob.x < 660) ob.x += 560;
  dress(run);
  ensureShape(run, 'fence', 900);
  return { screen: 'title', best: bestFor(run, 4200) };
}

/** About twenty seconds of clean play, farmyard through the barn. */
function scenePlay(run) {
  // If a bad stretch of knives ends the run, take the same twenty seconds again further along.
  for (const start of [70, 84, 98, 112]) {
    run.reset();
    play(run, 240, goodPilot, start);
    play(run, 20, goodPilot);
    if (run.state.outcome === OUTCOME_NONE) break;
  }
  dress(run);
  ensureShape(run, 'hay', 900);
  return { screen: 'play', best: bestFor(run, 6400) };
}
/** Drop the run at the kitchen door, `offset` metres in, with the farmer as far back as allowed. */
function stageAtDoor(run, kitchen, offset) {
  run.reset();
  run.state.metres = kitchen + offset;
  run.state.stageNow = 2;
  run.state.speed = STAGES[2].speed;
  run.state.gap = STAGES[2].gapCeiling;
  run.state.timerObstacle = 0.4;
  run.state.timerKnife = 0.3;
}

/** The kitchen leg: past the kitchen start, then ten seconds with an oven and knives about. */
function sceneKitchen(run) {
  const kitchen = STAGES[2].start;
  run.reset();
  play(run, 240, goodPilot, kitchen + 8);
  if (stageIndex(run.state.metres) !== 2 || run.state.lives < 3) stageAtDoor(run, kitchen, 2);
  // The farmer starts this leg as far back as the stage allows, so ten clean seconds still survive.
  run.state.gap = STAGES[2].gapCeiling;
  play(run, 10, goodPilot);
  // Ovens are too wide to clear at kitchen speed, so a bad run of them can end the leg: take the
  // same ten seconds again a little further along the course, where the spawns fall differently.
  for (const offset of [20, 32, 44]) {
    if (run.state.outcome === OUTCOME_NONE) break;
    stageAtDoor(run, kitchen, offset);
    play(run, 10, goodPilot);
  }
  // An oven already half off the left edge reads as scenery, and it stops ensureShape from staging
  // a full one; drop anything that far behind the turkey so the hazard is properly in frame.
  run.state.obstacles = run.state.obstacles.filter((ob) => ob.shape !== 'oven' || ob.x > 220);
  dress(run, 2);
  ensureShape(run, 'oven', 820);
  return { screen: 'play', best: bestFor(run, 8200) };
}

/** The clumsy end: short look-ahead and whole obstacles misread, so the farmer runs the turkey down. */
function sceneEnd(run) {
  run.reset();
  const seed = Number.isInteger(run.state.seed) ? run.state.seed >>> 0 : 1;
  const fumbling = (r) => {
    const state = r.state;
    const node = nearestAhead(r);
    if (node === null) return IDLE;
    if (noise(seed ^ node.seed, 7) < 0.34) return IDLE;   // this one is simply misread
    const t = lead(state, node);
    if (t > 0.2 || t < -0.6) return IDLE;                 // short look-ahead: reacts at the last moment
    if (node.high) return { jump: false, slide: true, hold: true };
    return { jump: !state.turkey.airborne, slide: false, hold: false };
  };
  play(run, 240, goodPilot, 110);   // a few clean metres so the HUD has a score
  play(run, 60, fumbling);
  if (run.state.outcome === OUTCOME_NONE) {
    // Still upright: the farmer's creep closes it. Hold still and let the gap run down, step by step.
    const steps = Math.round(80 / FIXED);
    for (let i = 0; i < steps && run.state.outcome === OUTCOME_NONE; i += 1) {
      run.state.gap -= 0.09;
      run.step(FIXED, IDLE);
    }
  }
  if (run.state.outcome !== OUTCOME_CAUGHT) Object.assign(run.state, { outcome: OUTCOME_CAUGHT, lives: 0, gap: 26 });
  dress(run);
  return { screen: 'caught', best: bestFor(run, 2100) };
}

/**
 * The treeline: a clean run all the way to the finish. Knives and ovens can still end a good run
 * short, so the last stretch is taken again from the kitchen door, a little further along each time,
 * where the spawns fall differently; failing that, the outcome is forced the way sceneEnd does it.
 */
function sceneEscaped(run) {
  run.reset();
  play(run, 240, goodPilot, 1500);   // RULES.finishMetres: the step that crosses it ends the run
  const kitchen = STAGES[2].start;
  for (const offset of [440, 452, 464]) {
    if (run.state.outcome === OUTCOME_ESCAPED) break;
    stageAtDoor(run, kitchen, offset);
    // The farmer starts this leg as far back as the stage allows, so the last metres still survive.
    run.state.gap = STAGES[2].gapCeiling;
    play(run, 240, goodPilot, 1500);
  }
  if (run.state.outcome !== OUTCOME_ESCAPED) Object.assign(run.state, { outcome: OUTCOME_ESCAPED, metres: 1500, lives: Math.max(1, run.state.lives) });
  dress(run);
  return { screen: 'escaped', best: bestFor(run, 9000) };
}

const SCENES = { start: sceneStart, play: scenePlay, kitchen: sceneKitchen, end: sceneEnd, escaped: sceneEscaped };

/**
 * Stage `name` on `run` (from createRun(seed)) and report the screen main.js should paint plus a
 * best score for the HUD. Unknown names fall back to the title.
 */
export function stageShot(name, run) {
  const scene = Object.prototype.hasOwnProperty.call(SCENES, name) ? SCENES[name] : sceneStart;
  const result = scene(run);
  let screen = result.screen;
  if (run.state.outcome === OUTCOME_ESCAPED) screen = 'escaped';
  else if (run.state.outcome === OUTCOME_CAUGHT) screen = 'caught';
  return { screen, best: result.best };
}
