import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { keys } from '../core/input';
import { COLORS, ROCKET } from '../config';
import { Rocket } from './Rocket';

export interface ShipOptions {
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  step?: number;
  lives?: number;
  maxRocketStack?: number;
}

export class Ship {
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  step: number;
  lives: number;
  maxRocketStack: number;
  rocketCount = 0;

  constructor(options: ShipOptions = {}) {
    this.color = options.color ?? COLORS.ship;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? 28;
    this.height = options.height ?? 28;
    this.step = options.step ?? 20;
    this.lives = options.lives ?? 3;
    this.maxRocketStack = options.maxRocketStack ?? 1;
  }

  shoot(game: Game): void {
    if (this.rocketCount >= this.maxRocketStack) return;
    game.rockets.add(
      new Rocket({
        x: this.width / 2 + this.x - 2.5,
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
  }

  explode(): void {
    this.lives--;
  }

  draw(renderer: Renderer): void {
    renderer.fillRect(this.x, this.y, this.width, this.height, this.color);
  }

  update(game: Game): void {
    const { renderer } = game;

    if (keys.left) this.x -= (renderer.dt / 1000) * this.step;
    if (keys.right) this.x += (renderer.dt / 1000) * this.step;
    this.x = Number(Math.min(Math.max(this.x, 0), renderer.canvas.width - this.width).toFixed(4));

    if (keys.space) this.shoot(game);

    game.hud.setLives(this.lives);
    if (this.lives <= 0) game.finish();
  }
}
