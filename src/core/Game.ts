import { COLORS, SHIP } from '../config';
import type { Entity } from '../types';
import { MobsGroup } from '../entities/MobsGroup';
import { RocketManager } from '../entities/Rocket';
import { Ship } from '../entities/Ship';
import { Ufo } from '../entities/Ufo';
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

  level = 0;
  score = 0;
  inited = false;
  started = false;
  paused = false;

  /** Debounces the Esc key so one press toggles pause exactly once. */
  private escLatch = true;

  private menu!: HTMLDivElement;
  private resumeBtn!: HTMLButtonElement;
  private newGameBtn!: HTMLButtonElement;

  constructor(renderer: Renderer, hud: Hud) {
    this.renderer = renderer;
    this.hud = hud;
    initInput(() => {
      if (this.started) this.pause();
    });
  }

  /** Build the menu overlay once, before the first game starts. */
  init(): void {
    this.menu = document.createElement('div');
    this.menu.classList.add('gameMenu');

    this.resumeBtn = document.createElement('button');
    this.resumeBtn.id = 'resumegame';
    this.resumeBtn.classList.add('game-btn', 'hide');
    this.resumeBtn.textContent = 'Resume';
    this.resumeBtn.addEventListener('click', () => {
      this.resume();
      this.resumeBtn.blur();
    });
    this.menu.appendChild(this.resumeBtn);

    this.newGameBtn = document.createElement('button');
    this.newGameBtn.id = 'newgame';
    this.newGameBtn.classList.add('game-btn');
    this.newGameBtn.textContent = 'New Game';
    this.newGameBtn.addEventListener('click', () => {
      this.newGame();
      this.newGameBtn.blur();
    });
    this.menu.appendChild(this.newGameBtn);

    this.renderer.canvas.parentElement?.appendChild(this.menu);
    this.renderer.setPaused(true);
    this.inited = true;
  }

  newGame(): void {
    this.level = 0;
    this.score = 0;
    this.rockets.reset();

    const { canvas } = this.renderer;
    this.ship = new Ship({
      color: COLORS.ship,
      width: SHIP.width,
      height: SHIP.height,
      x: (canvas.width - SHIP.width) / 2,
      y: canvas.height - SHIP.height,
      step: canvas.width * SHIP.stepFactor,
      lives: SHIP.lives,
    });
    this.mobsGroup = new MobsGroup();
    this.ufo = new Ufo();

    this.start();
    this.menu.classList.add('hide');
    this.renderer.setPaused(false);
    this.hud.setScore(this.score);
    this.hud.setLives(this.ship.lives);
  }

  start(): void {
    this.level++;
    this.hud.setLevel(this.level);
    this.rockets.reset();
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

  finish(): void {
    this.menu.classList.remove('hide');
    this.resumeBtn.classList.add('hide');
    this.started = false;
    this.renderer.setPaused(true);
  }

  update(): void {
    this.hud.setScore(this.score);
    this.ship.update(this);
    this.mobsGroup.update(this);
    this.ufo.update(this);
    this.rockets.update(this);

    if (!this.mobsGroup.mobsStack.length) this.start();
  }

  render(): void {
    this.renderer.clear();
    this.rockets.draw(this.renderer);
    this.ship.draw(this.renderer);
    this.mobsGroup.draw(this.renderer);
    this.ufo.draw(this.renderer);
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
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
