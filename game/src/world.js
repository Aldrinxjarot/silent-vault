// Silent Vault — the simulation. Owns the level grid, the player, the guards
// and the detection meter, and advances them one fixed step at a time. It
// knows nothing about drawing or keyboards: main.js feeds it an input vector
// and render.js draws the state it keeps here.

import { COLS, DETECTION, GUARD, LEVELS, PLAYER, ROWS, SCORE, TILE } from './config.js';
import { makeRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_KEY = 1; // the vault key was picked up
export const EVENT_CAUGHT = 2; // a guard reached the player
export const EVENT_CLEAR = 4; // the player reached the exit holding the key

const SOLID = new Set(['#', 'C']);

function tileAt(state, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return state.grid[ty][tx];
}

function isSolid(state, tx, ty) {
  return SOLID.has(tileAt(state, tx, ty));
}

/** True when the straight line between two points crosses no wall or crate. */
function lineOfSight(state, x0, y0, x1, y1) {
  const distance = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (isSolid(state, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/** Move a circle by (dx, dy), sliding along walls and crates axis by axis. */
function moveCircle(state, body, dx, dy) {
  const r = body.radius;
  let nx = body.x + dx;
  if (dx !== 0) {
    const edge = dx > 0 ? nx + r : nx - r;
    const ty0 = Math.floor((body.y - r + 2) / TILE);
    const ty1 = Math.floor((body.y + r - 2) / TILE);
    for (let ty = ty0; ty <= ty1; ty += 1) {
      if (isSolid(state, Math.floor(edge / TILE), ty)) {
        nx = dx > 0 ? Math.floor(edge / TILE) * TILE - r - 0.01 : (Math.floor(edge / TILE) + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  body.x = nx;
  let ny = body.y + dy;
  if (dy !== 0) {
    const edge = dy > 0 ? ny + r : ny - r;
    const tx0 = Math.floor((body.x - r + 2) / TILE);
    const tx1 = Math.floor((body.x + r - 2) / TILE);
    for (let tx = tx0; tx <= tx1; tx += 1) {
      if (isSolid(state, tx, Math.floor(edge / TILE))) {
        ny = dy > 0 ? Math.floor(edge / TILE) * TILE - r - 0.01 : (Math.floor(edge / TILE) + 1) * TILE + r + 0.01;
        break;
      }
    }
  }
  body.y = ny;
}

function angleLerp(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/** Can this guard see the player right now? Range, cone and line of sight. */
export function guardSeesPlayer(state, guard) {
  const player = state.player;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.viewRange) return false;
  if (distance > 26) {
    let diff = Math.atan2(dy, dx) - guard.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) > GUARD.viewHalfAngle) return false;
  }
  return lineOfSight(state, guard.x, guard.y, player.x, player.y);
}

export function playerInShadow(state) {
  return tileAt(state, Math.floor(state.player.x / TILE), Math.floor(state.player.y / TILE)) === 's';
}

export function createWorld(seed) {
  const random = makeRandom(seed);
  const state = {
    grid: [],
    levelIndex: 0,
    levelName: '',
    par: 0,
    player: { x: 0, y: 0, radius: PLAYER.radius, moving: false, running: false },
    guards: [],
    key: { x: 0, y: 0, taken: false },
    exit: { x: 0, y: 0 },
    detection: 0,
    alert: 0, // seconds of full alert remaining
    seen: false, // is any guard looking at the player this step
    lastSeen: null, // where the player was last spotted
    time: 0, // seconds spent in this level
    score: 0,
    caughtCount: 0,
    ghost: true, // no full alert yet this level
    over: false,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.levelName = level.name;
    state.par = level.par;
    state.grid = level.map.map((row) => row.split(''));
    state.guards = level.guards.map((spec, i) => {
      const [tx, ty] = spec.path[0];
      return {
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE / 2,
        radius: GUARD.radius,
        angle: i % 2 === 0 ? 0 : Math.PI,
        path: spec.path.map(([px, py]) => ({ x: px * TILE + TILE / 2, y: py * TILE + TILE / 2 })),
        target: 1 % spec.path.length,
        pause: 0,
        scanPhase: random() * Math.PI * 2,
        mode: 'patrol', // patrol | investigate | chase | return
        home: { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 },
      };
    });
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const cell = state.grid[ty][tx];
        if (cell === 'P') {
          state.player.x = tx * TILE + TILE / 2;
          state.player.y = ty * TILE + TILE / 2;
          state.grid[ty][tx] = '.';
        } else if (cell === 'K') {
          state.key = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, taken: false };
          state.grid[ty][tx] = '.';
        } else if (cell === 'X') {
          state.exit = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
        }
      }
    }
    state.detection = 0;
    state.alert = 0;
    state.seen = false;
    state.lastSeen = null;
    state.time = 0;
    state.ghost = true;
    state.over = false;
  }

  function stepGuard(guard, dt) {
    const player = state.player;
    let goal = null;
    let speed = GUARD.patrolSpeed;
    if (guard.mode === 'chase') {
      goal = state.lastSeen ?? { x: player.x, y: player.y };
      speed = GUARD.chaseSpeed;
    } else if (guard.mode === 'investigate') {
      goal = state.lastSeen;
      speed = GUARD.chaseSpeed * 0.72;
    } else if (guard.mode === 'return') {
      goal = guard.home;
      speed = GUARD.patrolSpeed * 1.25;
    } else {
      goal = guard.path[guard.target];
    }
    if (!goal) return;
    const dx = goal.x - guard.x;
    const dy = goal.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (guard.pause > 0 && guard.mode === 'patrol') {
      guard.pause -= dt;
      guard.angle += Math.sin(state.time * 1.7 + guard.scanPhase) * 0.9 * dt;
      return;
    }
    if (distance < 4) {
      if (guard.mode === 'patrol') {
        guard.target = (guard.target + 1) % guard.path.length;
        if (guard.target === 0 || guard.target === guard.path.length - 1) guard.pause = GUARD.pauseSeconds;
      } else if (guard.mode === 'return') {
        guard.mode = 'patrol';
      } else {
        guard.mode = 'return'; // investigated or chased to the spot; head back
      }
      return;
    }
    const wanted = Math.atan2(dy, dx);
    guard.angle = angleLerp(guard.angle, wanted, Math.min(1, dt * 7));
    moveCircle(state, guard, Math.cos(wanted) * speed * dt, Math.sin(wanted) * speed * dt);
  }

  return {
    state,
    reset() {
      state.score = 0;
      state.caughtCount = 0;
      loadLevel(0);
    },
    restartLevel() {
      loadLevel(state.levelIndex);
    },
    nextLevel() {
      loadLevel((state.levelIndex + 1) % LEVELS.length);
    },
    levelCount: LEVELS.length,
    /** Advance one step. input: {x, y, run}. Returns an EVENT_* bitmask. */
    step(dt, input) {
      if (state.over) return EVENT_NONE; // caught: the level is done until restarted
      let events = EVENT_NONE;
      const player = state.player;
      state.time += dt;

      // --- the player ---
      const length = Math.hypot(input.x, input.y);
      player.moving = length > 0;
      player.running = player.moving && input.run;
      if (player.moving) {
        const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
        moveCircle(state, player, (input.x / length) * speed * dt, (input.y / length) * speed * dt);
      }
      if (!state.key.taken && Math.hypot(player.x - state.key.x, player.y - state.key.y) < 24) {
        state.key.taken = true;
        events |= EVENT_KEY;
      }
      if (state.key.taken && Math.hypot(player.x - state.exit.x, player.y - state.exit.y) < 22) {
        const timeBonus = Math.max(0, Math.round((state.par - state.time) * SCORE.secondBonus));
        state.score += SCORE.levelClear + timeBonus + (state.ghost ? SCORE.ghostBonus : 0);
        events |= EVENT_CLEAR;
        return events;
      }

      // --- being seen ---
      state.seen = false;
      let nearest = Infinity;
      for (const guard of state.guards) {
        if (guardSeesPlayer(state, guard)) {
          state.seen = true;
          nearest = Math.min(nearest, Math.hypot(player.x - guard.x, player.y - guard.y));
        }
      }
      if (state.seen) {
        state.lastSeen = { x: player.x, y: player.y };
        let fill = DETECTION.fillPerSecond * (1.25 - nearest / (GUARD.viewRange * 1.6));
        if (playerInShadow(state)) fill *= DETECTION.shadowFactor;
        if (player.running) fill *= DETECTION.runFactor;
        state.detection = Math.min(DETECTION.alertAt, state.detection + fill * dt);
      } else {
        state.detection = Math.max(0, state.detection - DETECTION.decayPerSecond * dt);
      }
      if (state.detection >= DETECTION.alertAt) {
        state.alert = DETECTION.alertSeconds;
        state.ghost = false;
      } else if (state.alert > 0) {
        state.alert -= dt;
        if (state.alert <= 0) state.detection = Math.min(state.detection, 40);
      }

      // --- the guards react ---
      for (const guard of state.guards) {
        if (state.alert > 0) guard.mode = 'chase';
        else if (guard.mode === 'chase') guard.mode = 'return';
        else if (state.detection >= DETECTION.suspiciousAt && state.lastSeen && guard.mode === 'patrol') guard.mode = 'investigate';
        else if (guard.mode === 'investigate' && state.detection < 20) guard.mode = 'return';
        stepGuard(guard, dt);
        if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.catchDistance) {
          state.caughtCount += 1;
          state.score = Math.max(0, state.score - SCORE.caughtPenalty);
          state.over = true;
          events |= EVENT_CAUGHT;
        }
      }
      return events;
    },
  };
}
