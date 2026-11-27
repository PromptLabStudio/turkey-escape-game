// The rules and state of a run, with no drawing and no browser in it: the turkey's jump and slide
// arc, the farmer's pursuit gap, obstacle spawning per stage, corn pickups, falling carving knives,
// collisions, lives, score, metres travelled, and the two ways a run ends (caught or escaped).
// step() returns what happened as bit flags so the loop can play a sound or change a screen.
import { TURKEY, FARMER, RULES, STAGES, FIELD, PX_PER_METRE, stageIndex } from './config.js';
import { makeRng } from './random.js';

const GROUND = FIELD.groundY;

export const OUTCOME_NONE = 0;
export const OUTCOME_CAUGHT = 1;
export const OUTCOME_ESCAPED = 2;

export const EVT_NONE = 0;
export const EVT_JUMP = 1;
export const EVT_LAND = 2;
export const EVT_CORN = 4;
export const EVT_CRASH = 8;
export const EVT_END = 16;
export const EVT_STAGE = 32;
export const EVT_ESCAPE = 64;

/**
 * Footprint and height of each obstacle shape, measured up from the ground. `high` shapes hang
 * from above with a clear gap under them: the turkey must slide through that gap.
 */
export const SHAPES = {
  fence: { w: 76, h: 58, high: false },
  hay: { w: 108, h: 74, high: false },
  crate: { w: 80, h: 68, high: false },
  sack: { w: 86, h: 64, high: false },
  oven: { w: 132, h: 118, high: false },
  gate: { w: 120, h: 210, clear: 98, high: true },
  beam: { w: 150, h: 230, clear: 104, high: true },
  rack: { w: 136, h: 200, clear: 92, high: true },
};

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function createRun(seed) {
  const rng = makeRng(seed);

  const state = {
    seed,
    time: 0,
    metres: 0,
    speed: STAGES[0].speed,
    stageNow: 0,
    score: 0,
    corn: 0,
    lives: RULES.lives,
    outcome: OUTCOME_NONE,
    gap: FARMER.startGap,
    shake: 0,
    stumble: 0,
    flash: 0,
    stageBanner: 0,
    turkey: { y: 0, vy: 0, airborne: false, sliding: false, slideLeft: 0, stride: 0, mercy: 0, squash: 0 },
    farmer: { stride: 0, swing: 0, angry: 0, lean: 0 },
    obstacles: [],
    pickups: [],
    knives: [],
    particles: [],
    timerObstacle: 1.25,
    timerKnife: 1.8,
    timerCorn: 0.9,
  };

  function stage() {
    return STAGES[state.stageNow];
  }

  function reset() {
    state.time = 0;
    state.metres = 0;
    state.speed = STAGES[0].speed;
    state.stageNow = 0;
    state.score = 0;
    state.corn = 0;
    state.lives = RULES.lives;
    state.outcome = OUTCOME_NONE;
    state.gap = FARMER.startGap;
    state.shake = 0;
    state.stumble = 0;
    state.flash = 0;
    state.stageBanner = 1.8;
    const t = state.turkey;
    t.y = 0;
    t.vy = 0;
    t.airborne = false;
    t.sliding = false;
    t.slideLeft = 0;
    t.stride = 0;
    t.mercy = 0;
    t.squash = 0;
    state.farmer.stride = 0;
    state.farmer.swing = 0;
    state.farmer.angry = 0;
    state.farmer.lean = 0;
    state.obstacles.length = 0;
    state.pickups.length = 0;
    state.knives.length = 0;
    state.particles.length = 0;
    state.timerObstacle = 1.4;
    state.timerKnife = 2.0;
    state.timerCorn = 0.9;
  }

  /** The turkey's hit box: tall while running and jumping, low while sliding on the ground. */
  function turkeyBox() {
    const t = state.turkey;
    const h = t.sliding && !t.airborne ? TURKEY.crouchH : TURKEY.bodyH;
    return { x: TURKEY.screenX - TURKEY.bodyW / 2, y: GROUND - t.y - h, w: TURKEY.bodyW, h };
  }

  function spark(x, y, count, color, spread) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x,
        y,
        vx: rng.range(-spread, spread),
        vy: rng.range(-spread * 0.9, spread * 0.3),
        life: rng.range(0.3, 0.7),
        size: rng.range(3, 8),
        color,
        spin: rng.range(-8, 8),
      });
    }
  }

  function spawnObstacle() {
    const st = stage();
    const high = rng.chance(st.highs);
    const shape = high ? rng.pick(st.highShapes) : rng.pick(st.lowShapes);
    const dims = SHAPES[shape];
    state.obstacles.push({
      shape,
      x: FIELD.width + rng.range(40, 130),
      w: dims.w,
      h: dims.h,
      high: dims.high === true,
      clear: dims.clear ?? 0,
      hit: false,
      lit: rng.range(0.2, RULES.flamePeriod),
      fire: 0,
      wobble: 0,
      seed: rng.int(0, 999),
    });
  }

  function spawnCorn(height) {
    state.pickups.push({
      x: FIELD.width + rng.range(20, 210),
      // `height` is how far above the ground the cob hangs; the pickup is stored in screen space.
      y: GROUND - height,
      phase: rng.range(0, 6.28),
      taken: false,
    });
  }

  function spawnKnife() {
    state.knives.push({
      x: TURKEY.screenX + rng.range(-30, 230),
      y: -90,
      vy: rng.range(470, 610),
      angle: rng.range(-0.5, 0.5),
      spin: rng.range(-2.4, 2.4),
      stuck: 0,
    });
  }

  function crash(x) {
    const t = state.turkey;
    t.mercy = RULES.mercySeconds;
    state.lives = Math.max(0, state.lives - 1);
    state.gap = Math.max(FARMER.minGap, state.gap - FARMER.crashShock);
    state.stumble = FARMER.stumble;
    state.shake = 16;
    state.flash = 0.4;
    state.farmer.angry = 1.3;
    spark(x, GROUND - 70, 18, '#f6c445', 300);
    if (state.lives <= 0) {
      state.outcome = OUTCOME_CAUGHT;
      state.gap = FARMER.catchGap;
    }
    return EVT_CRASH;
  }

  /**
   * One fixed step. `intents` holds edge flags (`jump`, `slide`) and the held slide state (`hold`).
   * Returns the OR of this step's EVT_* flags.
   */
  function step(dt, intents) {
    const t = state.turkey;
    if (state.outcome !== OUTCOME_NONE) return EVT_NONE;

    const wantJump = intents !== undefined && intents.jump === true;
    const wantSlide = intents !== undefined && intents.slide === true;
    const holdSlide = intents !== undefined && intents.hold === true;
    let events = EVT_NONE;

    state.time += dt;
    if (state.stumble > 0) state.stumble = Math.max(0, state.stumble - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 32);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
    if (state.stageBanner > 0) state.stageBanner = Math.max(0, state.stageBanner - dt);
    if (state.farmer.angry > 0) state.farmer.angry = Math.max(0, state.farmer.angry - dt);

    const slowed = state.stumble > 0;
    const move = dt * (slowed ? 0.4 : 1);

    // --- speed, distance, stage ------------------------------------------------------------
    const st = stage();
    const inStage = Math.min(state.metres, st.end) - st.start;
    const target = st.speed + st.ramps * Math.max(0, inStage);
    state.speed += (target - state.speed) * Math.min(1, dt * 2.2);
    const advance = state.speed * move;
    state.metres += advance / PX_PER_METRE;

    const nextStage = stageIndex(state.metres);
    if (nextStage !== state.stageNow && state.metres < RULES.finishMetres) {
      state.stageNow = nextStage;
      state.stageBanner = 2.2;
      state.farmer.angry = 1.5;
      state.gap = Math.min(stage().gapCeiling, state.gap + 6);
      events |= EVT_STAGE;
    }

    // --- jump and slide --------------------------------------------------------------------
    if (t.squash > 0) t.squash = Math.max(0, t.squash - dt * 4);
    if (!t.airborne && wantJump) {
      // The state's y is measured up from the ground; config signs the arc negative-up, so flip it.
      t.vy = -TURKEY.jumpVelocity;
      t.airborne = true;
      t.sliding = false;
      t.slideLeft = 0;
      t.squash = 0.25;
      events |= EVT_JUMP;
    }
    if (t.airborne) {
      t.vy -= TURKEY.gravity * move;
      t.y += t.vy * move;
      if (t.y <= 0) {
        t.y = 0;
        t.vy = 0;
        t.airborne = false;
        t.squash = 0.18;
        spark(TURKEY.screenX, GROUND - 3, 5, '#b8801f', 80);
        events |= EVT_LAND;
      }
    } else if (wantSlide || holdSlide) {
      t.sliding = true;
      if (wantSlide) t.slideLeft = TURKEY.slideHold;
    } else if (t.sliding) {
      t.slideLeft -= dt;
      if (t.slideLeft <= 0) t.sliding = false;
    }
    t.stride += dt * (slowed ? 4 : TURKEY.strideRate) * (0.85 + state.speed / 3000);

    // --- the farmer's gap ------------------------------------------------------------------
    if (state.lives > 0) {
      const creeping = st.creeping > 0 ? st.creeping : FARMER.creeping;
      const pressure = creeping + state.farmer.angry * 0.8 + (slowed ? 3.6 : 0);
      const pull = FARMER.release * (t.airborne || t.sliding ? 0.5 : 1);
      state.gap += (pull - pressure) * dt;
      const ceiling = st.gapCeiling + state.stageNow * 3;
      state.gap = Math.min(ceiling, Math.max(FARMER.minGap, state.gap));
      state.farmer.stride += dt * (9 + Math.max(0, 100 - state.gap) * 0.11);
      state.farmer.swing = Math.sin(state.farmer.stride) * 0.5 + 0.5;
      state.farmer.lean = Math.min(1, Math.max(0, (100 - state.gap) / 70));
      if (state.gap <= FARMER.catchGap + 0.4) {
        state.outcome = OUTCOME_CAUGHT;
        state.gap = FARMER.catchGap;
        state.flash = 0.6;
        events |= EVT_END;
        return events;
      }
    }

    // --- spawning --------------------------------------------------------------------------
    state.timerObstacle -= dt;
    if (state.timerObstacle <= 0) {
      spawnObstacle();
      state.timerObstacle = st.obstacleGap * rng.range(0.85, 1.22);
    }
    if (st.knifeGap > 0) {
      state.timerKnife -= dt;
      if (state.timerKnife <= 0) {
        spawnKnife();
        if (rng.chance(0.32)) spawnKnife();
        state.timerKnife = st.knifeGap * rng.range(0.8, 1.25);
      }
    }
    state.timerCorn -= dt;
    if (state.timerCorn <= 0) {
      const roll = rng.next();
      spawnCorn(roll < 0.52 ? 44 : roll < 0.85 ? 150 : 215);
      if (rng.chance(0.3)) spawnCorn(roll < 0.5 ? 44 : 150);
      state.timerCorn = st.cornGap * rng.range(0.85, 1.3);
    }

    // --- scroll the world past the turkey --------------------------------------------------
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const ob = state.obstacles[i];
      ob.x -= advance;
      if (ob.wobble > 0) ob.wobble = Math.max(0, ob.wobble - dt);
      if (ob.shape === 'oven') {
        if (ob.fire > 0) ob.fire = Math.max(0, ob.fire - dt);
        ob.lit -= dt;
        if (ob.lit <= 0 && ob.x > 160 && ob.x < FIELD.width) {
          ob.lit = RULES.flamePeriod * rng.range(0.85, 1.15);
          ob.fire = RULES.flameSeconds;
        }
      }
      if (ob.x + ob.w < -280) state.obstacles.splice(i, 1);
    }
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const p = state.pickups[i];
      p.x -= advance;
      if (p.x < -140) state.pickups.splice(i, 1);
    }
    for (let i = state.knives.length - 1; i >= 0; i -= 1) {
      const k = state.knives[i];
      k.x -= advance;
      if (k.stuck > 0) {
        k.stuck -= dt;
        if (k.stuck <= 0) state.knives.splice(i, 1);
        continue;
      }
      k.y += k.vy * move;
      k.angle += k.spin * move;
      if (k.y >= GROUND - 30) {
        k.y = GROUND - 30;
        k.stuck = 2.4;
        k.angle = 0;
        spark(k.x, GROUND - 8, 6, '#d6dde3', 110);
      }
      if (k.x < -140) state.knives.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt - advance * 0.5;
      p.y += p.vy * dt;
      p.vy += 950 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // --- collisions ------------------------------------------------------------------------
    const box = turkeyBox();
    for (const ob of state.obstacles) {
      if (ob.hit || t.mercy > 0) continue;
      if (ob.x > box.x + box.w + 4 || ob.x + ob.w < box.x - 4) continue;
      let touched;
      if (ob.high) {
        // A hanging gate, beam or rack: passable only while sliding under its underside.
        const underside = GROUND - ob.clear;
        touched = box.y < underside && box.y + box.h > GROUND - ob.h;
      } else {
        touched = overlaps(box, { x: ob.x, y: GROUND - ob.h, w: ob.w, h: ob.h });
      }
      if (touched) {
        ob.hit = true;
        ob.wobble = 1.2;
        events |= crash(ob.x + ob.w / 2);
        if (state.outcome !== OUTCOME_NONE) return events;
      }
    }

    if (t.mercy > 0) {
      t.mercy = Math.max(0, t.mercy - dt);
    } else {
      for (const k of state.knives) {
        if (k.stuck > 0) continue;
        if (overlaps(box, { x: k.x - 20, y: k.y - 34, w: 44, h: 68 })) {
          k.stuck = 1.6;
          events |= crash(k.x);
          break;
        }
      }
    }
    if (state.outcome !== OUTCOME_NONE) return events;

    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const p = state.pickups[i];
      if (p.taken) continue;
      if (overlaps(box, { x: p.x - 16, y: p.y - 24, w: 34, h: 48 })) {
        p.taken = true;
        state.pickups.splice(i, 1);
        state.corn += 1;
        spark(p.x, p.y, 9, '#ffe270', 170);
        events |= EVT_CORN;
      }
    }

    // --- the treeline ----------------------------------------------------------------------
    if (state.metres >= RULES.finishMetres) {
      state.metres = RULES.finishMetres;
      state.outcome = OUTCOME_ESCAPED;
      events |= EVT_END | EVT_ESCAPE;
    }

    state.score = Math.floor(state.metres) * 2 + state.corn * RULES.cornValue;
    return events;
  }

  /** The nearest obstacle still ahead of (or under) the turkey, for the shot autopilot. */
  function nearestAhead(margin) {
    let best = null;
    for (const ob of state.obstacles) {
      if (ob.x + ob.w < TURKEY.screenX - margin) continue;
      if (best === null || ob.x < best.x) best = ob;
    }
    return best;
  }

  reset();
  return { state, reset, step, nearestAhead, turkeyBox };
}
