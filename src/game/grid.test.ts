import { describe, expect, it } from "vitest";
import { TILE } from "./config";
import { Grid } from "./grid";

const size = { width: 5 * TILE, height: 4 * TILE };

describe("Grid", () => {
  it("works out its size in tiles", () => {
    const g = new Grid(size, []);
    expect([g.cols, g.rows]).toEqual([5, 4]);
  });

  it("is blocked where a solid overlaps a tile, and open elsewhere", () => {
    const g = new Grid(size, [{ x: 2 * TILE, y: TILE, w: TILE, h: TILE }]);
    expect(g.isBlocked(2, 1)).toBe(true);
    expect(g.isBlocked(1, 1)).toBe(false);
    expect(g.isBlocked(3, 1)).toBe(false);
    expect(g.isBlocked(2, 0)).toBe(false);
    expect(g.isBlocked(2, 2)).toBe(false);
  });

  it("blocks a tile that a solid only partly covers", () => {
    const g = new Grid(size, [{ x: 2 * TILE + 12, y: TILE + 12, w: 8, h: 8 }]);
    expect(g.isBlocked(2, 1)).toBe(true);
    expect(g.isBlocked(3, 2)).toBe(true);
  });

  it("blocks a multi-tile solid across every tile it covers, and no more", () => {
    const g = new Grid(size, [{ x: TILE, y: TILE, w: 2 * TILE, h: 2 * TILE }]);
    for (const [c, r] of [[1, 1], [2, 1], [1, 2], [2, 2]]) expect(g.isBlocked(c, r)).toBe(true);
    for (const [c, r] of [[0, 1], [3, 1], [1, 0], [1, 3]]) expect(g.isBlocked(c, r)).toBe(false);
  });

  it("treats everything outside the room as blocked", () => {
    const g = new Grid(size, []);
    for (const [c, r] of [[-1, 0], [0, -1], [5, 0], [0, 4], [99, 99]]) {
      expect(g.isBlocked(c, r)).toBe(true);
    }
  });

  it("gives the rectangle of a tile", () => {
    expect(new Grid(size, []).tileRect(2, 3)).toEqual({ x: 2 * TILE, y: 3 * TILE, w: TILE, h: TILE });
  });
});
