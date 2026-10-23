import { describe, expect, it } from "vitest";
import { COLOR } from "../render/colors";
import { TILE } from "./config";
import { parseTileMap } from "./tilemap";

const task = { id: "t", name: "Do it", prompt: "Do it", duration: 1, points: 5 };
const tasks = [task, { ...task, id: "u" }];
const tile = (col: number, row: number) => ({ x: col * TILE, y: row * TILE, w: TILE, h: TILE });

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

  it("gives an object one zone per tile, in all the tasks it offers", () => {
    const level = parseTileMap(["@..", ".BB", ".BB"], { B: { tasks: ["t", "u"] } }, { tasks });
    expect(level.interactables.map((i) => i.id)).toEqual(["t", "u"]);
    for (const item of level.interactables) {
      expect(item.zones).toEqual([tile(1, 1), tile(2, 1), tile(1, 2), tile(2, 2)]);
    }
  });

  it("makes an L-shaped object's zones exactly its tiles, not the box around them", () => {
    const level = parseTileMap(["@...", ".L..", ".LL.", "...."], { L: { tasks: ["t"] } }, { tasks });
    expect(level.interactables[0].zones).toEqual([tile(1, 1), tile(1, 2), tile(2, 2)]);
    // The empty corner of the L's bounding box is not part of it.
    expect(level.interactables[0].zones).not.toContainEqual(tile(2, 1));
    expect(level.pieces[0].bounds).toEqual({ x: TILE, y: TILE, w: 2 * TILE, h: 2 * TILE });
    expect(level.pieces[0].tiles).toHaveLength(3);
  });

  it("gives separate objects separate zones, and objects without a task none", () => {
    const level = parseTileMap(["@AB.C"], { A: { tasks: ["t"] }, B: { tasks: ["u"] }, C: {} }, { tasks });
    expect(level.interactables.map((i) => i.id)).toEqual(["t", "u"]);
    expect(level.pieces.map((p) => p.name)).toEqual(["A", "B", "C"]);
  });

  it("lists every object as a piece, with its name and sprite", () => {
    const level = parseTileMap(["@BB"], { B: { name: "bed", sprite: "bed-made" } });
    expect(level.pieces).toEqual([
      { name: "bed", sprite: "bed-made", tiles: [{ col: 1, row: 0 }, { col: 2, row: 0 }], bounds: { x: TILE, y: 0, w: 2 * TILE, h: TILE } },
    ]);
  });

  it("uses palette colours only for placeholder drawing", () => {
    const level = parseTileMap(["@T#"], { T: { color: "leaf" } });
    expect(level.solids.map((s) => s.color)).toEqual([COLOR.leaf, COLOR.dusk]);
  });

  it("lets objects sit in the wall", () => {
    const level = parseTileMap(["#W#", "#@#"], { W: { tasks: ["t"] } }, { tasks });
    expect(level.interactables[0].zones).toEqual([tile(1, 0)]);
    expect(level.solids).toHaveLength(5); // four wall tiles and the window
  });

  it("makes a door a walkable tile that leads somewhere", () => {
    const arrive = { col: 1, row: 1, facing: "right" as const };
    const level = parseTileMap(["#@.", "D.."], { D: { door: { to: "next", arrive } } });
    expect(level.doors).toEqual([{ col: 0, row: 1, to: "next", arrive }]);
    expect(level.solids).toHaveLength(1);
    expect(level.pieces).toEqual([]);
  });

  it("carries the room name and the way the player faces", () => {
    const level = parseTileMap(["@"], {}, { id: "kitchen", facing: "left" });
    expect(level).toMatchObject({ id: "kitchen", facing: "left" });
  });

  it("accepts Windows line endings", () => {
    const level = parseTileMap(["###\r", "#@#\r", "###\r"], {});
    expect(level.size.width).toBe(3 * TILE);
  });

  it("explains what is wrong with a bad map", () => {
    expect(() => parseTileMap([], {})).toThrow("empty");
    expect(() => parseTileMap(["@.", "..."], {})).toThrow("Row 1 is 3 tiles wide");
    expect(() => parseTileMap(["..", ".."], {})).toThrow("no start");
    expect(() => parseTileMap(["@@"], {})).toThrow("More than one start");
    expect(() => parseTileMap(["@X"], {})).toThrow('Unknown character "X" at row 0, col 1');
    expect(() => parseTileMap(["@A.A"], { A: {} })).toThrow('"A" are not all touching');
    expect(() => parseTileMap([5 as unknown as string], {})).toThrow("must be text");
  });

  it("puts the room's name in its errors", () => {
    expect(() => parseTileMap(["@X"], {}, { id: "bath" })).toThrow("bath: Unknown character");
  });

  it("rejects a legend that fights the built-in characters", () => {
    for (const ch of ["#", ".", "@"]) {
      expect(() => parseTileMap(["@"], { [ch]: {} })).toThrow(`"${ch}" is built in`);
    }
    expect(() => parseTileMap(["@"], { AB: {} })).toThrow("one character");
  });

  it("rejects a colour that is not in the palette", () => {
    const bad = { color: "chartreuse" as never };
    expect(() => parseTileMap(["@A"], { A: bad })).toThrow('unknown colour "chartreuse"');
  });

  it("rejects a task id that is not in the task list", () => {
    expect(() => parseTileMap(["@A"], { A: { tasks: ["nope"] } }, { tasks })).toThrow('unknown task "nope"');
  });

  it("rejects doors that are solid or wider than one tile", () => {
    const door = { to: "x", arrive: { col: 0, row: 0, facing: "down" as const } };
    expect(() => parseTileMap(["@D"], { D: { door, solid: true } })).toThrow("can't be solid");
    expect(() => parseTileMap(["@DD"], { D: { door } })).toThrow("must be one tile");
  });

  it("handles one very large object without overflowing the stack", () => {
    const row = "B".repeat(300);
    const rows = ["@" + row.slice(1), ...Array(300).fill(row)];
    const level = parseTileMap(rows, { B: { tasks: ["t"] } }, { tasks });
    expect(level.interactables[0].zones).toHaveLength(299 + 300 * 300);
    expect(level.pieces[0].bounds.w).toBe(300 * TILE);
  });
});
