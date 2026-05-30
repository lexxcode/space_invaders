import { BUNKER, COLORS, SCALE, SHIP, SHIP_SPRITE, STORAGE_KEY } from '../config';
import type { Entity } from '../types';
import { intersects } from './collision';
import { Bunker } from '../entities/Bunker';
import { MobsGroup } from '../entities/MobsGroup';
import { RocketManager } from '../entities/Rocket';
import { Ship } from '../entities/Ship';
import { Ufo } from '../entities/Ufo';
import { audio } from './audio';
import { Hud } from './hud';
import { initInput, keys } from './input';
import { Renderer } from './Renderer';

export class Game {
  readonly renderer: Renderer;
  readonly hud: Hud;
  readonly rockets = new RocketManager();

  // Created on `newGame`; non-null while a game is running.
  ship!: Ship;
  mobsGroup!: MobsGroup;
  ufo!: Ufo;
  bunkers: Bunker[] = [];

  level = 0;
  score = 0;
  hiScore = 0;
  inited = false;
  started = false;
  paused = false;
  gameover = false;

  /** Counts down the player explosion freeze; 0 means the ship is alive. */
  private shipDeadTimer = 0;
  /** Debounces the Esc key so one press toggles pause exactly once. */
  private escLatch = true;

  private menu!: HTMLDivElement;
  private banner!: HTMLDivElement;
  private resumeBtn!: HTMLButtonElement;
  private newGameBtn!: HTMLButtonElement;

  constructor(renderer: Renderer, hud: Hud) {
    this.renderer = renderer;
    this.hud = hud;
    this.hiScore = this.loadHiScore();
    this.hud.setHiScore(this.hiScore);
    this.hud.setMuted(audio.muted);
    initInput({
      onBlur: () => {
        if (this.started) this.pause();
      },
      onMute: () => {
        this.hud.setMuted(audio.toggleMute());
      },
    });
  }

  /** Build the menu overlay once, before the first game starts. */
  init(): void {
    this.menu = document.createElement('div');
    this.menu.classList.add('gameMenu');

    this.banner = document.createElement('div');
    this.banner.classList.add('gameBanner', 'hide');
    this.menu.appendChild(this.banner);

    this.resumeBtn = this.createButton('resumegame', 'Resume', () => this.resume());
    this.resumeBtn.classList.add('hide');
    this.menu.appendChild(this.resumeBtn);

    this.newGameBtn = this.createButton('newgame', 'New Game', () => this.newGame());
    this.menu.appendChild(this.newGameBtn);

    this.renderer.canvas.parentElement?.appendChild(this.menu);
    this.renderer.setPaused(true);
    this.inited = true;
  }

