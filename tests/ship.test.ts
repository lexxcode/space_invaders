import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ship } from '../src/entities/Ship';
import { keys } from '../src/core/input';
import { makeGame, makeRenderer } from './helpers';

afterEach(() => {
  keys.left = keys.right = keys.space = keys.esc = false;
});

describe('Ship', () => {
  it('reset re-centers the ship and clears its state', () => {
    const r = makeRenderer({ width: 800, height: 600 });
    const s = new Ship();
    s.dying = true;
    s.rocketCount = 1;
    s.reset(r);
    expect(s.dying).toBe(false);
    expect(s.rocketCount).toBe(0);
    expect(s.x).toBe((800 - s.width) / 2);
  });

  it('shoots up to maxRocketStack and no further', () => {
    const add = vi.fn();
    const s = new Ship({ maxRocketStack: 1 });
    const game = makeGame({ ship: s, rockets: { add, alienCount: () => 0 } });
    s.shoot(game);
    s.shoot(game);
    expect(add).toHaveBeenCalledTimes(1);
    expect(s.rocketCount).toBe(1);
  });

  it('moves left when the key is held, clamped to the field', () => {
    const r = makeRenderer({ dt: 1000, width: 800, height: 600 });
    const s = new Ship({ step: 100 });
    s.reset(r);
    const startX = s.x;
    keys.left = true;
    s.update(makeGame({ ship: s, renderer: r }));
    expect(s.x).toBeLessThan(startX);
    expect(s.x).toBeGreaterThanOrEqual(0);
  });

  it('neither moves nor shoots while dying', () => {
    const r = makeRenderer({ dt: 1000 });
    const add = vi.fn();
    const s = new Ship({ step: 100 });
    s.reset(r);
    s.dying = true;
    const frozenX = s.x;
    keys.left = true;
    keys.space = true;
    s.update(makeGame({ ship: s, renderer: r, rockets: { add, alienCount: () => 0 } }));
    expect(s.x).toBe(frozenX);
    expect(add).not.toHaveBeenCalled();
  });
});
