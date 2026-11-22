// Silent Vault — drawing. Everything is flat canvas shapes: a top-down night
// interior, crates and walls as cover, pools of shadow, the guards' torch
// cones (yellow when calm, orange when suspicious, red on alert), a darkness
// layer with light punched around the player, the key and the exit, and a
// HUD with the detection eye. Screens are drawn over the world so even the
// title and end cards show the game itself behind them.

import { COLS, DETECTION, FIELD, GUARD, ROWS, TILE } from './config.js';
import { guardSeesPlayer, playerInShadow } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear'; // one level finished
export const SCREEN_WON = 'won'; // the whole campaign finished
export const SCREEN_PAUSE = 'pause';

const INK = '#e8ecf4';
const DIM = '#9aa5bb';

function drawTile(ctx, cell, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  if (cell === '#') {
    ctx.fillStyle = '#39415a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#454f6e';
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
  } else if (cell === 'C') {
    ctx.fillStyle = '#20263a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#8a6b42';
    ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
    ctx.strokeStyle = '#6d5433';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 7, y + 7, TILE - 14, TILE - 14);
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 7);
    ctx.lineTo(x + TILE - 7, y + TILE - 7);
    ctx.moveTo(x + TILE - 7, y + 7);
    ctx.lineTo(x + 7, y + TILE - 7);
    ctx.stroke();
  } else if (cell === 's') {
    ctx.fillStyle = '#141a2c';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#182036';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(x + 6 + i * 12, y + 8 + (i % 2) * 14, 5, 5);
  } else {
    ctx.fillStyle = '#20263a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#232a42';
    if ((tx + ty) % 2 === 0) ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  }
}

function drawCone(ctx, state, guard) {
  const alert = state.alert > 0;
  const suspicious = !alert && state.detection >= DETECTION.suspiciousAt;
  const sees = guardSeesPlayer(state, guard);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, GUARD.viewRange, guard.angle - GUARD.viewHalfAngle, guard.angle + GUARD.viewHalfAngle);
  ctx.closePath();
  const gradient = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, GUARD.viewRange);
  if (alert || sees) {
    gradient.addColorStop(0, 'rgba(255, 84, 64, 0.50)');
    gradient.addColorStop(1, 'rgba(255, 84, 64, 0.05)');
  } else if (suspicious) {
    gradient.addColorStop(0, 'rgba(255, 166, 48, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 166, 48, 0.04)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 226, 130, 0.38)');
    gradient.addColorStop(1, 'rgba(255, 226, 130, 0.03)');
  }
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawDarkness(ctx, state) {
  const layer = drawDarkness.canvas ?? (drawDarkness.canvas = document.createElement('canvas'));
  layer.width = FIELD.width;
  layer.height = FIELD.height;
  const dctx = layer.getContext('2d');
  dctx.clearRect(0, 0, FIELD.width, FIELD.height);
  dctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
  dctx.fillRect(0, 0, FIELD.width, FIELD.height);
  dctx.globalCompositeOperation = 'destination-out';
  const holes = [
    { x: state.player.x, y: state.player.y, r: 92 },
    { x: state.exit.x, y: state.exit.y, r: 56 },
  ];
  if (!state.key.taken) holes.push({ x: state.key.x, y: state.key.y, r: 44 });
  for (const guard of state.guards) holes.push({ x: guard.x, y: guard.y, r: 40 });
  for (const hole of holes) {
    const gradient = dctx.createRadialGradient(hole.x, hole.y, 4, hole.x, hole.y, hole.r);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dctx.fillStyle = gradient;
    dctx.beginPath();
    dctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    dctx.fill();
  }
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, 0, 0);
}