  private createButton(id: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.classList.add('game-btn');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      onClick();
      btn.blur();
    });
    return btn;
  }

  newGame(): void {
    audio.unlock(); // first user gesture — start the audio context
    this.level = 0;
    this.score = 0;
    this.gameover = false;
    this.shipDeadTimer = 0;
    this.rockets.reset();

    this.ship = new Ship({ step: this.renderer.canvas.width * SHIP.stepFactor, lives: SHIP.lives });
    this.ship.reset(this.renderer);
    this.mobsGroup = new MobsGroup();
    this.ufo = new Ufo();

    this.start();
    this.banner.classList.add('hide');
    this.menu.classList.add('hide');
    this.renderer.setPaused(false);
    this.hud.setScore(this.score);
    this.hud.setLives(this.ship.lives);
  }

  private createBunkers(): Bunker[] {
    const width = BUNKER.cols * SCALE.bunker;
    const height = BUNKER.rows * SCALE.bunker;
    const gap = (this.renderer.canvas.width - BUNKER.count * width) / (BUNKER.count + 1);
    const y = this.ship.y - height - 40;
    return Array.from({ length: BUNKER.count }, (_, i) => new Bunker(gap + i * (width + gap), y));
  }

  start(): void {
    this.level++;
    this.hud.setLevel(this.level);
    this.rockets.reset();
    // reset() drops in-flight rockets without firing their onComplete, so the
    // ship's rocket counter must be cleared too or it could stay maxed out.
    this.ship.rocketCount = 0;
    this.bunkers = this.createBunkers();
    this.mobsGroup.create(this.level, this.renderer);
    this.started = true;
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
    this.menu.classList.remove('hide');
    this.resumeBtn.classList.remove('hide');
    this.renderer.setPaused(true);
  }

  resume(): void {
    this.paused = false;
    this.menu.classList.add('hide');
    this.renderer.setPaused(false);
  }

  /** Begin the player death sequence (freeze + explosion). */
  killShip(): void {
    if (this.shipDeadTimer > 0) return;
    this.ship.dying = true;
    this.shipDeadTimer = SHIP.explodeMs;
    audio.playerDeath();
  }

  gameOver(): void {
    this.started = false;
    this.gameover = true;
    this.saveHiScore();
    this.banner.textContent = `Game Over — Score: ${this.score}`;
    this.banner.classList.remove('hide');
    this.resumeBtn.classList.add('hide');
    this.menu.classList.remove('hide');
    this.renderer.setPaused(true);
  }

  update(): void {
    // While the ship is exploding, freeze the scene and run the timer.
    if (this.shipDeadTimer > 0) {
      this.shipDeadTimer -= this.renderer.dt;
      if (this.shipDeadTimer <= 0) {
        this.ship.lives--;
        this.hud.setLives(this.ship.lives);
        if (this.ship.lives <= 0) {
          this.gameOver();
        } else {
          this.ship.reset(this.renderer);
          this.clearAlienBullets();
        }
      }
      return;
    }

    this.ship.update(this);
    this.mobsGroup.update(this);
    if (this.gameover) return;

    this.ufo.update(this);
    this.rockets.update(this);

    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.hud.setHiScore(this.hiScore);
    }
    this.hud.setScore(this.score);

    if (!this.mobsGroup.mobsStack.length) this.start();
  }

  render(): void {
    this.renderer.clear();
    for (const bunker of this.bunkers) bunker.draw(this.renderer);
    this.rockets.draw(this.renderer);
    this.ship.draw(this.renderer);
    this.mobsGroup.draw(this.renderer);
    this.ufo.draw(this.renderer);
    this.drawLives();
  }

  /** Remaining lives rendered as small ship icons in the bottom-left. */
  private drawLives(): void {
    const iconW = SHIP_SPRITE[0].length * SCALE.life;
    const iconH = SHIP_SPRITE.length * SCALE.life;
    const y = this.renderer.canvas.height - iconH - 4;
    for (let i = 0; i < this.ship.lives; i++) {
      this.renderer.drawSprite(SHIP_SPRITE, 8 + i * (iconW + 8), y, SCALE.life, COLORS.ship);
    }
  }

  private clearAlienBullets(): void {
    this.rockets.stack = this.rockets.stack.filter((r) => !r.aims.includes('ship'));
  }

  /** One iteration of the main loop. */
  frame(): void {
    if (!this.inited) this.init();

    if (this.started) {
      if (keys.esc) {
        if (this.escLatch) {
          if (this.paused) this.resume();
          else this.pause();
          this.escLatch = false;
        }
      } else {
        this.escLatch = true;
      }
    }

    if (this.started && !this.paused) {
      this.update();
      this.render();
    }
  }

  collides(a: Entity, b: Entity): boolean {
    return intersects(a, b);
  }

  private loadHiScore(): number {
    try {
      return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  private saveHiScore(): void {
    this.hiScore = Math.max(this.hiScore, this.score);
    this.hud.setHiScore(this.hiScore);
    try {
      localStorage.setItem(STORAGE_KEY, String(this.hiScore));
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }
}
