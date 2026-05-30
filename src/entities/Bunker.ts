import type { Renderer } from '../core/Renderer';
import type { Entity } from '../types';
import { BUNKER, COLORS, SCALE } from '../config';
import { intersects } from '../core/collision';

/** A destructible shield. Stored as a boolean cell grid that gets chipped
 *  away wherever a rocket (or a descending alien) makes contact. */
export class Bunker {
  readonly x: number;
  readonly y: number;
  readonly scale = SCALE.bunker;
  readonly width = BUNKER.cols * SCALE.bunker;
  readonly height = BUNKER.rows * SCALE.bunker;
  private readonly grid: boolean[][];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.grid = Bunker.buildShape();
  }

  /** Solid block with rounded top corners and a rounded-top doorway arch. */
  private static buildShape(): boolean[][] {
    const { cols, rows } = BUNKER;
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));

    const corner = 3;
    for (let r = 0; r < corner; r++) {
      for (let c = 0; c < corner - r; c++) {
        grid[r][c] = false;
        grid[r][cols - 1 - c] = false;
      }
    }

    const center = cols / 2;
    const archHalf = 3;
    const archHeight = Math.floor(rows * 0.55);
    for (let c = 0; c < cols; c++) {
      const dx = c + 0.5 - center;
      if (Math.abs(dx) > archHalf) continue;
      const up = Math.round(Math.sqrt(1 - (dx / archHalf) ** 2) * archHeight);
      for (let r = rows - up; r < rows; r++) grid[r][c] = false;
    }

    return grid;
  }

  collides(e: Entity): boolean {
    return intersects(e, this);
  }

  /** If a rocket touches solid material, erase a blast around the contact
   *  cell and report a hit (so the caller can deactivate the rocket). */
  absorb(rocket: Entity & { vy: number }): boolean {
    if (!this.collides(rocket)) return false;

    const c0 = clamp(Math.floor((rocket.x - this.x) / this.scale), 0, BUNKER.cols - 1);
    const c1 = clamp(Math.floor((rocket.x + rocket.width - 1 - this.x) / this.scale), 0, BUNKER.cols - 1);
    const r0 = clamp(Math.floor((rocket.y - this.y) / this.scale), 0, BUNKER.rows - 1);
    const r1 = clamp(Math.floor((rocket.y + rocket.height - 1 - this.y) / this.scale), 0, BUNKER.rows - 1);

    const rows = rocket.vy > 0 ? range(r0, r1) : range(r1, r0);
    for (const r of rows) {
      for (let c = c0; c <= c1; c++) {
        if (this.grid[r][c]) {
          this.blast(r, c);
          return true;
        }
      }
    }
    return false;
  }

  /** Erode any solid cells overlapping the given box (alien contact). */
  erode(e: Entity): void {
    if (!this.collides(e)) return;
    const c0 = Math.max(0, Math.floor((e.x - this.x) / this.scale));
    const c1 = Math.min(BUNKER.cols - 1, Math.floor((e.x + e.width - 1 - this.x) / this.scale));
    const r0 = Math.max(0, Math.floor((e.y - this.y) / this.scale));
    const r1 = Math.min(BUNKER.rows - 1, Math.floor((e.y + e.height - 1 - this.y) / this.scale));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) this.grid[r][c] = false;
    }
  }

  private blast(row: number, col: number): void {
    const b = BUNKER.blast;
    for (let dr = -b; dr <= b; dr++) {
      for (let dc = -b; dc <= b; dc++) {
        if (dr * dr + dc * dc > b * b + 1) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < BUNKER.rows && c >= 0 && c < BUNKER.cols) this.grid[r][c] = false;
      }
    }
  }

  draw(renderer: Renderer): void {
    for (let r = 0; r < BUNKER.rows; r++) {
      for (let c = 0; c < BUNKER.cols; c++) {
        if (this.grid[r][c]) {
          renderer.fillRect(this.x + c * this.scale, this.y + r * this.scale, this.scale, this.scale, COLORS.bunker);
        }
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Inclusive integer range that counts up or down depending on the bounds. */
function range(from: number, to: number): number[] {
  const out: number[] = [];
  const step = from <= to ? 1 : -1;
  for (let i = from; step > 0 ? i <= to : i >= to; i += step) out.push(i);
  return out;
}
