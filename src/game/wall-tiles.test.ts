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
  it("treats the robin print as a wall piece (back wall under it) and the mic stand, guitar and radiator as open floor (issue 044)", () => {
    expect(MAIN_MAP[0][5]).toBe("k");
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 5, 0)).toBe("back");
    // The wall tiles beside the guitar and the radiator keep their side walls.
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 0, 5)).toBe("left");
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 0, 6)).toBe("left");
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 18, 1)).toBe("right");
    expect(wallKind(MAIN_MAP, WALL_PIECES.main, 18, 4)).toBe("right");
    // Furniture is never a wall tile.
    for (const [c, r] of [[5, 1], [5, 2], [1, 5], [17, 1], [17, 4]]) {
      expect(wallKind(MAIN_MAP, WALL_PIECES.main, c, r), `${c},${r}`).toBeFalsy();
    }
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
    expect(wallTileName("back", "main")).toBe("wall-back");
    expect(wallTileName("back", "bath")).toBe("wall-back-bath");
    expect(wallTileName("front", "kitchen")).toBe("wall-front-kitchen");
    expect(wallTileName("front", "main")).toBe("wall-front");
    expect(wallTileName("left", "main")).toBe("wall-side-left");
    expect(wallTileName("right", "kitchen")).toBe("wall-side-right-kitchen");
    expect(wallTileName("left", "bath")).toBe("wall-side-left-bath");
  });
});
