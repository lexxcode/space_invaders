import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { COLORS, ROCKET, SCORE } from '../config';
import { Rocket } from './Rocket';

export interface MobOptions {
  color?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  type?: number;
  maxRocketStack?: number;
}

export class Mob {
  active = true;
  color: string;
  width: number;
  height: number;
  x: number;
  y: number;
  type: number;
  maxRocketStack: number;
  rocketCount = 0;

  constructor(options: MobOptions = {}) {
    this.color = options.color ?? COLORS.mob;
    this.width = options.width ?? 32;
    this.height = options.height ?? 32;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.type = options.type ?? 1;
    this.maxRocketStack = options.maxRocketStack ?? 1;
  }

  shoot(game: Game): void {
    if (this.rocketCount >= this.maxRocketStack) return;
    game.rockets.add(
      new Rocket({
        x: this.width / 2 + this.x - 2.5,
        y: this.y + this.height,
        width: ROCKET.width,
        height: ROCKET.height,
        vy: game.renderer.canvas.height,
        aims: ['ship'],
        onComplete: () => {
          this.rocketCount--;
        },
      }),
    );
    this.rocketCount++;
  }

  explode(game: Game): void {
    if (this.active) game.score += SCORE.mob * this.type;
    this.active = false;
  }

  draw(renderer: Renderer): void {
    renderer.fillRect(this.x, this.y, this.width, this.height, this.color);
  }
}
