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

interface MenuButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: () => void;
}

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

  /** Canvas-drawn menu buttons, rebuilt each frame the menu is visible. */
  private menuButtons: MenuButton[] = [];
  private hoverIndex = -1;

  constructor(renderer: Renderer, hud: Hud) {
    this.renderer = renderer;
    this.hud = hud;
    this.hiScore = this.loadHiScore();
    initInput({
      onBlur: () => {
        if (this.started) this.pause();
      },
      onMute: () => {
        audio.toggleMute();
      },
    });
  }

  /** Wire up canvas pointer handling once, before the first frame. */
  init(): void {
    const canvas = this.renderer.canvas;
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('mousemove', (e) => this.onMove(e));
    this.inited = true;
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
  }

  resume(): void {
    this.paused = false;
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
  }

  update(): void {
    // While the ship is exploding, freeze the scene and run the timer.
    if (this.shipDeadTimer > 0) {
      this.shipDeadTimer -= this.renderer.dt;
      if (this.shipDeadTimer <= 0) {
        this.ship.lives--;
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

    if (this.score > this.hiScore) this.hiScore = this.score;
    if (!this.mobsGroup.mobsStack.length) this.start();
  }

  render(): void {
    const r = this.renderer;
    r.clear();
    if (this.ship) this.drawScene();

    const showMenu = !this.started || this.paused;
    if (showMenu) r.fillRect(0, 0, r.canvas.width, r.canvas.height, 'rgba(0, 0, 0, 0.66)');

    this.hud.draw(r, {
      fps: r.fps,
      score: this.score,
      hiScore: this.hiScore,
      level: this.level,
      muted: audio.muted,
    });

    this.menuButtons = [];
    if (showMenu) this.drawMenu();
  }

  private drawScene(): void {
    const r = this.renderer;
    for (const bunker of this.bunkers) bunker.draw(r);
    this.rockets.draw(r);
    this.ship.draw(r);
    this.mobsGroup.draw(r);
    this.ufo.draw(r);
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

  private drawMenu(): void {
    const r = this.renderer;
    const cw = r.canvas.width;
    const cy = r.canvas.height / 2;

    if (this.gameover) {
      r.drawText('GAME OVER', cw / 2, cy - 120, { size: 48, align: 'center', baseline: 'middle' });
      r.drawText(`SCORE ${this.score}    HI ${this.hiScore}`, cw / 2, cy - 74, {
        size: 20,
        align: 'center',
        baseline: 'middle',
        color: '#bbb',
        weight: 'normal',
      });
    } else if (!this.started) {
      r.drawText('SPACE INVADERS', cw / 2, cy - 120, {
        size: 44,
        align: 'center',
        baseline: 'middle',
        color: COLORS.ship,
      });
    } else {
      r.drawText('PAUSED', cw / 2, cy - 120, { size: 44, align: 'center', baseline: 'middle' });
    }

    const items: { label: string; action: () => void }[] = [];
    if (this.started && this.paused) items.push({ label: 'Resume', action: () => this.resume() });
    items.push({ label: this.gameover ? 'Restart' : 'New Game', action: () => this.newGame() });

    const bw = 260;
    const bh = 56;
    const gap = 18;
    const top = cy - 24;
    this.menuButtons = items.map((it, i) => ({
      x: (cw - bw) / 2,
      y: top + i * (bh + gap),
      w: bw,
      h: bh,
      label: it.label,
      action: it.action,
    }));

    this.menuButtons.forEach((b, i) => {
      r.fillRect(b.x, b.y, b.w, b.h, i === this.hoverIndex ? '#ff3b25' : '#cf0404');
      r.strokeRect(b.x, b.y, b.w, b.h, '#900', 2);
      r.drawText(b.label, b.x + b.w / 2, b.y + b.h / 2, {
        size: 24,
        align: 'center',
        baseline: 'middle',
        color: '#000',
      });
    });
  }

  /** Convert a pointer event to canvas-space coordinates (canvas is scaled by CSS). */
  private pointer(e: MouseEvent): { x: number; y: number } {
    const canvas = this.renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  private static inside(b: MenuButton, p: { x: number; y: number }): boolean {
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }

  private onClick(e: MouseEvent): void {
    const p = this.pointer(e);
    for (const b of this.menuButtons) {
      if (Game.inside(b, p)) {
        b.action();
        return;
      }
    }
  }

  private onMove(e: MouseEvent): void {
    const p = this.pointer(e);
    this.hoverIndex = this.menuButtons.findIndex((b) => Game.inside(b, p));
    this.renderer.canvas.style.cursor = this.hoverIndex >= 0 ? 'pointer' : 'default';
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

    if (this.started && !this.paused) this.update();
    this.render();
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
    try {
      localStorage.setItem(STORAGE_KEY, String(this.hiScore));
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }
}
