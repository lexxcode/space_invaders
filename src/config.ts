/** Game-wide tunable constants. Gameplay values are kept identical to the
 *  original implementation; only the magic numbers were given names. */

export const CANVAS = { width: 800, height: 600 } as const;

export const COLORS = {
  background: '#000',
  ship: '#f80',
  rocket: '#f00',
  mob: '#0f0',
  mobShoot: '#088',
  ufo: '#d50',
} as const;

export const SHIP = {
  width: 32,
  height: 28,
  /** Horizontal step per second, as a fraction of the canvas width. */
  stepFactor: 0.2,
  lives: 3,
} as const;

/** Dimensions of a fired rocket (both ship and mob rockets). */
export const ROCKET = { width: 5, height: 16 } as const;

export const MOB = { width: 24, height: 24, margin: 5 } as const;

/** Mob type per cell — higher type = more points. */
export const MOBS_MAP: number[][] = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const GROUP = {
  shootChance: 0.25,
  /** Initial horizontal/vertical speed as a fraction of the canvas size. */
  vxFactor: 0.05,
  vyFactor: 0.05,
  /** Speed increase applied each new level. */
  levelSpeedup: 0.05,
  startY: 40,
} as const;

export const UFO = {
  width: 48,
  height: 24,
  y: 10,
  type: 10,
  chance: 0.05,
  speed: 100,
} as const;

/** Score awarded: `mob` is multiplied by the mob type. */
export const SCORE = { mob: 10, ufo: 500 } as const;
