import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import type { Aim, RocketOptions } from '../types';
import { COLORS } from '../config';

export class Rocket {
  active = true;
  color: string;
  width: number;
  height: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aims: Aim[];

  private readonly onComplete: () => void;

  constructor(options: RocketOptions) {
    this.color = options.color ?? COLORS.rocket;
    this.width = options.width ?? 4;
    this.height = options.height ?? 8;
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx ?? 0;
    this.vy = options.vy ?? 0;
    this.aims = options.aims;
    this.onComplete = options.onComplete ?? (() => {});
  }

  private inScene(renderer: Renderer): boolean {
    return (
      this.x >= 0 &&
      this.x + this.width <= renderer.canvas.width &&
      this.y >= 0 &&
      this.y + this.height <= renderer.canvas.height
    );
  }

  draw(renderer: Renderer): void {
    renderer.fillRect(this.x, this.y, this.width, this.height, this.color);
  }

  update(game: Game): void {
    const { renderer } = game;
    this.x += (renderer.dt / 1000) * this.vx;
    this.y += (renderer.dt / 1000) * this.vy;

    // Bunkers block every rocket, regardless of its target.
    for (const bunker of game.bunkers) {
      if (bunker.absorb(this)) {
        this.active = false;
        break;
      }
    }

    if (this.active && this.aims.includes('mob')) {
      for (const row of game.mobsGroup.mobsStack) {
        for (const mob of row) {
          if (game.collides(this, mob)) {
            mob.explode(game);
            this.active = false;
          }
        }
      }
    }
    if (this.active && this.aims.includes('ufo') && game.collides(this, game.ufo)) {
      game.ufo.explode(game);
      this.active = false;
    }
    if (this.active && this.aims.includes('ship') && !game.ship.dying && game.collides(this, game.ship)) {
      game.killShip();
      this.active = false;
    }

    this.active = this.active && this.inScene(renderer);
    if (!this.active) this.onComplete();
  }
}

/** Owns the live rockets and updates/draws them as a group. */
export class RocketManager {
  stack: Rocket[] = [];

  add(rocket: Rocket): void {
    this.stack.push(rocket);
  }

  reset(): void {
    this.stack = [];
  }

  /** Number of live alien bullets (used to cap the swarm's fire rate). */
  alienCount(): number {
    return this.stack.reduce((n, r) => (r.aims.includes('ship') ? n + 1 : n), 0);
  }

  update(game: Game): void {
    this.stack = this.stack.filter((rocket) => {
      rocket.update(game);
      return rocket.active;
    });
  }

  draw(renderer: Renderer): void {
    for (const rocket of this.stack) rocket.draw(renderer);
  }
}
