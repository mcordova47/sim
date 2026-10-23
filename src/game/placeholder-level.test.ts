import { describe, expect, it } from "vitest";
import { GLYPHS } from "../render/font";
import { DELTA, DIRECTIONS } from "./direction";
import { TILE } from "./config";
import { Grid } from "./grid";
import { PLACEHOLDER_LEVEL as level } from "./placeholder-level";
import { overlaps } from "./world";

// The same checks the real floor plan (issue 020) will need: the player starts
// somewhere open, and every task can be used from somewhere you can walk to.

describe("the placeholder level", () => {
  const grid = new Grid(level.size, level.solids);
  const start = { col: level.spawn.x / TILE, row: level.spawn.y / TILE };

  // Every tile reachable on foot from the start.
  function reachable() {
    const seen = new Set<string>([`${start.col},${start.row}`]);
    const queue = [start];
    while (queue.length) {
      const { col, row } = queue.pop()!;
      for (const d of DIRECTIONS) {
        const next = { col: col + DELTA[d].dc, row: row + DELTA[d].dr };
        const key = `${next.col},${next.row}`;
        if (!grid.isBlocked(next.col, next.row) && !seen.has(key)) {
          seen.add(key);
          queue.push(next);
        }
      }
    }
    return seen;
  }

  it("starts the player on an open tile", () => {
    expect(grid.isBlocked(start.col, start.row)).toBe(false);
  });

  it("has a task you can reach and face: some walkable tile sits next to every task zone", () => {
    const walkable = reachable();
    for (const item of level.interactables) {
      const usable = [...walkable].some((key) => {
        const [col, row] = key.split(",").map(Number);
        return DIRECTIONS.some((d) =>
          overlaps(
            { x: (col + DELTA[d].dc) * TILE, y: (row + DELTA[d].dr) * TILE, w: TILE, h: TILE },
            item.zone,
          ),
        );
      });
      expect(usable, item.id).toBe(true);
    }
  });

  it("only uses characters the pixel font can draw", () => {
    for (const item of level.interactables) {
      for (const text of [item.name, item.prompt, item.flavor ?? ""]) {
        for (const ch of text.toUpperCase()) {
          if (ch !== " ") expect(GLYPHS[ch], `${item.id}: "${ch}"`).toBeDefined();
        }
      }
    }
  });
});
