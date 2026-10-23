import { TILE } from "./config";
import type { Rect } from "./world";

// The room as a grid of tiles, each walkable or not. Built from the level's
// solid rectangles: a tile is blocked if any solid overlaps it. Anything
// outside the room is blocked too.
export class Grid {
  readonly cols: number;
  readonly rows: number;
  private readonly blocked: boolean[];

  constructor(size: { width: number; height: number }, solids: Rect[]) {
    this.cols = Math.ceil(size.width / TILE);
    this.rows = Math.ceil(size.height / TILE);
    this.blocked = new Array<boolean>(this.cols * this.rows).fill(false);
    // Mark the tiles each solid touches, so a big room costs one pass.
    for (const s of solids) {
      if (!(s.w > 0 && s.h > 0)) continue;
      const col0 = Math.max(0, Math.floor(s.x / TILE));
      const col1 = Math.min(this.cols - 1, Math.ceil((s.x + s.w) / TILE) - 1);
      const row0 = Math.max(0, Math.floor(s.y / TILE));
      const row1 = Math.min(this.rows - 1, Math.ceil((s.y + s.h) / TILE) - 1);
      for (let row = row0; row <= row1; row++) {
        for (let col = col0; col <= col1; col++) this.blocked[row * this.cols + col] = true;
      }
    }
  }

  isBlocked(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return true;
    return this.blocked[row * this.cols + col];
  }

  tileRect(col: number, row: number): Rect {
    return { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
  }
}
