// Canvas art for Turkey Run, part 1: the scrolling world behind the runner, the running turkey
// and the farmer chasing it. Pure drawing — reads config constants and run state, never mutates.
import { FIELD, GROUND_Y, PALETTE, TURKEY, FARMER, STAGES } from './config.js';

const W = FIELD.width;
const H = FIELD.height;
const TAU = Math.PI * 2;

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function layerOffset(state, factor) {
  return -(state.metres * 14 * factor) % 4096;
}

function drawHillBand(ctx, y, amp, color, offset, step, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, y + 200);
  for (let x = -40; x <= W + 40 + step; x += step) {
    const t = (x - offset) / 220;
    const h = Math.sin(t + seed) * amp + Math.sin(t * 2.3 + seed * 1.7) * amp * 0.4;
    ctx.lineTo(x, y - h);
  }
  ctx.lineTo(W + 40, y + 200);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, PALETTE.sky);
  sky.addColorStop(0.65, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.backdrop);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y + 2);

  const sunX = 980;
  const sunY = 170;
  const glow = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 230);
  glow.addColorStop(0, 'rgba(255,240,190,0.95)');
  glow.addColorStop(0.35, 'rgba(255,210,120,0.35)');
  glow.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 240, sunY - 240, 480, 480);
  ctx.fillStyle = '#fff4cf';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 46, 0, TAU);
  ctx.fill();

  const drift = layerOffset(state, 0.06);
  ctx.fillStyle = 'rgba(255,238,210,0.55)';
  for (let i = 0; i < 5; i += 1) {
    const cx = ((i * 320 + drift) % (W + 400) + W + 400) % (W + 400) - 200;
    const cy = 90 + hash(i) * 120;
    const scale = 0.7 + hash(i + 9) * 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 * scale, 22 * scale, 0, 0, TAU);
    ctx.ellipse(cx + 46 * scale, cy - 12 * scale, 46 * scale, 20 * scale, 0, 0, TAU);
    ctx.ellipse(cx - 50 * scale, cy + 3 * scale, 40 * scale, 16 * scale, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFarmyard(ctx, state) {
  drawHillBand(ctx, 470, 34, PALETTE.hillFar, layerOffset(state, 0.18), 90, 0.4);
  drawHillBand(ctx, 545, 22, PALETTE.hillNear, layerOffset(state, 0.32), 70, 2.1);

  const fOff = layerOffset(state, 0.5);
  ctx.fillStyle = PALETTE.brown;
  for (let x = -80; x < W + 80; x += 58) {
    const px = x + (fOff % 58);
    ctx.fillRect(px, 556, 9, 62);
  }
  ctx.fillRect(-20, 572, W + 40, 7);
  ctx.fillRect(-20, 596, W + 40, 7);

  const bx = 160 + layerOffset(state, 0.4) * 0.5;
  for (let k = -1; k <= 1; k += 1) {
    const x0 = bx + k * 1400;
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(x0, 500, 300, 130);
    ctx.fillStyle = '#6f2c1d';
    ctx.beginPath();
    ctx.moveTo(x0 - 18, 500);
    ctx.lineTo(x0 + 60, 452);
    ctx.lineTo(x0 + 90, 470);
    ctx.lineTo(x0 + 210, 470);
    ctx.lineTo(x0 + 240, 452);
    ctx.lineTo(x0 + 318, 500);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x0 + 118, 546, 64, 84);
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x0 + 118, 546, 64, 8);
    ctx.fillRect(x0 + 174, 546, 8, 84);
  }

  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = PALETTE.groundLine;
  ctx.fillRect(0, GROUND_Y - 4, W, 6);

  const sOff = layerOffset(state, 1);
  ctx.strokeStyle = PALETTE.straw;
  ctx.lineWidth = 3;
  for (let i = 0; i < 80; i += 1) {
    const x = ((hash(i) * (W + 200) + sOff * (1 + hash(i + 3) * 0.4)) % (W + 200) + W + 200) % (W + 200) - 100;
    const y = GROUND_Y + 22 + hash(i + 50) * (H - GROUND_Y - 32);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 10 + hash(i + 7) * 12, y - 2 + hash(i + 11) * 4);
    ctx.stroke();
  }
}

