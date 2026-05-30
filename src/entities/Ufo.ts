import type { Game } from '../core/Game';
import type { Renderer } from '../core/Renderer';
import { Mob } from './Mob';
import { COLORS, SCALE, UFO, UFO_SPRITE } from '../config';
import { audio } from '../core/audio';

/** The bonus saucer: drifts across the top of the screen and, when hit,
 *  awards a random mystery bonus and parks itself off-screen. */
export class Ufo extends Mob {
  vx = 0;
  chance = UFO.chance;

  constructor() {
    super({
      color: COLORS.ufo,
      width: UFO.width,
      height: UFO.height,
      x: -UFO.width,
      y: UFO.y,
      type: 10,
    });
  }

  override explode(game: Game): void {
    game.score += UFO.scores[Math.floor(Math.random() * UFO.scores.length)];
    audio.ufoHit();
    this.x = this.vx > 0 ? game.renderer.canvas.width : -this.width;
  }

  override draw(renderer: Renderer): void {
    const sx = this.x + (this.width - UFO_SPRITE[0].length * SCALE.ufo) / 2;
    const sy = this.y + (this.height - UFO_SPRITE.length * SCALE.ufo) / 2;
    renderer.drawSprite(UFO_SPRITE, sx, sy, SCALE.ufo, this.color);
  }

  update(game: Game): void {
    const { renderer } = game;
    const { canvas } = renderer;

    if (!this.vx && Math.random() < this.chance / renderer.fps) {
      this.vx = this.x < 0 ? UFO.speed : -UFO.speed;
      audio.ufo();
    } else if (this.vx > 0 && this.x > canvas.width) {
      this.vx = 0;
      this.x = canvas.width;
    } else if (this.vx < 0 && this.x < -this.width) {
      this.vx = 0;
      this.x = -this.width;
    }

    this.x += (renderer.dt / 1000) * this.vx;
  }
}
