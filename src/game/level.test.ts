import { describe, expect, it } from "vitest";
import { TILE } from "./config";
import { validateLevel, type Level } from "./level";

const level: Level = {
  id: "r",
  size: { width: 4 * TILE, height: 3 * TILE },
  solids: [{ x: 0, y: 0, w: TILE, h: TILE }],
  interactables: [],
  doors: [],
  pieces: [],
  spawn: { x: TILE, y: TILE },
};

describe("validateLevel", () => {
  it("accepts a playable level", () => {
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("rejects a size that is not whole tiles", () => {
    expect(() => validateLevel({ ...level, size: { width: 70, height: 48 } })).toThrow("whole number");
    expect(() => validateLevel({ ...level, size: { width: 0, height: 48 } })).toThrow("whole number");
  });

  it("rejects a start in a wall, off the map or off the tile grid", () => {
    expect(() => validateLevel({ ...level, spawn: { x: 0, y: 0 } })).toThrow("not open floor");
    expect(() => validateLevel({ ...level, spawn: { x: 9 * TILE, y: 0 } })).toThrow("not open floor");
    expect(() => validateLevel({ ...level, spawn: { x: 5, y: TILE } })).toThrow("not on a tile");
  });

  it("rejects a door on a blocked tile", () => {
    const door = { col: 0, row: 0, to: "x", arrive: { col: 1, row: 1, facing: "down" as const } };
    expect(() => validateLevel({ ...level, doors: [door] })).toThrow("door");
  });
});
