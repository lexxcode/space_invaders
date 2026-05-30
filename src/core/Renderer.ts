import { CANVAS, COLORS } from '../config';

/** Owns the canvas, its 2D context, frame timing and the FPS counter. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Milliseconds elapsed since the previous frame. */
  dt = 0;
  fps = 0;

  private frames = 10;
  private prevTick = performance.now();
  private diffStack = 0;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS.width;
    this.canvas.height = CANVAS.height;
    this.canvas.classList.add('cnvs');

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context is not available');
    this.ctx = ctx;

    parent.appendChild(this.canvas);
  }

  /** Advance timing once per frame; recomputes FPS every 10 frames. */
  tick(): void {
    this.frames--;
    const now = performance.now();
    this.dt = now - this.prevTick;

    if (this.frames === 0) {
      this.diffStack += this.dt;
      this.fps = Math.round(1000 / (this.diffStack / 10));
      this.frames = 10;
      this.diffStack = 0;
    } else {
      this.diffStack += this.dt;
    }

    this.prevTick = now;
  }

  clear(): void {
    this.fillRect(0, 0, this.canvas.width, this.canvas.height, COLORS.background);
  }

  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  setPaused(paused: boolean): void {
    this.canvas.classList.toggle('cnvs_pause', paused);
  }
}
