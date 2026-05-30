import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { COLORS, GROUP, MOB, MOBS_MAP } from '../config';
import { Mob } from './Mob';

export interface MobsGroupOptions {
  mobWidth?: number;
  mobHeight?: number;
  margin?: number;
  mobsMap?: number[][];
  shootChance?: number;
}

/** The grid of mobs: spawns the formation, marches it back and forth and
 *  down, lets the front row shoot, and ends the game on contact with the ship. */
export class MobsGroup {
  readonly mobWidth: number;
  readonly mobHeight: number;
  readonly margin: number;
  readonly mobsMap: number[][];
  readonly shootChance: number;

  mobsStack: Mob[][] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  vx = 0;
  vy = 0;

  constructor(options: MobsGroupOptions = {}) {
    this.mobWidth = options.mobWidth ?? MOB.width;
    this.mobHeight = options.mobHeight ?? MOB.height;
    this.margin = options.margin ?? MOB.margin;
    this.mobsMap = options.mobsMap ?? MOBS_MAP;
    this.shootChance = options.shootChance ?? GROUP.shootChance;
  }

  create(level: number, renderer: Renderer): void {
    const { canvas } = renderer;
    this.mobsStack = [];
    this.vx = level === 1 ? canvas.width * GROUP.vxFactor : this.vx + this.vx * GROUP.levelSpeedup;
    this.vy = level === 1 ? canvas.height * GROUP.vyFactor : this.vy + this.vy * GROUP.levelSpeedup;
    this.width = this.mobsMap[0].length * this.mobWidth + (this.mobsMap[0].length - 1) * this.margin;
    this.height = this.mobsMap.length * this.mobHeight + (this.mobsMap.length - 1) * this.margin;
    this.x = (canvas.width - this.width) / 2;
    this.y = GROUP.startY;

    for (let i = 0; i < this.mobsMap.length; i++) {
      const row: Mob[] = [];
      for (let j = 0; j < this.mobsMap[i].length; j++) {
        row.push(
          new Mob({
            width: this.mobWidth,
            height: this.mobHeight,
            x: (this.mobWidth + this.margin) * j + this.x,
            y: (this.mobHeight + this.margin) * i + this.y,
            type: this.mobsMap[i][j],
          }),
        );
      }
      this.mobsStack.push(row);
    }
  }

  private randShoot(game: Game): void {
    if (!this.mobsStack.length) return;
    const lastRow = this.mobsStack[this.mobsStack.length - 1];
    lastRow[0].color = COLORS.mobShoot;
    lastRow[0].shoot(game);
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

    const oldX = this.x;
    const oldY = this.y;
    this.width -= this.x;
    this.height -= this.y;

    const tmpX = this.x + (renderer.dt / 1000) * this.vx;
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

    // Reaching the ship's row ends the game.
    if (game.ship.y < this.y + this.height) {
      this.y -= this.y + this.height - game.ship.y;
      game.ship.explode();
      game.finish();
    }

    // Shift every mob by the formation's delta.
    for (const row of this.mobsStack) {
      for (const mob of row) {
        mob.x += this.x - oldX;
        mob.y += this.y - oldY;
      }
    }

    if (Math.random() < this.shootChance / renderer.fps) {
      this.randShoot(game);
    }
  }

  draw(renderer: Renderer): void {
    for (const row of this.mobsStack) {
      for (const mob of row) mob.draw(renderer);
    }
  }
}
