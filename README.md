[![make.fun bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Aldrinxjarot/silent-vault/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Aldrinxjarot/silent-vault/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# Silent Vault

A tiny top-down stealth game for the make.fun "best stealth game" bounty.
You are a thief in a dark vault complex at night: sneak past patrolling
guards, steal the gold key on each floor, and reach the exit unseen.

## How to play

- **Move:** WASD or arrow keys. **Run:** hold Shift — faster, but guards spot
  you much sooner. **Pause:** P or Esc. **Restart a level:** R.
- Guards patrol fixed routes, sweeping torch cones ahead of them. Stay out
  of the cones; walls and crates block their sight, and the dark **shadow
  tiles** slow detection to a crawl even inside a beam.
- The eye bar at the top fills while you are seen. Past half, a guard breaks
  off patrol to investigate where you were spotted; full means **alert** —
  every guard chases, and if one touches you, you are caught.
- Three levels (Lobby, Archive, Vault) with two, three and four guards.
  Scoring rewards speed and a **ghost bonus** for finishing a level without
  ever triggering a full alert.

## Layout

- `game/` — the game itself: plain static files, no build step, no network.
  `game/index.html` loads ES modules from `game/src/`: `config.js` (levels
  and tuning), `world.js` (the simulation: patrols, vision, detection),
  `render.js` (canvas drawing, darkness, HUD, screens), `input.js`
  (keyboard), `random.js` (seeded RNG), `shots.js` (the deterministic
  screenshot scenes behind `?shot=start|play|alert|end`), `main.js` (boot
  and loop).
- `screenshots/` — four real renders of the game (title, infiltration,
  alert, level clear), taken with headless Chromium from the `?shot=`
  scenes listed in `shots.json`.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library in
  `vendor/makefun-game.ts`.
- `serve.ts` — a small static server for local play at
  http://localhost:8080 (`node serve.ts`).

Run the hand-in locally with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
