import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { ALIEN_SPRITES, COLORS, SCALE, SCORE } from '../config';
import { audio } from '../core/audio';

export interface MobOptions {
  color?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  type?: number;
}

export class Mob {
  active = true;
  color: string;
  width: number;
  height: number;
  x: number;
  y: number;
  type: number;

  constructor(options: MobOptions = {}) {
    this.type = options.type ?? 1;
    this.color = options.color ?? COLORS.mob[this.type] ?? COLORS.mob[1];
    this.width = options.width ?? 24;
    this.height = options.height ?? 16;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
  }

  explode(game: Game): void {
    if (this.active) {
      game.score += SCORE.mob * this.type;
      audio.alienDeath();
    }
    this.active = false;
  }

  draw(renderer: Renderer, frame = 0): void {
    const sprite = ALIEN_SPRITES[this.type];
    if (!sprite) return;
    const matrix = sprite[frame] ?? sprite[0];
    const sx = this.x + (this.width - matrix[0].length * SCALE.alien) / 2;
    const sy = this.y + (this.height - matrix.length * SCALE.alien) / 2;
    renderer.drawSprite(matrix, sx, sy, SCALE.alien, this.color);
  }
}
