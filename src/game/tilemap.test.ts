import { describe, expect, it } from "vitest";
import { COLOR } from "../render/colors";
import { TILE } from "./config";
import { parseTileMap } from "./tilemap";

const task = { id: "t", name: "Do it", prompt: "Do it", duration: 1, points: 5 };

describe("parseTileMap", () => {
  it("sizes the level and finds the start", () => {
    const level = parseTileMap(["####", "#@.#", "####"], {});
    expect(level.size).toEqual({ width: 4 * TILE, height: 3 * TILE });
    expect(level.spawn).toEqual({ x: TILE, y: TILE });
  });

  it("makes a solid tile for every wall, and none for floor or the start", () => {
    const level = parseTileMap(["###", "#@#", "###"], {});
    expect(level.solids).toHaveLength(8);
    expect(level.solids[0]).toMatchObject({ x: 0, y: 0, w: TILE, h: TILE });
  });

  it("looks objects up in the legend: solid by default, walkable if said so", () => {
    const level = parseTileMap(["@TR"], { T: { color: "brick" }, R: { solid: false } });
    expect(level.solids).toHaveLength(1);
    expect(level.solids[0]).toMatchObject({ x: TILE, color: COLOR.brick });
  });

  it("makes one task zone around all the tiles of an object", () => {
    const level = parseTileMap(["@..", ".BB", ".BB"], { B: { task } });
    expect(level.interactables).toHaveLength(1);
    expect(level.interactables[0]).toMatchObject({
      id: "t",
      zone: { x: TILE, y: TILE, w: 2 * TILE, h: 2 * TILE },
    });
  });

  it("gives separate objects separate zones, and objects without a task none", () => {
    const level = parseTileMap(["@AB.C"], { A: { task }, B: { task: { ...task, id: "u" } }, C: {} });
    expect(level.interactables.map((i) => i.id)).toEqual(["t", "u"]);
  });

  it("uses palette colours only for placeholder drawing", () => {
    const level = parseTileMap(["@T#"], { T: { color: "leaf" } });
    expect(level.solids.map((s) => s.color)).toEqual([COLOR.leaf, COLOR.dusk]);
  });

  it("explains what is wrong with a bad map", () => {
    expect(() => parseTileMap([], {})).toThrow("empty");
    expect(() => parseTileMap(["@.", "..."], {})).toThrow("Row 1 is 3 tiles wide");
    expect(() => parseTileMap(["..", ".."], {})).toThrow("no start");
    expect(() => parseTileMap(["@@"], {})).toThrow("More than one start");
    expect(() => parseTileMap(["@X"], {})).toThrow('Unknown character "X" at row 0, col 1');
    expect(() => parseTileMap(["@A.A"], { A: {} })).toThrow('"A" are not all touching');
  });
});
