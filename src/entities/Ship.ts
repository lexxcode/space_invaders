import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { keys } from '../core/input';
import { audio } from '../core/audio';
import { COLORS, ROCKET, SCALE, SHIP_EXPLOSION_SPRITE, SHIP_SPRITE } from '../config';
import { Rocket } from './Rocket';

export interface ShipOptions {
  color?: string;
  x?: number;
  y?: number;
  step?: number;
  lives?: number;
  maxRocketStack?: number;
}

export class Ship {
  color: string;
  x: number;
  y: number;
  readonly width = SHIP_SPRITE[0].length * SCALE.ship;
  readonly height = SHIP_SPRITE.length * SCALE.ship;
  step: number;
  lives: number;
  maxRocketStack: number;
  rocketCount = 0;
  /** While true the ship is exploding: frozen and drawn as debris. */
  dying = false;

  constructor(options: ShipOptions = {}) {
    this.color = options.color ?? COLORS.ship;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.step = options.step ?? 20;
    this.lives = options.lives ?? 3;
    this.maxRocketStack = options.maxRocketStack ?? 1;
  }

  shoot(game: Game): void {
    if (this.rocketCount >= this.maxRocketStack) return;
    game.rockets.add(
      new Rocket({
        x: this.x + this.width / 2 - ROCKET.width / 2,
        y: this.y,
        width: ROCKET.width,
        height: ROCKET.height,
        vy: -game.renderer.canvas.height,
        aims: ['mob', 'ufo'],
        onComplete: () => {
          this.rocketCount--;
        },
      }),
    );
    this.rocketCount++;
    audio.shoot();
  }

  /** Re-center the ship and clear the dying state (new game / respawn). */
  reset(renderer: Renderer): void {
    this.x = (renderer.canvas.width - this.width) / 2;
    this.y = renderer.canvas.height - this.height - 12;
    this.dying = false;
    this.rocketCount = 0;
  }

  draw(renderer: Renderer): void {
    const sprite = this.dying ? SHIP_EXPLOSION_SPRITE : SHIP_SPRITE;
    const color = this.dying ? COLORS.explosion : this.color;
    renderer.drawSprite(sprite, this.x, this.y, SCALE.ship, color);
  }

  update(game: Game): void {
    if (this.dying) return;
    const { renderer } = game;

    if (keys.left) this.x -= (renderer.dt / 1000) * this.step;
    if (keys.right) this.x += (renderer.dt / 1000) * this.step;
    this.x = Math.min(Math.max(this.x, 0), renderer.canvas.width - this.width);

    if (keys.space) this.shoot(game);
  }
}
