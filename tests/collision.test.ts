import { describe, expect, it } from 'vitest';
import { intersects } from '../src/core/collision';

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe('intersects', () => {
  it('detects overlapping boxes', () => {
    expect(intersects(box(0, 0, 10, 10), box(5, 5, 10, 10))).toBe(true);
  });

  it('returns false when separated horizontally', () => {
    expect(intersects(box(0, 0, 10, 10), box(20, 0, 10, 10))).toBe(false);
  });

  it('returns false when separated vertically', () => {
    expect(intersects(box(0, 0, 10, 10), box(0, 20, 10, 10))).toBe(false);
  });

  it('treats merely touching edges as no overlap', () => {
    expect(intersects(box(0, 0, 10, 10), box(10, 0, 10, 10))).toBe(false);
  });
});
