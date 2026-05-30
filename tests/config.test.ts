import { describe, expect, it } from 'vitest';
import {
  ALIEN_SPRITES,
  MOBS_MAP,
  SHIP_EXPLOSION_SPRITE,
  SHIP_SPRITE,
  UFO_SPRITE,
} from '../src/config';

const rectangular = (m: number[][]): boolean => m.length > 0 && m.every((row) => row.length === m[0].length);

describe('sprite matrices', () => {
  it('every alien type has two rectangular animation frames', () => {
    for (const type of [1, 2, 3]) {
      const frames = ALIEN_SPRITES[type];
      expect(frames).toHaveLength(2);
      for (const frame of frames) expect(rectangular(frame)).toBe(true);
    }
  });

  it('ship and ufo sprites are rectangular', () => {
    for (const m of [SHIP_SPRITE, SHIP_EXPLOSION_SPRITE, UFO_SPRITE]) {
      expect(rectangular(m)).toBe(true);
    }
  });

  it('MOBS_MAP is rectangular and only references known alien types', () => {
    expect(rectangular(MOBS_MAP)).toBe(true);
    for (const type of new Set(MOBS_MAP.flat())) expect([1, 2, 3]).toContain(type);
  });
});
