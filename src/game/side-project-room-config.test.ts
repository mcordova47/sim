import { describe, expect, it } from "vitest";
import { LIMITS } from "./side-project-config";
import { configDim, SHIPPED_CONFIG, sideProjectRoom, toRoomOps } from "./side-project-room-config";
import { APARTMENT } from "./apartment";
import { composeSideProject, ComposeError, pieceIds } from "./side-project-room";

// Issue 111d: the shipped config file.

const sprites = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const hasSprite = (name: string) => `/public/sprites/${name}.png` in sprites;

describe("the shipped side-project-room.txt", () => {
  it("parses with no problems and has commands", () => {
    expect(SHIPPED_CONFIG.problems).toEqual([]);
    expect(SHIPPED_CONFIG.ops.length).toBeGreaterThan(8);
  });

  it("names only pieces the real room has and sprites that exist", () => {
    const ids = new Set(pieceIds(APARTMENT.rooms.main).values());
    for (const op of SHIPPED_CONFIG.ops) {
      if ((op.kind === "move" || op.kind === "look" || op.kind === "hide") && op.piece !== "floor") {
        expect(ids.has(op.piece), `line ${op.line}: ${op.piece}`).toBe(true);
      }
      if (op.kind === "look" || op.kind === "add") expect(hasSprite(op.sprite), `line ${op.line}: ${op.sprite}`).toBe(true);
    }
    // The composer agrees (it refuses an unknown piece or sprite).
    expect(() => composeSideProject(APARTMENT.rooms.main, toRoomOps(SHIPPED_CONFIG.ops), undefined, { hasSprite })).not.toThrow(ComposeError);
  });

  it("keeps every value inside the limits and draws every sprite it needs", () => {
    for (const op of SHIPPED_CONFIG.ops) {
      if (op.kind === "move") {
        expect(Math.abs(op.dx)).toBeLessThanOrEqual(LIMITS.maxMove);
        expect(Math.abs(op.dy)).toBeLessThanOrEqual(LIMITS.maxMove);
      }
    }
    const dim = configDim();
    expect(dim === undefined || (dim >= LIMITS.dim.min && dim <= LIMITS.dim.max)).toBe(true);
    for (const op of sideProjectRoom({ hasSprite })) expect(hasSprite(op.sprite), op.sprite).toBe(true);
  });

  it("draws the wrong views, swaps the desk and the table, and has the figure on the desk", () => {
    const room = sideProjectRoom({ hasSprite });
    const at = (sprite: string) => room.find((o) => o.sprite === sprite)!;
    for (const s of ["sp-sofa-back", "sp-bed-top", "sp-bookshelf-top", "sp-nightstand-side", "sp-desk-front-figure", "sp-table-front"]) {
      expect(at(s), s).toBeDefined();
    }
    expect(at("sp-desk-front-figure").x).toBeLessThan(at("sp-table-front").x);
    const floor = room.filter((o) => o.layer === "floor");
    expect(floor.filter((o) => o.sprite === "sp-floor-big").length).toBeGreaterThan(20);
    // Edge tiles that do not fill a 2 x 2 block keep the ordinary tile.
    expect(floor.every((o) => o.sprite === "sp-floor-big" || o.sprite === "floor-wood")).toBe(true);
  });
});

describe("toRoomOps", () => {
  it("maps the parser's fields to the composer's", () => {
    expect(toRoomOps([
      { kind: "move", piece: "a", dx: 1, dy: 2, line: 1 },
      { kind: "look", piece: "a", sprite: "b", line: 2 },
      { kind: "hide", piece: "a", line: 3 },
      { kind: "add", sprite: "b", x: 4, y: 5, line: 4 },
      { kind: "dim", amount: 0.2, line: 5 },
    ])).toEqual([
      { kind: "move", id: "a", dx: 1, dy: 2 },
      { kind: "look", id: "a", sprite: "b" },
      { kind: "hide", id: "a" },
      { kind: "add", id: "added-line-4", sprite: "b", x: 4, y: 5 },
      { kind: "dim", value: 0.2 },
    ]);
  });

  it("falls back to the plain copy when the config names something the room does not have", () => {
    const plain = composeSideProject(APARTMENT.rooms.main, []);
    expect(sideProjectRoom({}, [{ kind: "hide", piece: "no-such-thing", line: 1 }])).toEqual(plain);
  });
});

describe("look floor", () => {
  it("draws each 2 x 2 block of floor tiles once with the big sprite, and refuses a missing sprite", () => {
    const plain = composeSideProject(APARTMENT.rooms.main, []).filter((o) => o.layer === "floor");
    const big = composeSideProject(APARTMENT.rooms.main, [{ kind: "look", id: "floor", sprite: "x" }]).filter((o) => o.layer === "floor");
    expect(big.length).toBeLessThan(plain.length / 2);
    expect(new Set(big.map((o) => `${o.x},${o.y}`)).size).toBe(big.length);
    const floor = new Set(APARTMENT.rooms.main.floor!.tiles.map((t) => `${t.col},${t.row}`));
    for (const o of big.filter((o) => o.sprite === "x")) {
      expect(o.x % 32 === 0 && o.y % 32 === 0).toBe(true);
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(floor.has(`${o.x / 16 + dc},${o.y / 16 + dr}`)).toBe(true);
    }
    for (const o of big.filter((o) => o.sprite !== "x")) expect(floor.has(`${o.x / 16},${o.y / 16}`)).toBe(true);
    expect(() => composeSideProject(APARTMENT.rooms.main, [{ kind: "look", id: "floor", sprite: "x" }], undefined, { hasSprite: () => false })).toThrow(ComposeError);
  });
});
