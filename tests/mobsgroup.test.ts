import { afterEach, describe, expect, it, vi } from 'vitest';
import { MobsGroup } from '../src/entities/MobsGroup';
import { MOBS_MAP } from '../src/config';
import { makeGame, makeRenderer } from './helpers';

const totalMobs = MOBS_MAP.flat().length;
const farShip = { x: 0, y: 99999, width: 26, height: 16, dying: false };

describe('MobsGroup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates the full formation', () => {
    const g = new MobsGroup();
    g.create(1, makeRenderer());
    expect(g.count).toBe(totalMobs);
    expect(g.mobsStack.length).toBe(MOBS_MAP.length);
  });

  it('removes dead mobs on update while continuing to march', () => {
    const g = new MobsGroup();
    const renderer = makeRenderer({ dt: 16 });
    g.create(1, renderer);
    for (const mob of g.mobsStack[0]) mob.active = false;
    g.update(makeGame({ renderer, mobsGroup: g, ship: farShip }));
    expect(g.count).toBe(totalMobs - MOBS_MAP[0].length);
  });

  it('ends the game when the swarm reaches the ship row', () => {
    const g = new MobsGroup();
    const renderer = makeRenderer({ dt: 16 });
    g.create(1, renderer);
    const gameOver = vi.fn();
    g.update(makeGame({ renderer, mobsGroup: g, ship: { ...farShip, y: 0 }, gameOver }));
    expect(gameOver).toHaveBeenCalled();
  });

  it('fires from a bottom mob once the fire timer elapses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const g = new MobsGroup();
    const renderer = makeRenderer({ dt: 5000 }); // huge dt elapses the timer
    g.create(1, renderer);
    const add = vi.fn();
    g.update(
      makeGame({
        renderer,
        mobsGroup: g,
        ship: farShip,
        rockets: { add, alienCount: () => 0 },
      }),
    );
    expect(add).toHaveBeenCalledTimes(1);
  });
});
