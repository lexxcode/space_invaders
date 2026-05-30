import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { ALIEN_FIRE, COLORS, GROUP, MOB, MOBS_MAP, ROCKET } from '../config';
import { audio } from '../core/audio';
import { Mob } from './Mob';
import { Rocket } from './Rocket';

export interface MobsGroupOptions {
  mobWidth?: number;
  mobHeight?: number;
  margin?: number;
  mobsMap?: number[][];
}

/** The grid of aliens: spawns the formation, marches it (accelerating as
 *  members die), animates the two-frame walk, fires from random columns and
 *  ends the game on contact with the ship. */
export class MobsGroup {
  readonly mobWidth: number;
  readonly mobHeight: number;
  readonly margin: number;
  readonly mobsMap: number[][];

  mobsStack: Mob[][] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  vx = 0;
  vy = 0;

  private initialCount = 1;
  frame = 0;
  private frameTimer = 0;
  private fireTimer = 0;

  constructor(options: MobsGroupOptions = {}) {
    this.mobWidth = options.mobWidth ?? MOB.width;
    this.mobHeight = options.mobHeight ?? MOB.height;
    this.margin = options.margin ?? MOB.margin;
    this.mobsMap = options.mobsMap ?? MOBS_MAP;
  }

  get count(): number {
    return this.mobsStack.reduce((n, row) => n + row.length, 0);
  }

  create(level: number, renderer: Renderer): void {
    const { canvas } = renderer;
    this.mobsStack = [];
    const pitchX = this.mobWidth + this.margin;
    const pitchY = this.mobHeight + this.margin;

    this.vx = canvas.width * GROUP.vxFactor * (1 + (level - 1) * GROUP.levelSpeedup);
    this.vy = GROUP.descend;
    this.width = this.mobsMap[0].length * pitchX - this.margin;
    this.height = this.mobsMap.length * pitchY - this.margin;
    this.x = (canvas.width - this.width) / 2;
    this.y = GROUP.startY + (level - 1) * GROUP.levelDescent;

    for (let i = 0; i < this.mobsMap.length; i++) {
      const row: Mob[] = [];
      for (let j = 0; j < this.mobsMap[i].length; j++) {
        row.push(
          new Mob({
            width: this.mobWidth,
            height: this.mobHeight,
            x: pitchX * j + this.x,
            y: pitchY * i + this.y,
            type: this.mobsMap[i][j],
          }),
        );
      }
      this.mobsStack.push(row);
    }

    this.initialCount = this.count;
    this.frame = 0;
    this.frameTimer = 0;
    this.fireTimer = this.nextFireInterval(level);
  }

  /** Speeds up as aliens are destroyed (1 → maxSpeedMultiplier). */
  private get speedMultiplier(): number {
    const cleared = 1 - this.count / this.initialCount;
    return 1 + cleared * (GROUP.maxSpeedMultiplier - 1);
  }

  private nextFireInterval(level: number): number {
    const span = ALIEN_FIRE.baseIntervalMs - ALIEN_FIRE.minIntervalMs;
    return (ALIEN_FIRE.minIntervalMs + Math.random() * span) / level;
  }

  /** The lowest alien in each column (grouped by x), i.e. who can fire. */
  private bottomMobs(): Mob[] {
    const byColumn = new Map<number, Mob>();
    for (const row of this.mobsStack) {
      for (const mob of row) {
        const key = Math.round(mob.x);
        const current = byColumn.get(key);
        if (!current || mob.y > current.y) byColumn.set(key, mob);
      }
    }
    return [...byColumn.values()];
  }

  private fire(game: Game): void {
    const shooters = this.bottomMobs();
    if (!shooters.length) return;
    const mob = shooters[Math.floor(Math.random() * shooters.length)];
    game.rockets.add(
      new Rocket({
        x: mob.x + mob.width / 2 - ROCKET.width / 2,
        y: mob.y + mob.height,
        width: ROCKET.width,
        height: ROCKET.height,
        color: COLORS.alienRocket,
        vy: game.renderer.canvas.height * ALIEN_FIRE.speedFactor,
        aims: ['ship'],
      }),
    );
  }

  update(game: Game): void {
    const { renderer } = game;

    // Recompute the formation's bounding box from the surviving mobs.
    this.x = Infinity;
    this.width = 0;
    this.height = 0;
    for (let i = 0; i < this.mobsStack.length; i++) {
      this.mobsStack[i] = this.mobsStack[i].filter((mob) => {
        if (mob.active) {
          this.x = Math.min(this.x, mob.x);
          this.width = Math.max(this.width, mob.x + mob.width);
          this.height = Math.max(this.height, mob.y + mob.height);
        }
        return mob.active;
      });
    }
    this.mobsStack = this.mobsStack.filter((row) => row.length);
    if (!this.mobsStack.length) return;

    const oldX = this.x;
    const oldY = this.y;
    this.width -= this.x;
    this.height -= this.y;

    const dx = (renderer.dt / 1000) * this.vx * this.speedMultiplier;
    const tmpX = this.x + dx;
    if (tmpX + this.width > renderer.canvas.width) {
      this.x = renderer.canvas.width - (tmpX + this.width - renderer.canvas.width) - this.width;
      this.y += this.vy;
      this.vx = -this.vx;
    } else if (tmpX < 0) {
      this.x = -tmpX;
      this.y += this.vy;
      this.vx = -this.vx;
    } else {
      this.x = tmpX;
    }

    // Shift every mob by the formation's delta.
    for (const row of this.mobsStack) {
      for (const mob of row) {
        mob.x += this.x - oldX;
        mob.y += this.y - oldY;
      }
    }

    // Erode bunkers the swarm has descended into.
    for (const bunker of game.bunkers) {
      for (const row of this.mobsStack) {
        for (const mob of row) bunker.erode(mob);
      }
    }

    // Reaching the ship's row ends the game.
    if (this.height + this.y > game.ship.y) {
      game.gameOver();
      return;
    }

    // Two-frame animation, faster as the swarm thins out.
    this.frameTimer -= renderer.dt;
    if (this.frameTimer <= 0) {
      const t = 1 - this.count / this.initialCount;
      this.frameTimer = GROUP.frameMsMax + t * (GROUP.frameMsMin - GROUP.frameMsMax);
      this.frame ^= 1;
      audio.marchTick();
    }

    // Firing.
    this.fireTimer -= renderer.dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.nextFireInterval(game.level);
      if (game.rockets.alienCount() < ALIEN_FIRE.maxBullets) this.fire(game);
    }
  }

  draw(renderer: Renderer): void {
    for (const row of this.mobsStack) {
      for (const mob of row) mob.draw(renderer, this.frame);
    }
  }
}