function drawActors(ctx, state) {
  // the exit door
  ctx.fillStyle = '#1d5c3a';
  ctx.fillRect(state.exit.x - 15, state.exit.y - 15, 30, 30);
  ctx.fillStyle = '#2fbf71';
  ctx.fillRect(state.exit.x - 11, state.exit.y - 11, 22, 22);
  ctx.fillStyle = '#0c3520';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', state.exit.x, state.exit.y + 24);
  // the key, until taken
  if (!state.key.taken) {
    ctx.save();
    ctx.translate(state.key.x, state.key.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  // guards
  for (const guard of state.guards) {
    ctx.fillStyle = '#c33d4e';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7e2231';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2f5fa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (guard.radius + 5), guard.y + Math.sin(guard.angle) * (guard.radius + 5));
    ctx.stroke();
    if (guard.mode === 'investigate' || guard.mode === 'chase') {
      ctx.fillStyle = guard.mode === 'chase' ? '#ff5440' : '#ffa630';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(guard.mode === 'chase' ? '!' : '?', guard.x, guard.y - guard.radius - 10);
    }
  }
  // the player
  const player = state.player;
  ctx.fillStyle = playerInShadow(state) ? '#2b8a7a' : '#37c8ae';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14665a';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 3, 6, 0, Math.PI * 2);
  ctx.fill();
  if (state.key.taken) {
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(player.x + 6, player.y + 4, 5, 5);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(8, 11, 22, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, 34);
  ctx.fillStyle = INK;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.levelName, 12, 18);
  ctx.fillStyle = state.key.taken ? '#ffd94d' : DIM;
  ctx.fillText(state.key.taken ? 'KEY ✓ — reach the EXIT' : 'Steal the gold KEY, then reach the EXIT', 300, 18);
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${state.score}`, FIELD.width - 12, 18);
  // the detection eye: a bar that fills as the guards' suspicion grows
  const width = 170;
  const x = FIELD.width / 2 - width / 2;
  ctx.fillStyle = '#39415a';
  ctx.fillRect(x, 40, width, 10);
  const fill = state.detection / DETECTION.alertAt;
  ctx.fillStyle = state.alert > 0 ? '#ff5440' : fill > 0.55 ? '#ffa630' : '#ffe27e';
  ctx.fillRect(x, 40, width * fill, 10);
  ctx.fillStyle = DIM;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.alert > 0 ? 'SPOTTED — RUN!' : state.seen ? 'Seen…' : 'Unseen', FIELD.width / 2, 62);
}

function banner(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, FIELD.width / 2, FIELD.height / 2 - 74);
  ctx.fillStyle = INK;
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, FIELD.height / 2 - 18 + i * 30));
}

/** Draw the whole frame for `screen` over the world state. */
export function draw(ctx, state, screen, best) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) drawTile(ctx, state.grid[ty][tx], tx, ty);
  }
  for (const guard of state.guards) drawCone(ctx, state, guard);
  drawDarkness(ctx, state);
  drawActors(ctx, state);
  drawHud(ctx, state);

  if (screen === SCREEN_TITLE) {
    banner(ctx, 'SILENT VAULT', [
      'Sneak past the guards, steal the key, slip out unseen.',
      'Move: WASD or arrows · Run: Shift (loud) · Pause: P · Restart: R',
      'Stay out of the torch cones — hide in the dark shadow tiles.',
      'Press Enter to begin',
    ], '#37c8ae');
  } else if (screen === SCREEN_CAUGHT) {
    banner(ctx, 'CAUGHT!', [
      'The guards got you.',
      `Score ${state.score} · caught ${state.caughtCount} time${state.caughtCount === 1 ? '' : 's'}`,
      'Press R to try this level again',
    ], '#ff5440');
  } else if (screen === SCREEN_CLEAR) {
    banner(ctx, 'LEVEL CLEAR', [
      `${state.levelName} — out without a sound${state.ghost ? ' (ghost bonus!)' : ''}.`,
      `Score ${state.score}`,
      'Press Enter for the next level',
    ], '#2fbf71');
  } else if (screen === SCREEN_WON) {
    banner(ctx, 'VAULT EMPTIED!', [
      'Every level cleared. You were never really there.',
      `Final score ${state.score}${best ? ` · best ${Math.max(best, state.score)}` : ''}`,
      'Press Enter to play again',
    ], '#ffd94d');
  } else if (screen === SCREEN_PAUSE) {
    banner(ctx, 'PAUSED', ['Press P to resume'], '#9aa5bb');
  }
}
