import { vi } from 'vitest';
import type { Game } from '../src/core/Game';
import type { Renderer } from '../src/core/Renderer';
import { intersects } from '../src/core/collision';
import { RocketManager } from '../src/entities/Rocket';

/** Minimal stand-in for the Renderer (no real canvas). */
export function makeRenderer(
  opts: { dt?: number; fps?: number; width?: number; height?: number } = {},
): Renderer {
  const { dt = 16, fps = 60, width = 800, height = 600 } = opts;
  return {
    canvas: { width, height },
    dt,
    fps,
    ctx: {},
    drawSprite: () => {},
    fillRect: () => {},
    clear: () => {},
    setPaused: () => {},
    tick: () => {},
  } as unknown as Renderer;
}

/** A fake Game exposing just the fields entities touch. Override per test. */
export function makeGame(over: Record<string, unknown> = {}): Game {
  const base = {
    renderer: makeRenderer(),
    bunkers: [],
    rockets: new RocketManager(),
    ship: { x: 0, y: 9999, width: 26, height: 16, dying: false },
    mobsGroup: { mobsStack: [] as unknown[] },
    ufo: { x: -100, y: 0, width: 48, height: 21 },
    score: 0,
    level: 1,
    collides: (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
      intersects(a, b),
    killShip: vi.fn(),
    gameOver: vi.fn(),
  };
  return { ...base, ...over } as unknown as Game;
}