function drawBarnInterior(ctx, state) {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#2a160c');
  grad.addColorStop(1, '#5b3117');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND_Y + 2);

  const off = layerOffset(state, 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  for (let x = -60; x < W + 60; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x + (off % 46), 0);
    ctx.lineTo(x + (off % 46), GROUND_Y);
    ctx.stroke();
  }

  ctx.fillStyle = PALETTE.panel;
  for (let x = -100; x < W + 100; x += 210) {
    const bx = x + (off % 210);
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + 26, 0);
    ctx.lineTo(bx + 90, 190);
    ctx.lineTo(bx + 64, 198);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, 0, W, 96);

  const lOff = layerOffset(state, 0.7);
  for (let i = 0; i < 3; i += 1) {
    const lx = ((i * 520 + lOff) % (W + 300) + W + 300) % (W + 300) - 150;
    const glow = ctx.createRadialGradient(lx, 120, 10, lx, 120, 170);
    glow.addColorStop(0, 'rgba(255,206,110,0.5)');
    glow.addColorStop(1, 'rgba(255,206,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 180, -60, 360, 360);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(lx, 108, 11, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = PALETTE.straw;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#3c1e0c';
  ctx.fillRect(0, GROUND_Y - 3, W, 5);
}

function drawKitchen(ctx, state) {
  ctx.fillStyle = '#d9c19a';
  ctx.fillRect(0, 0, W, GROUND_Y + 2);

  ctx.strokeStyle = 'rgba(160,120,80,0.35)';
  ctx.lineWidth = 2;
  const kOff = layerOffset(state, 0.25);
  for (let x = -80; x < W + 80; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x + (kOff % 64), 0);
    ctx.lineTo(x + (kOff % 64), GROUND_Y - 120);
    ctx.stroke();
  }
  for (let y = 40; y < GROUND_Y - 120; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const wx = 740 + kOff * 0.4;
  ctx.fillStyle = '#8a5a2f';
  ctx.fillRect(wx - 14, 70, 300, 250);
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(wx, 84, 272, 222);
  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.ellipse(wx + 120, 300, 170, 70, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a5a2f';
  ctx.fillRect(wx + 130, 84, 12, 222);
  ctx.fillRect(wx, 190, 272, 10);

  ctx.strokeStyle = '#6a4020';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const px = 260 + i * 90 - ((kOff * 0.6) % 90);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, 70);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? '#b5702f' : '#9c5a24';
    ctx.beginPath();
    ctx.arc(px, 96, 26, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(0, GROUND_Y - 120, W, 120);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, GROUND_Y - 128, W, 12);

  const size = 64;
  const fOff = Math.abs(layerOffset(state, 0.9)) % (size * 2);
  for (let row = 0; row * size < H - GROUND_Y; row += 1) {
    for (let col = -2; col * size < W + size; col += 1) {
      const x = col * size + (row % 2 ? fOff / 2 : 0);
      const y = GROUND_Y + row * size;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#e8d3b0' : '#5e3a1c';
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, GROUND_Y - 4, W, 8);
}

export function drawBackground(ctx, state) {
  const stage = STAGES[state.stageNow] || STAGES[0];
  if (stage.key === 'barn') {
    drawBarnInterior(ctx, state);
  } else if (stage.key === 'kitchen') {
    drawKitchen(ctx, state);
  } else {
    drawSky(ctx, state);
    drawFarmyard(ctx, state);
  }
}

function drawLeg(ctx, hipX, hipY, phase, color, footColor) {
  const kneeX = hipX + Math.cos(phase) * 14;
  const kneeY = hipY + 26 - Math.sin(phase) * 8;
  const footX = hipX + Math.sin(phase) * 22;
  const footY = hipY + 58;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
  ctx.strokeStyle = footColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(footX - 9, footY);
  ctx.lineTo(footX + 9, footY);
  ctx.stroke();
}

export function drawTurkey(ctx, state) {
  const t = state.turkey;
  const cx = TURKEY.screenX;
  const sliding = t.sliding && !t.airborne;
  const blink = t.mercy > 0 && Math.floor(t.mercy * 14) % 2 === 0;

  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  const baseY = GROUND_Y - t.y;
  const squash = 1 + t.squash * (t.airborne ? -0.35 : 0.45);
  const stretch = 1 / squash;
  const bob = sliding ? 0 : Math.sin(t.stride) * 3;

  if (t.airborne) {
    ctx.fillStyle = 'rgba(60,35,15,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 4, 46 - Math.min(30, t.y * 0.1), 10, 0, 0, TAU);
    ctx.fill();
  }

  ctx.save();
  if (sliding) {
    ctx.translate(cx, baseY + 8);
    ctx.rotate(-0.28);
    ctx.scale(1.18, 0.62);
    ctx.translate(-cx, -(baseY + 8));
  }

  const bodyY = baseY - 62 + bob;
  const bodyW = TURKEY.bodyW;
  const bodyH = TURKEY.bodyH;

  const fanSway = Math.sin(t.stride * 0.5) * 0.08;
  for (let i = 0; i < 5; i += 1) {
    const angle = -2.35 + i * 0.3 + fanSway;
    const len = 62 + (i === 2 ? 18 : i === 1 || i === 3 ? 8 : 0);
    ctx.fillStyle = PALETTE.tail[i];
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.38, bodyY + 8);
    ctx.quadraticCurveTo(
      cx - bodyW * 0.38 + Math.cos(angle) * len * 0.7,
      bodyY + 8 + Math.sin(angle) * len * 0.9,
      cx - bodyW * 0.38 + Math.cos(angle) * len,
      bodyY + 8 + Math.sin(angle) * len,
    );
    ctx.quadraticCurveTo(
      cx - bodyW * 0.38 + Math.cos(angle + 0.22) * len * 0.8,
      bodyY + 8 + Math.sin(angle + 0.22) * len * 0.8,
      cx - bodyW * 0.38,
      bodyY + 18,
    );
    ctx.closePath();
    ctx.fill();
  }

  drawLeg(ctx, cx - 14, baseY - 42, t.stride, PALETTE.beak, PALETTE.brown);
  drawLeg(ctx, cx + 16, baseY - 42, t.stride + Math.PI, PALETTE.beak, PALETTE.brown);

  ctx.save();
  ctx.translate(cx, bodyY);
  ctx.scale(squash, stretch);
  const bodyGrad = ctx.createLinearGradient(-bodyW / 2, -bodyH / 2, bodyW / 2, bodyH / 2);
  bodyGrad.addColorStop(0, PALETTE.player);
  bodyGrad.addColorStop(1, PALETTE.playerDark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyW * 0.5, bodyH * 0.46, -0.12, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,170,0.16)';
  ctx.beginPath();
  ctx.ellipse(-8, -14, bodyW * 0.3, bodyH * 0.24, -0.2, 0, TAU);
  ctx.fill();
  ctx.restore();

  const headX = cx + bodyW * 0.34;
  const headY = bodyY - 46 + Math.sin(t.stride * 0.5) * 2;
  ctx.strokeStyle = PALETTE.head;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(cx + bodyW * 0.22, bodyY - 22);
  ctx.quadraticCurveTo(headX - 6, bodyY - 34, headX, headY + 6);
  ctx.stroke();
  ctx.fillStyle = PALETTE.head;
  ctx.beginPath();
  ctx.arc(headX, headY, 21, 0, TAU);
  ctx.fill();

  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.arc(headX + 8, headY - 5, 7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(headX + 10, headY - 5, 3.6, 0, TAU);
  ctx.fill();

  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(headX + 18, headY + 1);
  ctx.lineTo(headX + 40, headY + 7);
  ctx.lineTo(headX + 18, headY + 13);
  ctx.closePath();
  ctx.fill();

  const wob = Math.sin(t.stride * 1.4) * 3;
  ctx.fillStyle = PALETTE.wattle;
  ctx.beginPath();
  ctx.moveTo(headX + 12, headY + 15);
  ctx.quadraticCurveTo(headX + 22 + wob, headY + 34, headX + 8, headY + 38);
  ctx.quadraticCurveTo(headX + 2, headY + 24, headX + 2, headY + 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(headX + 4, headY - 20);
  ctx.quadraticCurveTo(headX + 10, headY - 6, headX + 2, headY - 2);
  ctx.quadraticCurveTo(headX - 6, headY - 12, headX - 2, headY - 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

export function drawFarmer(ctx, state) {
  const f = state.farmer;
  const gap = state.gap;
  // gap is metres, not pixels: feeding it straight into fx let the farmer overlap the turkey at
  // small gaps. Map it to a pixel offset with a floor (he stays visibly behind the tail fan and
  // pitchfork reach) and a ceiling (he never slides off the left edge at the largest gap).
  const pxGap = Math.min(265, Math.max(220, 150 + gap));
  const fx = TURKEY.screenX - pxGap;
  const lean = 0.16 + f.lean * 0.24;
  const bob = Math.abs(Math.sin(f.stride)) * 4;
  const angry = f.angry > 0;

  ctx.save();
  ctx.translate(fx, GROUND_Y - bob);
  ctx.rotate(lean);

  const swing = Math.sin(f.stride * 0.9) * 0.12;
  ctx.save();
  ctx.translate(44, -96);
  ctx.rotate(-0.55 + swing);
  ctx.strokeStyle = PALETTE.handle;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, 46);
  ctx.lineTo(96, -34);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.knife;
  ctx.lineWidth = 5;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(92 + i * 10, -30 + i * 4);
    ctx.lineTo(128 + i * 14, -52 + i * 14);
    ctx.stroke();
  }
  ctx.restore();

  const legSwing = Math.sin(f.stride) * 0.55;

  for (let side = 0; side < 2; side += 1) {
    const dir = side === 0 ? 1 : -1;
    const a = legSwing * dir;
    const hipX = side === 0 ? 6 : -10;
    const hipY = -66;
    const kneeX = hipX + Math.sin(a) * 22;
    const kneeY = hipY + 40;
    const footX = hipX + Math.sin(a) * 40;
    const footY = hipY + 74;
    ctx.strokeStyle = side === 0 ? '#3c5a7a' : '#31506e';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = PALETTE.panel;
    ctx.beginPath();
    ctx.ellipse(footX + 8, footY + 4, 18, 9, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = '#b8593f';
  ctx.beginPath();
  ctx.roundRect(-30, -140, 66, 84, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,180,0.35)';
  ctx.lineWidth = 2;
  for (let y = -132; y < -60; y += 14) {
    ctx.beginPath();
    ctx.moveTo(-28, y);
    ctx.lineTo(34, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#3d5f83';
  ctx.beginPath();
  ctx.roundRect(-26, -116, 58, 58, 8);
  ctx.fill();
  ctx.fillStyle = '#34516f';
  ctx.fillRect(-18, -140, 10, 30);
  ctx.fillRect(16, -140, 10, 30);
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(-13, -76, 3.5, 0, TAU);
  ctx.arc(15, -76, 3.5, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = '#b8593f';
  ctx.lineWidth = 17;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, -128);
  ctx.lineTo(-46, -96 + Math.sin(f.stride + 1.2) * 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, -128);
  ctx.lineTo(56, -104);
  ctx.stroke();
  ctx.fillStyle = PALETTE.head;
  ctx.beginPath();
  ctx.arc(-48, -94 + Math.sin(f.stride + 1.2) * 12, 9, 0, TAU);
  ctx.arc(58, -102, 9, 0, TAU);
  ctx.fill();

  const headY = -168;
  ctx.fillStyle = PALETTE.head;
  ctx.beginPath();
  ctx.arc(0, headY, 22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d8cdb8';
  ctx.beginPath();
  ctx.arc(-4, headY + 16, 15, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(12, headY - 4, 3.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, headY - 11);
  ctx.lineTo(19, headY - 9 - (angry ? 4 : 0));
  ctx.stroke();
  if (angry) {
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-26 + i * 4, headY - 30);
      ctx.lineTo(-40 + i * 6, headY - 40 - i * 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = PALETTE.straw;
  ctx.beginPath();
  ctx.ellipse(0, headY - 20, 46, 12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c08f31';
  ctx.beginPath();
  ctx.roundRect(-22, headY - 50, 44, 30, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.brown;
  ctx.fillRect(-22, headY - 26, 44, 6);

  ctx.restore();
}

export const FARMER_START_GAP = FARMER.startGap;

import { FONT, RULES } from './config.js';

// ---------------------------------------------------------------------------------------------
// Part 2: the course itself (fences, hay, crates, the oven, falling knives, corn) and the screens
// drawn over the world (HUD, title, paused, caught, escaped). Still pure drawing: state in, paint out.
// ---------------------------------------------------------------------------------------------

function woodPost(ctx, x, y, w, h, color, shade) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade;
  ctx.fillRect(x + w - 3, y, 3, h);
}

function drawFence(ctx, ob) {
  const x = ob.x;
  const base = GROUND_Y;
  const railTop = base - ob.h;
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 34) * 0.05 : 0;
  ctx.save();
  ctx.translate(x + ob.w / 2, base);
  ctx.rotate(tilt);
  ctx.translate(-(x + ob.w / 2), -base);

  for (let i = 0; i < 3; i += 1) {
    const px = x + i * (ob.w - 14) / 2;
    woodPost(ctx, px, railTop - 6, 14, ob.h + 6, '#8a5a2f', '#6a4020');
    ctx.fillStyle = '#a8783f';
    ctx.beginPath();
    ctx.moveTo(px + 7, railTop - 14);
    ctx.lineTo(px + 14, railTop - 4);
    ctx.lineTo(px, railTop - 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#b9834a';
  ctx.fillRect(x - 2, railTop + 10, ob.w + 4, 11);
  ctx.fillRect(x - 2, railTop + 34, ob.w + 4, 11);
  ctx.fillStyle = '#d8a866';
  ctx.fillRect(x - 2, railTop + 10, ob.w + 4, 3);
  ctx.fillRect(x - 2, railTop + 34, ob.w + 4, 3);
  ctx.strokeStyle = '#5e3a1c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + ob.w * 0.5, railTop + 10);
  ctx.lineTo(x + ob.w * 0.5 + 12, railTop + 21);
  ctx.lineTo(x + ob.w * 0.5, railTop + 32);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x + ob.w * 0.5, base);
  ctx.scale(1, 0.26);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.arc(0, 0, ob.w * 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawHay(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 30) * 0.06 : 0;
  ctx.save();
  ctx.translate(x + ob.w / 2, GROUND_Y);
  ctx.rotate(tilt);
  const grad = ctx.createLinearGradient(-ob.w / 2, top, ob.w / 2, GROUND_Y);
  grad.addColorStop(0, '#ecc25e');
  grad.addColorStop(1, '#b98a35');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-ob.w / 2, -ob.h, ob.w, ob.h, 16);
  ctx.fill();
  ctx.strokeStyle = '#9c6f26';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const y = -ob.h + 14 + i * (ob.h - 24) / 3;
    ctx.beginPath();
    ctx.moveTo(-ob.w / 2 + 14, y);
    ctx.quadraticCurveTo(0, y - 5, ob.w / 2 - 14, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#7a5a1c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-ob.w * 0.22, -ob.h + 2);
  ctx.lineTo(-ob.w * 0.22, -2);
  ctx.moveTo(ob.w * 0.22, -ob.h + 2);
  ctx.lineTo(ob.w * 0.22, -2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,190,0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i += 1) {
    const sx = -ob.w / 2 + 10 + hash(ob.seed + i) * (ob.w - 20);
    const sy = -ob.h + 8 + hash(ob.seed + i + 20) * (ob.h - 16);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 10 + hash(ob.seed + i + 40) * 12, sy - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrate(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 32) * 0.05 : 0;
  ctx.save();
  ctx.translate(x + ob.w / 2, GROUND_Y);
  ctx.rotate(tilt);
  ctx.fillStyle = '#a9713b';
  ctx.fillRect(-ob.w / 2, -ob.h, ob.w, ob.h - 6);
  ctx.fillStyle = '#8a582b';
  ctx.fillRect(-ob.w / 2, -ob.h * 0.55, ob.w, 8);
  ctx.fillStyle = '#c98f52';
  ctx.fillRect(-ob.w / 2, -ob.h, ob.w, 7);
  ctx.fillRect(-ob.w / 2, -12, ob.w, 6);
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(-ob.w / 2, -10, ob.w, 10);
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-ob.w / 2 + 6, -ob.h + 8);
  ctx.lineTo(ob.w / 2 - 6, -14);
  ctx.moveTo(ob.w / 2 - 6, -ob.h + 8);
  ctx.lineTo(-ob.w / 2 + 6, -14);
  ctx.stroke();
  ctx.fillStyle = '#d9a441';
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOBBLE', 0, -ob.h * 0.78);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function drawSack(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  ctx.save();
  ctx.translate(x + ob.w / 2, GROUND_Y);
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 28) * 0.07 : Math.sin(ob.seed) * 0.02;
  ctx.rotate(tilt);
  const grad = ctx.createLinearGradient(0, -ob.h, 0, 0);
  grad.addColorStop(0, '#d8c193');
  grad.addColorStop(1, '#a68c5e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-ob.w * 0.28, -ob.h + 6);
  ctx.quadraticCurveTo(-ob.w * 0.62, -ob.h * 0.4, -ob.w * 0.5, -4);
  ctx.quadraticCurveTo(0, 4, ob.w * 0.5, -4);
  ctx.quadraticCurveTo(ob.w * 0.62, -ob.h * 0.4, ob.w * 0.28, -ob.h + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a7040';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-ob.w * 0.3, -ob.h + 8);
  ctx.quadraticCurveTo(0, -ob.h - 4, ob.w * 0.3, -ob.h + 8);
  ctx.stroke();
  ctx.fillStyle = '#b23a2a';
  ctx.fillRect(-ob.w * 0.3, -ob.h + 2, ob.w * 0.6, 6);
  ctx.fillStyle = 'rgba(90,60,20,0.35)';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FEED', 0, -ob.h * 0.42);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawOven(ctx, ob, state) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const fire = ob.fire > 0;
  ctx.save();
  ctx.translate(x + ob.w / 2, GROUND_Y);
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 30) * 0.04 : 0;
  ctx.rotate(tilt);

  ctx.fillStyle = '#3a3a3c';
  ctx.fillRect(-ob.w / 2 + 12, -ob.h - 26, 18, 30);
  ctx.fillRect(ob.w / 2 - 30, -ob.h - 26, 18, 30);
  const body = ctx.createLinearGradient(0, -ob.h, 0, 0);
  body.addColorStop(0, '#4c4640');
  body.addColorStop(1, '#241f1b');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-ob.w / 2, -ob.h, ob.w, ob.h - 4, [26, 26, 8, 8]);
  ctx.fill();
  ctx.fillStyle = '#6a625a';
  ctx.beginPath();
  ctx.roundRect(-ob.w / 2 + 8, -ob.h + 6, ob.w - 16, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#d9c19a';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(-ob.w / 2 + 30 + i * 24, -ob.h + 40, 5, 0, TAU);
    ctx.fill();
  }
  const mouthW = ob.w * 0.66;
  const mouthH = ob.h * 0.44;
  const mouthY = -ob.h * 0.62;
  ctx.fillStyle = '#160d08';
  ctx.beginPath();
  ctx.roundRect(-mouthW / 2, mouthY, mouthW, mouthH, 10);
  ctx.fill();

  const flick = 0.75 + Math.sin((state.time % 60)) * 0.25;
  const glowA = fire ? 0.55 + 0.35 * flick : 0.18;
  const glow = ctx.createRadialGradient(0, mouthY + mouthH, 10, 0, mouthY + mouthH, 150);
  glow.addColorStop(0, `rgba(255,190,80,${glowA.toFixed(3)})`);
  glow.addColorStop(0.5, `rgba(240,120,40,${(glowA * 0.45).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(240,120,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-180, mouthY - 160, 360, 340);

  const peak = fire ? Math.min(1, ob.fire / 0.3) : 0.22;
  const flames = 5;
  for (let i = 0; i < flames; i += 1) {
    const fw = mouthW / flames;
    const fx = -mouthW / 2 + fw * (i + 0.5);
    const lash = Math.sin(ob.seed + i * 1.7 + (state.time % 60) * 6) * 10;
    const fh = mouthH * peak * (0.6 + hash(ob.seed + i) * 0.55);
    ctx.fillStyle = i % 2 ? PALETTE.fire : '#ff9b2f';
    ctx.beginPath();
    ctx.moveTo(fx - fw * 0.6, mouthY + mouthH);
    ctx.quadraticCurveTo(fx - fw * 0.4 + lash, mouthY + mouthH - fh * 0.6, fx + lash, mouthY + mouthH - fh);
    ctx.quadraticCurveTo(fx + fw * 0.4 + lash, mouthY + mouthH - fh * 0.5, fx + fw * 0.6, mouthY + mouthH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.fireHot;
  ctx.beginPath();
  ctx.ellipse(0, mouthY + mouthH - 4, mouthW * 0.34, 6 + 10 * peak, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-mouthW / 2 + 8 + i * 9, mouthY + mouthH);
    ctx.lineTo(-mouthW / 2 + 13 + i * 9, mouthY + mouthH - 10);
    ctx.lineTo(-mouthW / 2 + 18 + i * 9, mouthY + mouthH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#c9c2b6';
  ctx.fillRect(-ob.w / 2 + 6, -8, ob.w - 12, 8);
  ctx.restore();
}

function drawGate(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const tilt = ob.wobble > 0 ? Math.sin(ob.wobble * 30) * 0.04 : 0;
  ctx.save();
  ctx.translate(x + ob.w / 2, top);
  ctx.rotate(tilt);
  ctx.fillStyle = '#8a5a2f';
  ctx.fillRect(-ob.w / 2, 0, 14, ob.h);
  ctx.fillRect(ob.w / 2 - 14, 0, 14, ob.h);
  ctx.fillStyle = '#b9834a';
  for (let i = 0; i < 5; i += 1) {
    const y = i * (ob.h - 8) / 4;
    ctx.fillRect(-ob.w / 2 + 10, y, ob.w - 20, 10);
  }
  ctx.strokeStyle = '#6a4020';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-ob.w / 2 + 14, 6);
  ctx.lineTo(ob.w / 2 - 14, ob.h - 6);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-ob.w / 2, ob.h - 14, ob.w, 14);
  ctx.fillStyle = '#2a1a0e';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 34 - 12, ob.h);
    ctx.lineTo(i * 34, ob.h - 22);
    ctx.lineTo(i * 34 + 12, ob.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBeam(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const underside = GROUND_Y - ob.clear;
  ctx.fillStyle = 'rgba(20,10,4,0.35)';
  ctx.fillRect(x - 8, top - 8, ob.w + 16, 18);
  const grad = ctx.createLinearGradient(0, top, 0, underside);
  grad.addColorStop(0, '#7a4a22');
  grad.addColorStop(1, '#4d2e15');
  ctx.fillStyle = grad;
  ctx.fillRect(x, top, ob.w, underside - top);
  ctx.fillStyle = '#8a5a2f';
  ctx.fillRect(x, top + 6, ob.w, 6);
  ctx.fillStyle = '#d9a441';
  ctx.save();
  ctx.translate(x + ob.w / 2, top + (underside - top) * 0.55);
  ctx.rotate(-0.03);
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SLIDE', 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a2210';
  ctx.beginPath();
  ctx.moveTo(x - 6, underside);
  ctx.lineTo(x + 10, underside - 12);
  ctx.lineTo(x + 26, underside);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + ob.w - 26, underside);
  ctx.lineTo(x + ob.w - 10, underside - 12);
  ctx.lineTo(x + ob.w + 6, underside);
  ctx.closePath();
  ctx.fill();
}

function drawRack(ctx, ob) {
  const x = ob.x;
  const top = GROUND_Y - ob.h;
  const underside = GROUND_Y - ob.clear;
  ctx.fillStyle = '#6a4020';
  ctx.fillRect(x + 6, top, 12, ob.h);
  ctx.fillRect(x + ob.w - 18, top, 12, ob.h);
  ctx.fillStyle = '#8a5a2f';
  ctx.fillRect(x + 10, top + 10, ob.w - 20, 8);
  ctx.fillRect(x + 10, underside - 16, ob.w - 20, 16);
  for (let i = 0; i < 5; i += 1) {
    const px = x + 22 + i * (ob.w - 44) / 4;
    ctx.strokeStyle = '#9aa4ab';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, top + 18);
    ctx.lineTo(px, top + 52 + (i % 2) * 12);
    ctx.stroke();
    ctx.fillStyle = '#c9c2b6';
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.roundRect(px - 12, top + 52 + (i % 2) * 12, 24, 9, 4);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, top + 58, 13, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a5a2f';
      ctx.beginPath();
      ctx.arc(px, top + 58, 6, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#3a2210';
  ctx.fillRect(x + 8, underside - 4, ob.w - 16, 8);
}

function drawKnife(ctx, k) {
  ctx.save();
  const stuck = k.stuck > 0;
  ctx.translate(k.x, k.y);
  if (stuck) {
    const fade = Math.min(1, k.stuck / 0.4);
    ctx.globalAlpha = fade;
    ctx.rotate(-0.18);
  } else {
    ctx.rotate(k.angle);
  }
  const blade = ctx.createLinearGradient(-6, -34, 8, 22);
  blade.addColorStop(0, '#f4f8fa');
  blade.addColorStop(0.5, PALETTE.knife);
  blade.addColorStop(1, '#8b979e');
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.quadraticCurveTo(13, -14, 9, 16);
  ctx.lineTo(-8, 16);
  ctx.quadraticCurveTo(-6, -14, 0, -38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6f7c84';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-2, -30, 2, 40);
  ctx.fillStyle = PALETTE.handle;
  ctx.beginPath();
  ctx.roundRect(-7, 16, 14, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#d6dde3';
  ctx.fillRect(-8, 15, 16, 4);
  ctx.restore();
  if (!stuck) {
    ctx.strokeStyle = 'rgba(215,223,228,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(k.x, k.y - 50);
    ctx.lineTo(k.x, k.y - 150);
    ctx.stroke();
  }
}

function drawCorn(ctx, state, p) {
  const bob = Math.sin(state.time * 3 + p.phase) * 5;
  const cx = p.x;
  const cy = p.y + bob;
  ctx.save();
  ctx.translate(cx, cy);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  glow.addColorStop(0, 'rgba(255,226,112,0.45)');
  glow.addColorStop(1, 'rgba(255,226,112,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-46, -46, 92, 92);
  const spin = Math.sin(state.time * 2 + p.phase) * 0.12;
  ctx.rotate(spin);
  ctx.fillStyle = PALETTE.cornLeaf;
  for (let i = 0; i < 3; i += 1) {
    const a = -0.5 + i * 0.5;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -18, 7, 22, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const cob = ctx.createLinearGradient(-12, -22, 12, 22);
  cob.addColorStop(0, '#ffe270');
  cob.addColorStop(1, '#e0a72c');
  ctx.fillStyle = cob;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 24, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,140,30,0.55)';
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -1; col <= 1; col += 1) {
      ctx.beginPath();
      ctx.arc(col * 6 + (row % 2 ? 3 : 0), row * 6, 2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-4, -12, 3, 7, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.life * p.spin);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawObstacles(ctx, state) {
  for (const ob of state.obstacles) {
    if (ob.x > W + 60 || ob.x + ob.w < -60) continue;
    ctx.save();
    if (ob.hit) ctx.globalAlpha = 0.75;
    switch (ob.shape) {
      case 'fence': drawFence(ctx, ob); break;
      case 'hay': drawHay(ctx, ob); break;
      case 'crate': drawCrate(ctx, ob); break;
      case 'sack': drawSack(ctx, ob); break;
      case 'oven': drawOven(ctx, ob, state); break;
      case 'gate': drawGate(ctx, ob); break;
      case 'beam': drawBeam(ctx, ob); break;
      case 'rack': drawRack(ctx, ob); break;
      default: drawCrate(ctx, ob); break;
    }
    ctx.restore();
  }
  for (const p of state.pickups) drawCorn(ctx, state, p);
  for (const k of state.knives) drawKnife(ctx, k);
  drawParticles(ctx, state);
}

// ---------------------------------------------------------------------------------------------
// Part 3: the readouts over the world and the four screens between runs.
// ---------------------------------------------------------------------------------------------

function panel(ctx, x, y, w, h, radius, alpha = 0.84) {
  // Opaque enough to stay legible on the kitchen's light tiled wall, where a 62% wash let the
  // tan background through and the muted HUD labels all but vanished.
  ctx.fillStyle = `rgba(24,13,6,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242,181,68,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function label(ctx, text, x, y, size, color, align) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.72);
  ctx.bezierCurveTo(x - s * 0.9, y + s * 0.15, x - s * 0.62, y - s * 0.55, x, y - s * 0.16);
  ctx.bezierCurveTo(x + s * 0.62, y - s * 0.55, x + s * 0.9, y + s * 0.15, x, y + s * 0.72);
  ctx.closePath();
}

function drawHeart(ctx, x, y, s, full) {
  heartPath(ctx, x, y, s);
  if (full) {
    const g = ctx.createLinearGradient(x - s, y - s, x + s, y + s);
    g.addColorStop(0, '#f0705a');
    g.addColorStop(1, PALETTE.wattle);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = 'rgba(255,236,203,0.12)';
  }
  ctx.fill();
  ctx.strokeStyle = full ? 'rgba(255,220,180,0.75)' : 'rgba(255,236,203,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(x - s * 0.32, y - s * 0.18, s * 0.16, s * 0.11, -0.5, 0, TAU);
    ctx.fill();
  }
}

function drawGapBar(ctx, state) {
  const x = 40;
  const y = 126;
  const w = 300;
  const h = 16;
  const span = Math.max(1, FARMER.startGap - FARMER.catchGap);
  const filled = Math.max(0, Math.min(1, (state.gap - FARMER.catchGap) / span));
  const danger = filled < 0.3;

  ctx.fillStyle = 'rgba(24,13,6,0.6)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, PALETTE.danger);
  g.addColorStop(0.45, PALETTE.gold);
  g.addColorStop(1, PALETTE.good);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, Math.max(6, w * filled), h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,240,210,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();

  const pulse = danger ? 0.55 + 0.45 * Math.abs(Math.sin(state.time * 7)) : 1;
  ctx.globalAlpha = pulse;
  label(ctx, 'FARMER', x, y - 8, 15, danger ? '#ffb9a8' : PALETTE.muted, 'left');
  ctx.globalAlpha = 1;
  label(ctx, `${Math.round(state.gap)} m back`, x + w, y - 8, 15, PALETTE.muted, 'right');

  const tx = x + w * filled;
  ctx.fillStyle = PALETTE.cream;
  ctx.beginPath();
  ctx.arc(tx, y + h / 2, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawHud(ctx, state) {
  const stage = STAGES[state.stageNow] || STAGES[0];

  panel(ctx, 28, 24, 348, 84, 16);
  label(ctx, 'SCORE', 48, 52, 14, PALETTE.muted);
  label(ctx, String(state.score).padStart(6, '0'), 48, 88, 34, PALETTE.text);
  label(ctx, 'DISTANCE', 232, 52, 14, PALETTE.muted);
  label(ctx, `${Math.floor(state.metres)} m`, 232, 88, 34, PALETTE.text);

  const heartsY = 126;
  for (let i = 0; i < RULES.lives; i += 1) {
    drawHeart(ctx, 52 + i * 40, heartsY + 8, 26, i < state.lives);
  }
  drawGapBar(ctx, state);

  const stageX = W - 40;
  panel(ctx, W - 348, 24, 320, 84, 16);
  label(ctx, 'STAGE', stageX, 52, 14, PALETTE.muted, 'right');
  label(ctx, stage.name, stageX, 88, 30, PALETTE.gold, 'right');

  const progress = Math.max(0, Math.min(1, state.metres / RULES.finishMetres));
  const barX = W - 348;
  const barY = 116;
  ctx.fillStyle = 'rgba(24,13,6,0.55)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, 320, 8, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(6, 320 * progress), 8, 4);
  ctx.fill();

  // The banner is an in-play cue only: at an outcome it would ghost through the CAUGHT/ESCAPED panel.
  if (state.stageBanner > 0 && state.outcome === 0) {
    const a = Math.min(1, state.stageBanner);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(24,13,6,0.80)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 250, 210, 500, 92, 18);
    ctx.fill();
    label(ctx, stage.name, W / 2, 258, 40, PALETTE.gold, 'center');
    label(ctx, stage.subtitle, W / 2, 286, 18, PALETTE.text, 'center');
    ctx.restore();
  }

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(210,69,47,${(state.flash * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.lives <= 1 && state.outcome === 0) {
    const a = 0.12 + 0.1 * Math.sin(state.time * 5);
    ctx.fillStyle = `rgba(210,69,47,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, W, 10);
    ctx.fillRect(0, H - 10, W, 10);
  }
  ctx.textAlign = 'left';
}

function overlay(ctx, alpha) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, `rgba(18,9,4,${alpha * 0.7})`);
  g.addColorStop(1, `rgba(10,5,2,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function prompt(ctx, text, y, time) {
  const a = 0.55 + 0.45 * Math.abs(Math.sin((time || 0) * 3));
  ctx.globalAlpha = a;
  label(ctx, text, W / 2, y, 26, PALETTE.cream, 'center');
  ctx.globalAlpha = 1;
}

export function drawTitle(ctx, state, best) {
  overlay(ctx, 0.72);

  const bob = Math.sin(state.time * 1.6) * 6;
  label(ctx, 'TURKEY RUN', W / 2, 250 + bob, 96, PALETTE.gold, 'center');
  ctx.font = `bold 96px ${FONT}`;
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(42,21,10,0.65)';
  ctx.textAlign = 'center';
  ctx.strokeText('TURKEY RUN', W / 2, 250 + bob);
  label(ctx, 'A barn-to-kitchen escape, one fence at a time', W / 2, 300 + bob, 24, PALETTE.text, 'center');

  panel(ctx, W / 2 - 300, 350, 600, 200, 20);
  label(ctx, 'HOW TO PLAY', W / 2, 388, 18, PALETTE.muted, 'center');
  label(ctx, 'Jump the fences, hay and crates. Slide under gates and beams.', W / 2, 420, 20, PALETTE.text, 'center');
  label(ctx, 'The oven spits flame. Knives fall. Corn adds 25 points.', W / 2, 450, 20, PALETTE.text, 'center');
  label(ctx, 'Keep the farmer behind you: hit something and he closes in.', W / 2, 480, 20, PALETTE.text, 'center');
  label(ctx, 'Run 1500 m to the treeline and you are free.', W / 2, 510, 20, PALETTE.good, 'center');

  label(ctx, 'SPACE / W / UP  jump      S / DOWN  slide      P  pause      M  mute', W / 2, 600, 18, PALETTE.muted, 'center');

  if (best > 0) label(ctx, `BEST  ${best}`, W / 2, 646, 26, PALETTE.gold, 'center');
  prompt(ctx, 'Press Space or click to start', 712, state.time);
}

export function drawPaused(ctx) {
  overlay(ctx, 0.55);
  panel(ctx, W / 2 - 220, H / 2 - 96, 440, 192, 22);
  label(ctx, 'PAUSED', W / 2, H / 2 - 18, 58, PALETTE.gold, 'center');
  label(ctx, 'The farmer is waiting. So is the oven.', W / 2, H / 2 + 22, 20, PALETTE.text, 'center');
  label(ctx, 'Press P or Space to keep running', W / 2, H / 2 + 62, 20, PALETTE.muted, 'center');
}

export function drawCaught(ctx, state) {
  overlay(ctx, 0.7);
  panel(ctx, W / 2 - 300, 200, 600, 380, 24, 1);
  label(ctx, 'CAUGHT!', W / 2, 280, 72, PALETTE.danger, 'center');
  label(ctx, 'The farmer has you by the tail feathers.', W / 2, 320, 22, PALETTE.text, 'center');

  label(ctx, 'SCORE', W / 2 - 130, 386, 16, PALETTE.muted, 'center');
  label(ctx, String(state.score), W / 2 - 130, 432, 44, PALETTE.text, 'center');
  label(ctx, 'DISTANCE', W / 2 + 130, 386, 16, PALETTE.muted, 'center');
  label(ctx, `${Math.floor(state.metres)} m`, W / 2 + 130, 432, 44, PALETTE.text, 'center');
  label(ctx, `${state.corn} corn gathered`, W / 2, 474, 20, PALETTE.corn, 'center');

  prompt(ctx, 'Press Space or click to run again', 540, state.time);
}

export function drawEscaped(ctx, state) {
  overlay(ctx, 0.62);
  panel(ctx, W / 2 - 300, 180, 600, 400, 24, 1);

  const confetti = 40;
  for (let i = 0; i < confetti; i += 1) {
    const t = (state.time * (0.25 + hash(i) * 0.5) + hash(i + 70)) % 1;
    const x = hash(i + 11) * W;
    const y = -40 + t * (H + 80);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 6 + i);
    ctx.fillStyle = PALETTE.tail[i % PALETTE.tail.length];
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }

  label(ctx, 'ESCAPED!', W / 2, 268, 76, PALETTE.good, 'center');
  label(ctx, 'Past the kitchen, into the trees. Free bird.', W / 2, 310, 22, PALETTE.text, 'center');

  label(ctx, 'SCORE', W / 2 - 130, 378, 16, PALETTE.muted, 'center');
  label(ctx, String(state.score), W / 2 - 130, 424, 44, PALETTE.text, 'center');
  label(ctx, 'DISTANCE', W / 2 + 130, 378, 16, PALETTE.muted, 'center');
  label(ctx, `${Math.floor(state.metres)} m`, W / 2 + 130, 424, 44, PALETTE.text, 'center');
  label(ctx, `${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left  ·  ${state.corn} corn`, W / 2, 466, 20, PALETTE.gold, 'center');

  prompt(ctx, 'Press Space or click to run again', 540, state.time);
}
