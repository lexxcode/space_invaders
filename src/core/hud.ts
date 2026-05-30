/** Caches HUD DOM nodes and only touches the DOM when a value changes. */
export class Hud {
  private readonly fpsEl: HTMLElement;
  private readonly levelEl: HTMLElement;
  private readonly scoreEl: HTMLElement;
  private readonly livesEl: HTMLElement;

  private fps = -1;
  private level = -1;
  private score = -1;
  private lives = -1;

  constructor() {
    this.fpsEl = Hud.require('.fps');
    this.levelEl = Hud.require('.level');
    this.scoreEl = Hud.require('.score');
    this.livesEl = Hud.require('.lives');
  }

  private static require(selector: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`HUD element "${selector}" not found`);
    return el;
  }

  setFps(value: number): void {
    if (value === this.fps) return;
    this.fps = value;
    this.fpsEl.textContent = String(value);
  }

  setLevel(value: number): void {
    if (value === this.level) return;
    this.level = value;
    this.levelEl.textContent = String(value);
  }

  setScore(value: number): void {
    if (value === this.score) return;
    this.score = value;
    this.scoreEl.textContent = String(value);
  }

  setLives(value: number): void {
    if (value === this.lives) return;
    this.lives = value;
    this.livesEl.textContent = String(value);
  }
}
