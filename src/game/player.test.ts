import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { TILE, WALK } from "./config";
import type { Direction } from "./direction";
import { Grid } from "./grid";
import { Player } from "./player";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const hold = (dir: Direction | null): Controls => ({ ...NO_INPUT, dir });

// A room with the player at @ (column 3, row 2) and open floor around it.
const map = parseTileMap(
  ["#######", "#.....#", "#..@..#", "#.....#", "#######"],
  {},
);
const grid = new Grid(map.size, map.solids);

function player(facing: Direction = "down"): Player {
  return new Player(map.spawn.x, map.spawn.y, facing);
}

function run(p: Player, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) p.update(dt, controls, grid);
}

describe("Player", () => {
  it("starts on a tile, facing the given direction", () => {
    const p = player("left");
    expect([p.col, p.row, p.x, p.y, p.facing]).toEqual([3, 2, 3 * TILE, 2 * TILE, "left"]);
    expect(p.stepping).toBe(false);
  });

  it("faces the tile in front of it, and nothing while stepping", () => {
    const p = player("right");
    expect(p.target).toEqual({ x: 4 * TILE, y: 2 * TILE, w: TILE, h: TILE });
    for (const [dir, x, y] of [
      ["up", 3, 1],
      ["down", 3, 3],
      ["left", 2, 2],
    ] as const) {
      const q = player(dir);
      expect(q.target).toEqual({ x: x * TILE, y: y * TILE, w: TILE, h: TILE });
    }
    p.update(dt, hold("right"), grid);
    expect(p.stepping).toBe(true);
    expect(p.target).toBeNull();
  });

  it("steps right away when holding the direction it already faces", () => {
    const p = player("down");
    p.update(dt, hold("down"), grid);
    expect(p.stepping).toBe(true);
  });

  it("slides smoothly from one tile to the next and lands exactly on the tile", () => {
    const p = player("down");
    run(p, WALK.stepTime / 2, hold("down"));
    expect(p.x).toBe(3 * TILE);
    expect(p.y).toBeGreaterThan(2 * TILE);
    expect(p.y).toBeLessThan(3 * TILE);
    run(p, WALK.stepTime / 2 + dt, NO_INPUT);
    expect([p.col, p.row, p.y]).toEqual([3, 3, 3 * TILE]);
    expect(p.stepping).toBe(false);
  });

  it("turns before stepping, and a quick tap only turns", () => {
    const p = player("down");
    run(p, WALK.turnTime / 2, hold("right"));
    expect(p.facing).toBe("right");
    expect(p.stepping).toBe(false);
    run(p, 0.5, NO_INPUT); // let go
    expect([p.col, p.row]).toEqual([3, 2]);
    expect(p.facing).toBe("right");
  });

  it("steps after the turn if the direction is still held", () => {
    const p = player("down");
    run(p, WALK.turnTime + dt * 2, hold("right"));
    expect(p.facing).toBe("right");
    expect(p.stepping).toBe(true);
  });

  it("keeps stepping with no gap while the key is held", () => {
    const wide = parseTileMap(["###########", "#.@.......#", "###########"], {});
    const g = new Grid(wide.size, wide.solids);
    const p = new Player(wide.spawn.x, wide.spawn.y, "right");
    // Three whole steps and a hair of slack. A one-frame pause between steps
    // would add 1/60 s each, enough to fall a step short.
    for (let i = 0; i < Math.round((WALK.stepTime * 3 + 0.01) / dt); i++) {
      p.update(dt, hold("right"), g);
    }
    expect([p.col, p.row]).toEqual([5, 1]);
  });

  it("changes direction at the next tile, with a turn", () => {
    const p = player("right");
    run(p, WALK.stepTime / 2, hold("right"));
    run(p, WALK.stepTime / 2 + 0.005, hold("up")); // arrives, then turns up
    expect(p.col).toBe(4);
    expect(p.facing).toBe("up");
    run(p, WALK.turnTime + WALK.stepTime + 0.02, hold("up"));
    expect([p.col, p.row]).toEqual([4, 1]);
  });

  it("never moves diagonally: one of x and y is always on a tile line", () => {
    const p = player("right");
    const turn = (dir: Direction) => run(p, WALK.stepTime * 1.5, hold(dir));
    for (const dir of ["right", "down", "left", "up", "right"] as const) {
      for (let i = 0; i < Math.round((WALK.stepTime * 1.5) / dt); i++) {
        p.update(dt, hold(dir), grid);
        expect(p.x % TILE === 0 || p.y % TILE === 0).toBe(true);
      }
    }
    void turn;
  });

  it("is stopped by walls and the map edge, and reports a bump once", () => {
    const p = player("left");
    const bumps: unknown[] = [];
    for (let i = 0; i < 60 * 3; i++) {
      p.update(dt, hold("left"), grid);
      if (p.bumpedThisUpdate) bumps.push(p.bumpedThisUpdate);
    }
    expect(p.col).toBe(1); // the wall is at column 0
    expect(bumps).toEqual([{ col: 0, row: 2, direction: "left" }]);
  });

  it("reports a bump again after letting go, or after turning away and back", () => {
    const p = player("left");
    const count = () => {
      let n = 0;
      return {
        step(controls: Controls) {
          p.update(dt, controls, grid);
          if (p.bumpedThisUpdate) n++;
        },
        get n() {
          return n;
        },
      };
    };
    const c = count();
    for (let i = 0; i < 60; i++) c.step(hold("left"));
    expect(c.n).toBe(1);
    c.step(NO_INPUT);
    for (let i = 0; i < 20; i++) c.step(hold("left"));
    expect(c.n).toBe(2);
  });

  it("reports an arrival once per tile, and nothing on other updates", () => {
    const p = player("right");
    const arrivals: number[] = [];
    for (let i = 0; i < 60; i++) {
      p.update(dt, hold("right"), grid);
      if (p.arrivedThisUpdate) arrivals.push(p.arrivedThisUpdate.col);
    }
    expect(arrivals).toEqual([4, 5]); // then the wall
    p.update(dt, NO_INPUT, grid);
    expect(p.arrivedThisUpdate).toBeNull();
  });

  it("copes with a long update that covers several steps", () => {
    const p = player("right");
    p.update(WALK.stepTime * 1.5 + 0.001, hold("right"), grid);
    expect(p.col).toBe(4);
    expect(p.stepping).toBe(true);
    expect(p.arrivedThisUpdate).toMatchObject({ col: 4 });
    p.update(1, hold("right"), grid);
    expect(p.col).toBe(5); // then the wall at column 6
  });

  it("does nothing for an update of zero time", () => {
    const p = player("right");
    expect(() => p.update(0, hold("right"), grid)).not.toThrow();
    expect([p.col, p.row, p.stepping]).toEqual([3, 2, false]);
  });

  it("keeps the position it had at the start of an update, for interpolation", () => {
    const p = player("right");
    run(p, 0.05, hold("right"));
    const before = p.x;
    p.update(dt, hold("right"), grid);
    expect(p.prevX).toBe(before);
    expect(p.x).toBeGreaterThan(before);
  });

  it("can't walk through a solid piece of furniture", () => {
    const withTable = parseTileMap(["#####", "#.@T#", "#####"], { T: { color: "oak" as never } });
    const g = new Grid(withTable.size, withTable.solids);
    const p = new Player(withTable.spawn.x, withTable.spawn.y, "right");
    for (let i = 0; i < 60; i++) p.update(dt, hold("right"), g);
    expect(p.col).toBe(2);
  });
});
