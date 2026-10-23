import { TILE } from "./config";
import { overlaps, type Rect } from "./world";

// The room as a grid of tiles, each walkable or not. Built from the level's
// solid rectangles: a tile is blocked if any solid overlaps it. Anything
// outside the room is blocked too.
export class Grid {
  readonly cols: number;
  readonly rows: number;
  private blocked: boolean[] = [];

  constructor(size: { width: number; height: number }, solids: Rect[]) {
    this.cols = Math.ceil(size.width / TILE);
    this.rows = Math.ceil(size.height / TILE);
    this.setSolids(solids);
  }

  // Replaces what blocks the grid, for solids that come and go with state.
  setSolids(solids: Rect[]): void {
    this.blocked = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.tileRect(col, row);
        this.blocked.push(solids.some((s) => overlaps(tile, s)));
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
