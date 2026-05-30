/** Game-wide tunable constants and the procedural pixel-art sprites.
 *  Sprites are authored as strings (`#` = filled pixel) and rendered with
 *  `Renderer.drawSprite`, so the game needs no image assets. */

export const CANVAS = { width: 800, height: 600 } as const;

export const COLORS = {
  background: '#000',
  ship: '#33ff66',
  rocket: '#ffffff',
  alienRocket: '#ff5555',
  ufo: '#ff55ff',
  bunker: '#33ff66',
  explosion: '#ffcc33',
  /** Color per mob type (1 = bottom rows … 3 = top row). */
  mob: { 1: '#55ddff', 2: '#66ff66', 3: '#ffe14d' } as Record<number, string>,
} as const;

/** Pixel scale for each kind of sprite. */
export const SCALE = { alien: 2, ship: 2, ufo: 3, bunker: 3, life: 2 } as const;

const px = (rows: string[]): number[][] =>
  rows.map((row) => Array.from(row, (c) => (c === '#' ? 1 : 0)));

/** Two animation frames per alien type, keyed by mob type. */
export const ALIEN_SPRITES: Record<number, [number[][], number[][]]> = {
  // Type 3 — "squid" (top row)
  3: [
    px([
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '..#..#..',
      '.#.##.#.',
      '#.#..#.#',
    ]),
    px([
      '...##...',
      '..####..',
      '.######.',
      '##.##.##',
      '########',
      '.#.##.#.',
      '#......#',
      '.#....#.',
    ]),
  ],
  // Type 2 — "crab" (middle rows)
  2: [
    px([
      '..#.....#..',
      '...#...#...',
      '..#######..',
      '.##.###.##.',
      '###########',
      '#.#######.#',
      '#.#.....#.#',
      '...##.##...',
    ]),
    px([
      '..#.....#..',
      '#..#...#..#',
      '#.#######.#',
      '###.###.###',
      '###########',
      '.#########.',
      '..#.....#..',
      '.#.......#.',
    ]),
  ],
  // Type 1 — "octopus" (bottom rows)
  1: [
    px([
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '...##..##...',
      '..##.##.##..',
      '##........##',
    ]),
    px([
      '....####....',
      '.##########.',
      '############',
      '###..##..###',
      '############',
      '..###..###..',
      '.##......##.',
      '..##....##..',
    ]),
  ],
};

export const SHIP_SPRITE = px([
  '......#......',
  '.....###.....',
  '.....###.....',
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
]);

export const SHIP_EXPLOSION_SPRITE = px([
  '#...#..#...#.',
  '.#.#..#..#.#.',
  '..#.#.#.#.#..',
  '#..#.#.#..#.#',
  '.#..#...#..#.',
  '#.#..#.#..#..',
  '..#.#...#.#.#',
  '.#..#.#..#..#',
]);

export const UFO_SPRITE = px([
  '....########....',
  '..############..',
  '.##############.',
  '################',
  '.###.######.###.',
  '..##........##..',
  '...#..####..#...',
]);

export const SHIP = {
  /** Horizontal step per second, as a fraction of the canvas width. */
  stepFactor: 0.45,
  lives: 3,
  /** How long the ship explosion freezes the scene, in ms. */
  explodeMs: 1100,
} as const;

/** Fired-rocket dimensions. */
export const ROCKET = { width: 3, height: 14 } as const;

export const MOB = { width: 24, height: 16, margin: 10 } as const;

/** Mob type per cell — higher type = more points and sits higher. */
export const MOBS_MAP: number[][] = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GROUP = {
  /** Initial horizontal speed as a fraction of the canvas width (per second). */
  vxFactor: 0.12,
  /** Pixels the swarm drops each time it touches an edge. */
  descend: 14,
  /** Speed bump applied on every new level. */
  levelSpeedup: 0.12,
  /** Y of the top row on level 1; pushed down a bit each level. */
  startY: 70,
  levelDescent: 18,
  /** Speed multiplier when only one alien is left (scales linearly from 1). */
  maxSpeedMultiplier: 5,
  /** Two-frame animation cadence (ms) at full swarm … at one alien. */
  frameMsMax: 600,
  frameMsMin: 90,
} as const;

export const ALIEN_FIRE = {
  maxBullets: 3,
  baseIntervalMs: 1100,
  minIntervalMs: 280,
  /** Bullet speed as a fraction of canvas height per second. */
  speedFactor: 0.45,
} as const;

export const UFO = {
  width: 48,
  height: 21,
  y: 16,
  /** Per-frame spawn chance (divided by FPS). */
  chance: 0.04,
  speed: 130,
  /** Mystery bonus values, chosen at random on hit. */
  scores: [50, 100, 150, 300] as number[],
} as const;

export const BUNKER = {
  count: 4,
  cols: 14,
  rows: 10,
  /** Blast radius (in cells) erased per hit. */
  blast: 2,
} as const;

/** Score awarded: `mob` is multiplied by the mob type. */
export const SCORE = { mob: 10 } as const;

export const STORAGE_KEY = 'spaceInvaders.hiscore';
