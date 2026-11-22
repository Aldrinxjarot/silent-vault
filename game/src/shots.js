// The screenshot scenes behind ?shot=start|play|alert|end. Each one runs the
// real simulation forward from a fresh world at a fixed step, steered by a
// small pilot that walks waypoints and waits for a patrol to pass, so every
// frame is a moment a real game can reach and the same seed always gives the
// same frame. The pilot's route through level 1 threads the gaps in the
// walls: south down the west side, across the open bottom row, up the east
// side through the row-6 gap to the key, then back to the exit.

import { STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_CLEAR } from './world.js';
import { SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const NO_INPUT = { x: 0, y: 0, run: false };

function inputToward(state, tx, ty) {
  const dx = tx - state.player.x;
  const dy = ty - state.player.y;
  if (Math.hypot(dx, dy) < 6) return NO_INPUT;
  return { x: Math.abs(dx) > 4 ? Math.sign(dx) : 0, y: Math.abs(dy) > 4 ? Math.sign(dy) : 0, run: false };
}

function arrived(state, tx, ty) {
  return Math.hypot(tx - state.player.x, ty - state.player.y) < 8;
}

/** Walk the player through the waypoints; returns the events seen on the way. */
function walkRoute(world, waypoints, maxSeconds) {
  let events = 0;
  let wp = 0;
  const limit = Math.round(maxSeconds / STEP);
  for (let i = 0; i < limit && wp < waypoints.length; i += 1) {
    const [tx, ty] = waypoints[wp];
    if (arrived(world.state, tx, ty)) {
      wp += 1;
      continue;
    }
    events |= world.step(STEP, inputToward(world.state, tx, ty));
    if (events & (EVENT_CAUGHT | EVENT_CLEAR)) break;
  }
  return events;
}

function idle(world, seconds) {
  let events = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) events |= world.step(STEP, NO_INPUT);
  return events;
}

/** Stand still until the predicate holds (the corridor guard has walked east, say). */
function waitUntil(world, predicate, maxSeconds) {
  for (let i = 0; i < Math.round(maxSeconds / STEP); i += 1) {
    if (predicate(world.state)) return;
    world.step(STEP, NO_INPUT);
  }
}

// The shared infiltration of level 1: down the west side, wait above the
// corridor while its guard walks east, slip south through the west gap in
// the row-6 wall, along the bottom, up the east side to the key.
const ROUTE_TO_KEY = [
  [100, 220], [240, 220], // west side, above the corridor
  [240, 300], [240, 540], // through the gap, down to the bottom row
  [860, 540], [740, 460], [740, 300], [740, 140], // up the east side
  [820, 140], // the key
];

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a patrolled lobby. play: the key just stolen, deep
 * in the east wing. alert: caught in a torch beam, suspicion high.
 * end: the level-clear card after a full silent run of level 1.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'play' || name === 'end') {
    walkRoute(world, ROUTE_TO_KEY.slice(0, 2), 8);
    waitUntil(world, (s) => s.guards[0].x > 520, 9);
    const events = walkRoute(world, ROUTE_TO_KEY.slice(2), 40);
    if (name === 'play') {
      idle(world, 0.6);
      return { screen: SCREEN_PLAY };
    }
    const tail = walkRoute(world, [[740, 140], [740, 460], [780, 460]], 20);
    if ((events | tail) & EVENT_CLEAR) return { screen: SCREEN_CLEAR };
    if ((events | tail) & EVENT_CAUGHT) return { screen: SCREEN_CAUGHT };
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alert') {
    // Stand in the open just north of the corridor patrol's line. Its torch
    // sweeps onto the player as it passes: suspicion climbs past the
    // investigate threshold and the guard turns toward the intruder.
    state.player.x = 340;
    state.player.y = 290;
    idle(world, 1.9);
    return { screen: SCREEN_PLAY };
  }
  // start (and any other name): a few seconds of patrol behind the title.
  idle(world, 4);
  return { screen: SCREEN_TITLE };
}
