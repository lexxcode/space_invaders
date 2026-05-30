import { describe, expect, it } from 'vitest';
import { Bunker } from '../src/entities/Bunker';
import { BUNKER, SCALE } from '../src/config';

const scale = SCALE.bunker;
const W = BUNKER.cols * scale;
const H = BUNKER.rows * scale;
const centerCol = Math.floor(BUNKER.cols / 2);

const rocket = (x: number, y: number, width: number, height: number, vy = 300) => ({
  x,
  y,
  width,
  height,
  vy,
});

describe('Bunker', () => {
  it('derives its dimensions from the cell grid', () => {
    const b = new Bunker(100, 200);
    expect(b.width).toBe(W);
    expect(b.height).toBe(H);
  });

  it('collides only when the boxes overlap', () => {
    const b = new Bunker(100, 200);
    expect(b.collides({ x: 100, y: 200, width: 4, height: 4 })).toBe(true);
    expect(b.collides({ x: 100 + W + 5, y: 200, width: 4, height: 4 })).toBe(false);
  });

  it('absorbs a rocket hitting solid material, then leaves a hole there', () => {
    const b = new Bunker(0, 0);
    const topCenter = () => rocket(centerCol * scale, 0, 3, scale);
    expect(b.absorb(topCenter())).toBe(true);
    // the same spot is now eroded away
    expect(b.absorb(topCenter())).toBe(false);
  });

  it('ignores a rocket that misses the bunker entirely', () => {
    const b = new Bunker(0, 0);
    expect(b.absorb(rocket(W + 50, 0, 3, 14))).toBe(false);
  });

  it('lets a rocket pass through the doorway opening', () => {
    const b = new Bunker(0, 0);
    const bottomY = (BUNKER.rows - 1) * scale;
    expect(b.absorb(rocket(centerCol * scale, bottomY, 2, scale))).toBe(false);
  });

  it('erodes cells overlapping a box (e.g. a descending alien)', () => {
    const b = new Bunker(0, 0);
    b.erode({ x: 0, y: 0, width: W, height: scale * 2 });
    expect(b.absorb(rocket(centerCol * scale, 0, 3, scale))).toBe(false);
  });
});
