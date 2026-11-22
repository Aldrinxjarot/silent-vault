// Silent Vault — boot and game loop. With a ?shot= parameter the page stages
// one deterministic screenshot scene and holds it; otherwise it runs the
// live game: title, three levels of sneaking, caught and clear cards, pause,
// restart, and a best score kept in localStorage.

import { FIELD, STEP } from './config.js';
import { createInput } from './input.js';
import { createWorld, EVENT_CAUGHT, EVENT_CLEAR } from './world.js';
import { draw, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? '1') || 1;
const world = createWorld(seed);
world.reset();

const status = document.getElementById('status');
function announce(text) {
  if (status) status.textContent = text;
}

let best = 0;
try {
  best = Number(localStorage.getItem('silent-vault-best') ?? '0') || 0;
} catch {
  best = 0;
}
function saveBest() {
  best = Math.max(best, world.state.score);
  try {
    localStorage.setItem('silent-vault-best', String(best));
  } catch {
    // storage can be unavailable (private mode, file://): the game plays on
  }
}

const shot = params.get('shot');
if (shot !== null) {
  const staged = stageShot(shot, world);
  draw(ctx, world.state, staged.screen, best);
  announce(`Silent Vault screenshot scene: ${shot}`);
  window.__shotReady = true;
} else {
  const input = createInput();
  let screen = SCREEN_TITLE;
  let paused = false;
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min(0.1, (now - last) / 1000);
    last = now;

    if (input.tapped('pause') && screen === SCREEN_PLAY) paused = !paused;

    if (screen === SCREEN_TITLE && input.tapped('confirm')) {
      world.reset();
      screen = SCREEN_PLAY;
      announce('Level 1. Steal the key and reach the exit unseen.');
    } else if (screen === SCREEN_CAUGHT && input.tapped('restart')) {
      world.restartLevel();
      screen = SCREEN_PLAY;
      announce('Trying the level again.');
    } else if (screen === SCREEN_CLEAR && input.tapped('confirm')) {
      world.nextLevel();
      screen = SCREEN_PLAY;
      announce(world.state.levelName);
    } else if (screen === SCREEN_WON && input.tapped('confirm')) {
      world.reset();
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_PLAY && !paused) {
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, input.vector());
        if (events & EVENT_CAUGHT) {
          screen = SCREEN_CAUGHT;
          saveBest();
          announce('Caught! Press R to try the level again.');
          break;
        }
        if (events & EVENT_CLEAR) {
          saveBest();
          if (world.state.levelIndex === world.levelCount - 1) {
            screen = SCREEN_WON;
            announce('Vault emptied! Every level cleared.');
          } else {
            screen = SCREEN_CLEAR;
            announce('Level clear. Press Enter for the next level.');
          }
          break;
        }
      }
    } else {
      accumulator = 0;
    }

    draw(ctx, world.state, paused && screen === SCREEN_PLAY ? SCREEN_PAUSE : screen, best);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
