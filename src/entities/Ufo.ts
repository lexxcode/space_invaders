import type { Game } from '../core/Game';
import { Mob } from './Mob';
import { COLORS, SCORE, UFO } from '../config';

/** The bonus saucer: drifts across the top of the screen and, when hit,
 *  awards points and parks itself off-screen instead of dying. */
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
      type: UFO.type,
    });
  }

  override explode(game: Game): void {
    game.score += SCORE.ufo;
    this.x = this.vx > 0 ? game.renderer.canvas.width : -this.width;
  }

  update(game: Game): void {
    const { renderer } = game;
    const { canvas } = renderer;

    if (!this.vx && Math.random() < this.chance / renderer.fps) {
      this.vx = this.x < 0 ? UFO.speed : -UFO.speed;
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
