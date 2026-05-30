/** Anything that can take part in axis-aligned bounding-box collision. */
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Possible collision targets for a rocket. */
export type Aim = 'mob' | 'ufo' | 'ship';

export interface RocketOptions {
  x: number;
  y: number;
  width?: number;
  height?: number;
  vx?: number;
  vy?: number;
  color?: string;
  aims: Aim[];
  /** Called once when the rocket leaves the scene or hits a target. */
  onComplete?: () => void;
}
