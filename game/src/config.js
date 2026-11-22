// Silent Vault — shared constants and the three level maps.
// The field is a grid of tiles drawn on a fixed-size canvas; every level is
// 24 by 16 tiles. Map legend: # wall, C crate (blocks sight and movement),
// s shadow floor (walkable, detection fills slowly there), . open floor,
// P player start, K the vault key, X the exit door.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** Fixed simulation step, in seconds: the game and the screenshot scenes advance in these. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 11,
  walkSpeed: 122,
  runSpeed: 178,
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 52,
  chaseSpeed: 104,
  pauseSeconds: 0.9,
  viewRange: 158,
  viewHalfAngle: 0.62, // radians, about 35 degrees each side of facing
  catchDistance: 21,
};

export const DETECTION = {
  fillPerSecond: 58, // at point blank, lit, walking
  shadowFactor: 0.32, // fill multiplier while the player stands in shadow
  runFactor: 1.55, // fill multiplier while the player runs
  decayPerSecond: 16,
  suspiciousAt: 55, // a guard breaks off patrol and investigates
  alertAt: 100, // full alert: guards chase
  alertSeconds: 4.5, // how long an alert lasts without a fresh sighting
};

export const SCORE = {
  levelClear: 1000,
  ghostBonus: 250, // level finished without ever reaching full alert
  caughtPenalty: 150,
  secondBonus: 6, // per second under par
};

const L1 = [
  '########################',
  '#..........##..........#',
  '#.P........##......s...#',
  '#..........##......sK..#',
  '#..CC..........CC......#',
  '#..........##..........#',
  '#####..#########...#####',
  '#..........##..........#',
  '#....s.....##.CC.......#',
  '#....s.....##..........#',
  '#..........##..........#',
  '#..CC......##......X...#',
  '#..........##..........#',
  '#......s...............#',
  '#..........##..........#',
  '########################',
];

const L2 = [
  '########################',
  '#....s........#........#',
  '#.P.....CC....#....K...#',
  '#.............#........#',
  '#..####.......#...CC...#',
  '#.............#........#',
  '#.....s....#####.#######',
  '#.............#........#',
  '#..CC....s....#....s...#',
  '#.............#........#',
  '#####.#########........#',
  '#.............#...CC...#',
  '#....s........#........#',
  '#..CC......s......X....#',
  '#.............#........#',
  '########################',
];

const L3 = [
  '########################',
  '#.....#.......#........#',
  '#.P...#...s...#....s...#',
  '#.....#.......#........#',
  '#..C..###.#####...C....#',
  '#......................#',
  '#....s.....K......C....#',
  '#......................#',
  '#####.##########.#######',
  '#........#.............#',
  '#...C....#....s....C...#',
  '#........#.............#',
  '#..s.....###.#####.....#',
  '#.....................X#',
  '#....s........s........#',
  '########################',
];

/**
 * The campaign: each level names its map and its guards. A guard patrols its
 * waypoints (tile coordinates) in order, back and forth, pausing at each end.
 */
export const LEVELS = [
  {
    name: 'Level 1 — The Lobby',
    par: 45,
    map: L1,
    guards: [
      { path: [[4, 7], [19, 7]] },
      { path: [[17, 12], [17, 3]] },
    ],
  },
  {
    name: 'Level 2 — The Archive',
    par: 60,
    map: L2,
    guards: [
      { path: [[3, 8], [12, 8]] },
      { path: [[19, 3], [19, 12]] },
      { path: [[12, 13], [4, 13]] },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    par: 75,
    map: L3,
    guards: [
      { path: [[8, 5], [15, 5]] },
      { path: [[11, 10], [11, 13]] },
      { path: [[18, 3], [18, 10]] },
      { path: [[4, 10], [4, 13]] },
    ],
  },
];
