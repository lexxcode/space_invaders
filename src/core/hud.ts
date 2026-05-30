import type { Renderer } from './Renderer';

export interface HudData {
  fps: number;
  score: number;
  hiScore: number;
  level: number;
  muted: boolean;
}

/** Heads-up display drawn directly onto the canvas. */
export class Hud {
  draw(r: Renderer, d: HudData): void {
    const w = r.canvas.width;
    const h = r.canvas.height;

    // Top row: score / hi-score / level.
    r.drawText(`SCORE ${d.score}`, 16, 6, { size: 16, align: 'left', baseline: 'top' });
    r.drawText(`HI ${d.hiScore}`, w / 2, 6, { size: 16, align: 'center', baseline: 'top', color: '#ffe14d' });
    r.drawText(`LEVEL ${d.level}`, w - 16, 6, { size: 16, align: 'right', baseline: 'top' });

    // Bottom-right: diagnostics and sound state.
    r.drawText(`SOUND ${d.muted ? 'OFF' : 'ON'} (M)   FPS ${d.fps}`, w - 16, h - 16, {
      size: 11,
      align: 'right',
      baseline: 'top',
      color: '#7c7c7c',
      weight: 'normal',
    });
  }
}
