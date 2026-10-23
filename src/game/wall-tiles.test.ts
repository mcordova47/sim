import { describe, expect, it } from "vitest";
import { BATH_MAP, KITCHEN_MAP, MAIN_MAP, WALL_PIECES } from "./apartment";
import { wallKind, wallTileName } from "./wall-tiles";

// One character per tile: b back, f front, l left, r right, x a wall tile with
// nothing drawn (corner or filler), . not a wall tile.
const LETTER = { back: "b", front: "f", left: "l", right: "r" } as const;
function picture(map: readonly string[], room: string): string[] {
  return map.map((line, row) =>
    [...line]
      .map((ch, col) => {
        const kind = wallKind(map, WALL_PIECES[room], col, row);
        if (kind) return LETTER[kind];
        return ch === "#" ? "x" : ".";
      })
      .join(""),
  );
}

describe("wall tiles", () => {
  it("classifies every wall tile in the main room", () => {
    expect(picture(MAIN_MAP, "main")).toEqual([
      "xbbbbbbbbbbbbbbbbbx",
      "l.................r",
      "l.................r",
      "l.................r",
      "l.................r",
      "l.................r",
      "l.................r",
      "xfffffff..........r",
      "xxxxxxxxff........r",
      "xxxxxxxxxxffffffffx",
    ]);
  });
  it("classifies every wall tile in the kitchen", () => {
    expect(picture(KITCHEN_MAP, "kitchen")).toEqual([
      "xbbbbbbbbbbbx",
      "l...........r",
      "l...........r",
      "l...........r",
      "l...........r",
      "xfffffff....r",
      "xxxxxxxl....r",
      "xxxxxxxl....r",
      "xxxxxxxl....r",
      "xxxxxxxxffffx",
    ]);
  });
  it("classifies every wall tile in the bath", () => {
    expect(picture(BATH_MAP, "bath")).toEqual([
      "xbbbbbbbx",
      "l.......r",
      "l.......r",
      "l.......r",
      "l.......r",
      "xfffffffx",
    ]);
  });
  it("gives side walls beside doors and windows the side tile, not the back wall", () => {
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 0, 2)).toBe("left"); // beside door 1
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 18, 2)).toBe("right");
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 18, 5)).toBe("right");
    expect(wallKind(KITCHEN_MAP, WALL_PIECES.kitchen, 12, 2)).toBe("right");
    expect(wallKind(KITCHEN_MAP, WALL_PIECES.kitchen, 7, 6)).toBe("left");
    expect(wallKind(BATH_MAP, WALL_PIECES.bath, 8, 2)).toBe("right");
  });
  it("draws the wall-front under the hood and either side of it", () => {
    for (const col of [3, 4, 5, 6, 7]) expect(wallKind(KITCHEN_MAP, WALL_PIECES.kitchen, col, 5)).toBe("front");
  });
  it("names the tiles per room", () => {
    expect(wallTileName("back", "bath")).toBe("wall-back");
    expect(wallTileName("left", "main")).toBe("wall-side-left");
    expect(wallTileName("right", "kitchen")).toBe("wall-side-right-kitchen");
    expect(wallTileName("left", "bath")).toBe("wall-side-left-bath");
  });
});
