import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ufo } from '../src/entities/Ufo';
import { UFO } from '../src/config';
import { makeGame, makeRenderer } from './helpers';

describe('Ufo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('awards a mystery bonus from the configured set and parks off-screen', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // selects scores[0]
    const u = new Ufo();
    u.vx = 1; // moving right -> exits at the right edge
    const game = makeGame({ ufo: u, renderer: makeRenderer({ width: 800 }) });
    u.explode(game);
    expect(game.score).toBe(UFO.scores[0]);
    expect(u.x).toBe(800);
  });

  it('starts drifting when its spawn chance triggers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // 0 < chance/fps -> always spawns
    const u = new Ufo();
    expect(u.vx).toBe(0);
    u.update(makeGame({ ufo: u, renderer: makeRenderer({ fps: 60, dt: 16 }) }));
    expect(u.vx).not.toBe(0);
  });
});
