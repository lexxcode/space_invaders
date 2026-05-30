import { describe, expect, it, vi } from 'vitest';
import { Rocket, RocketManager } from '../src/entities/Rocket';
import { Mob } from '../src/entities/Mob';
import { Bunker } from '../src/entities/Bunker';
import { SCALE } from '../src/config';
import { makeGame, makeRenderer } from './helpers';

describe('RocketManager', () => {
  it('adds rockets, counts alien bullets and resets', () => {
    const m = new RocketManager();
    m.add(new Rocket({ x: 0, y: 0, aims: ['ship'] }));
    m.add(new Rocket({ x: 0, y: 0, aims: ['mob', 'ufo'] }));
    expect(m.stack).toHaveLength(2);
    expect(m.alienCount()).toBe(1);
    m.reset();
    expect(m.stack).toHaveLength(0);
  });

  it('drops rockets that leave the scene and fires their onComplete', () => {
    const onComplete = vi.fn();
    const m = new RocketManager();
    m.add(new Rocket({ x: 10, y: 0, vy: -10000, aims: ['mob'], onComplete }));
    m.update(makeGame({ rockets: m }));
    expect(m.stack).toHaveLength(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('Rocket.update', () => {
  it('destroys an overlapping mob and awards points by type', () => {
    const mob = new Mob({ x: 100, y: 100, width: 24, height: 16, type: 2 });
    const game = makeGame({
      renderer: makeRenderer({ dt: 0 }),
      mobsGroup: { mobsStack: [[mob]] },
    });
    const r = new Rocket({ x: 100, y: 100, width: 4, height: 8, aims: ['mob'] });
    r.update(game);
    expect(mob.active).toBe(false);
    expect(game.score).toBe(20); // SCORE.mob (10) * type 2
    expect(r.active).toBe(false);
  });

  it('is absorbed by a bunker regardless of its target', () => {
    const game = makeGame({ renderer: makeRenderer({ dt: 0 }) });
    const bunker = new Bunker(50, 50);
    game.bunkers = [bunker];
    const r = new Rocket({
      x: 50 + Math.floor(14 / 2) * SCALE.bunker,
      y: 50,
      width: 3,
      height: SCALE.bunker,
      vy: 100,
      aims: ['ship'],
    });
    r.update(game);
    expect(r.active).toBe(false);
  });

  it('triggers killShip when an alien bullet hits the ship', () => {
    const killShip = vi.fn();
    const game = makeGame({
      renderer: makeRenderer({ dt: 0 }),
      ship: { x: 100, y: 100, width: 26, height: 16, dying: false },
      killShip,
    });
    const r = new Rocket({ x: 100, y: 100, width: 3, height: 14, aims: ['ship'] });
    r.update(game);
    expect(killShip).toHaveBeenCalledTimes(1);
    expect(r.active).toBe(false);
  });
});
