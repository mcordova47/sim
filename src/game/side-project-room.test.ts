import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { composeSideProject, ComposeError, FIGURE_SPRITE, pieceIds, slug, type ConfigOp } from "./side-project-room";

// Issue 111b: the little room is composed from the real main room.

const main = APARTMENT.rooms.main;
const compose = (ops: ConfigOp[] = [], hasSprite?: (n: string) => boolean) =>
  composeSideProject(main, ops, undefined, { hasSprite });
const things = (ops: ConfigOp[] = []) => compose(ops).filter((o) => o.layer === "thing");
const byId = (id: string, ops: ConfigOp[] = []) => compose(ops).find((o) => o.id === id);

afterEach(() => vi.unstubAllGlobals());

describe("slug and ids", () => {
  it("slugs names", () => {
    expect(slug("Painting over the desk")).toBe("painting-over-the-desk");
    expect(slug("front door (decoration for now)")).toBe("front-door-decoration-for-now");
  });

  it("gives every piece a unique id, numbering repeats", () => {
    const ids = [...pieceIds(main).values()];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("queen-bed");
    expect(ids).toContain("standing-desk");
    expect(ids.filter((i) => i.startsWith("window-and-blinds"))).toEqual(["window-and-blinds", "window-and-blinds-2"]);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("a faithful copy (no overrides)", () => {
  it("has every piece with a sprite, at its bounds, and nothing else of pieces", () => {
    const got = things().filter((o) => !main.props!.some((p) => p.sprite === o.sprite && p.area.x === o.x && p.area.y === o.y));
    const want = main.pieces.filter((p) => p.sprite).map((p) => ({ sprite: p.sprite, x: p.bounds.x, y: p.bounds.y }));
    expect(got.map((o) => ({ sprite: o.sprite, x: o.x, y: o.y })).sort(cmp)).toEqual(want.sort(cmp));
  });

  it("has the props that show by default, on their pieces", () => {
    const plant = byId("snake-plant")!;
    expect(plant.sprite).toBe("plant-0");
    expect(byId("coffee-mug")).toBeDefined(); // shown while mug is 0
  });

  it("follows a prop's condition when given the state", () => {
    const held = composeSideProject(main, [], (id) => (id === "mug" ? 1 : 0));
    expect(held.find((o) => o.id === "coffee-mug")).toBeUndefined();
  });

  it("has every floor and wall tile, under the pieces", () => {
    const ops = compose();
    expect(ops.filter((o) => o.layer === "floor")).toHaveLength(main.floor!.tiles.length);
    const doors = main.walls!.filter((w) => w.doorSprite).length;
    expect(ops.filter((o) => o.layer === "wall")).toHaveLength(main.walls!.length + doors);
    const firstThing = ops.findIndex((o) => o.layer === "thing");
    expect(ops.slice(0, firstThing).every((o) => o.layer === "floor" || o.layer === "wall")).toBe(true);
    expect(ops.slice(firstThing).every((o) => o.layer === "thing")).toBe(true);
  });

  it("is sorted from the back to the front like the real room", () => {
    const bottoms = things().map((o) => {
      const piece = main.pieces.find((p) => p.sprite === o.sprite && p.bounds.x === o.x && p.bounds.y === o.y);
      const prop = main.props!.find((p) => p.area.x === o.x && p.area.y === o.y);
      return piece ? piece.bounds.y + piece.bounds.h : prop!.on.bounds.y + prop!.on.bounds.h;
    });
    expect(bottoms).toEqual([...bottoms].sort((a, b) => a - b));
  });

  it("is deterministic and does not change the real room", () => {
    const before = JSON.stringify(main.pieces);
    expect(compose()).toEqual(compose());
    compose([{ kind: "move", id: "queen-bed", dx: 5, dy: 5 }, { kind: "hide", id: "sofa" }]);
    expect(JSON.stringify(main.pieces)).toBe(before);
  });

  it("matches the real game's sprites, in order, for a steady state", () => {
    // Every floor, wall, piece and prop sprite the composed room draws is drawn by the
    // real game too, in the same order, in the start state with the bed made.
    const drawn: string[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y) => void drawn.push(`${name}@${x},${y}`),
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const game = new Game(main, { rooms: APARTMENT.rooms, sprites, random: () => 0.5 });
    game.state.applyEffects([{ var: "bedMade", set: 1 }]);
    game.update(1 / 60, NO_INPUT);
    drawn.length = 0;
    game.render(ctx, 0.5);
    const want = new Set(drawn);
    // The windows and the plant take their look from state (blinds, growth stage), which
    // the little room deliberately does not follow, so they are left out of the comparison.
    const stateful = (o: { id?: string }) => o.id?.startsWith("window-and-blinds") || o.id === "snake-plant";
    const steady = compose().filter((o) => o.layer !== "figure" && !stateful(o));
    const missing = steady
      .map((o) => `${o.sprite}@${o.x},${o.y}`)
      .filter((s) => !want.has(s));
    expect(missing).toEqual([]);
    // Same relative order for floor/walls/things as a subsequence.
    const composed = steady.map((o) => `${o.sprite}@${o.x},${o.y}`);
    let i = 0;
    for (const d of drawn) if (i < composed.length && d === composed[i]) i++;
    expect(i).toBe(composed.length);
  });
});

describe("each command changes exactly one thing", () => {
  const base = compose();
  const diff = (ops: ConfigOp[]) => {
    const after = compose(ops);
    return after.filter((o, i) => JSON.stringify(o) !== JSON.stringify(base[i]) || i >= base.length);
  };

  it("move shifts a piece and what sits on it", () => {
    const bed = byId("queen-bed")!;
    const moved = byId("queen-bed", [{ kind: "move", id: "queen-bed", dx: 16, dy: 0 }])!;
    expect(moved).toMatchObject({ x: bed.x + 16, y: bed.y });
    const plant = byId("snake-plant")!;
    const plantMoved = byId("snake-plant", [{ kind: "move", id: "cube-bookshelf", dx: 0, dy: -16 }])!;
    expect(plantMoved.y).toBe(plant.y - 16);
  });

  it("move down re-sorts the piece to the front", () => {
    const ops = things([{ kind: "move", id: "queen-bed", dx: 0, dy: 400 }]);
    expect(ops[ops.length - 1].id).toBe("queen-bed");
  });

  it("look swaps the sprite and nothing else", () => {
    const after = compose([{ kind: "look", id: "queen-bed", sprite: "bed-unmade" }]);
    expect(after.find((o) => o.id === "queen-bed")!.sprite).toBe("bed-unmade");
    expect(diff([{ kind: "look", id: "queen-bed", sprite: "bed-unmade" }])).toHaveLength(1);
  });

  it("hide removes the piece and what sits on it", () => {
    const after = compose([{ kind: "hide", id: "cube-bookshelf" }]);
    expect(after).toHaveLength(base.length - 2);
    expect(after.find((o) => o.id === "cube-bookshelf")).toBeUndefined();
    expect(after.find((o) => o.id === "snake-plant")).toBeUndefined();
  });

  it("hide can remove just a prop", () => {
    expect(compose([{ kind: "hide", id: "snake-plant" }])).toHaveLength(base.length - 1);
  });

  it("add puts a new sprite in, sorted by its bottom", () => {
    const after = compose([{ kind: "add", id: "plant-2", sprite: "plant-1", x: 96, y: 72 }]);
    expect(after).toHaveLength(base.length + 1);
    expect(after.find((o) => o.id === "plant-2")).toMatchObject({ sprite: "plant-1", x: 96, y: 72 });
  });

  it("dim changes nothing here", () => {
    expect(compose([{ kind: "dim", value: 0.4 }])).toEqual(base);
  });

  it("the figure is last, on its piece plus the offset", () => {
    const desk = main.pieces.find((p) => p.name === "standing desk")!;
    const after = compose([{ kind: "figure", on: "standing-desk", dx: 6, dy: -9 }]);
    expect(after).toHaveLength(base.length + 1);
    expect(after[after.length - 1]).toEqual({
      sprite: FIGURE_SPRITE,
      x: desk.bounds.x + 6,
      y: desk.bounds.y - 9,
      layer: "figure",
    });
  });

  it("the figure follows a moved piece", () => {
    const desk = main.pieces.find((p) => p.name === "standing desk")!;
    const after = compose([
      { kind: "move", id: "standing-desk", dx: 10, dy: 0 },
      { kind: "figure", on: "standing-desk", dx: 6, dy: -9 },
    ]);
    expect(after[after.length - 1].x).toBe(desk.bounds.x + 16);
  });

  it("ops apply in order", () => {
    const a = byId("queen-bed", [
      { kind: "move", id: "queen-bed", dx: 4, dy: 0 },
      { kind: "move", id: "queen-bed", dx: 4, dy: 0 },
    ])!;
    expect(a.x).toBe(byId("queen-bed")!.x + 8);
  });
});

describe("bad overrides refuse, naming the problem", () => {
  const throws = (op: ConfigOp, text: RegExp, hasSprite?: (n: string) => boolean) =>
    expect(() => compose([op], hasSprite)).toThrow(text);

  it("unknown piece", () => {
    throws({ kind: "move", id: "piano", dx: 1, dy: 1 }, /"move" names "piano"/);
    throws({ kind: "look", id: "piano", sprite: "x" }, /piano/);
    throws({ kind: "hide", id: "piano" }, /piano/);
    throws({ kind: "figure", on: "piano", dx: 0, dy: 0 }, /piano/);
    expect(() => compose([{ kind: "hide", id: "piano" }])).toThrow(ComposeError);
  });

  it("missing sprite, when sprites can be checked", () => {
    const has = (n: string) => n !== "nope";
    throws({ kind: "look", id: "queen-bed", sprite: "nope" }, /does not exist: nope/, has);
    throws({ kind: "add", id: "x", sprite: "nope", x: 0, y: 0 }, /does not exist: nope/, has);
    throws({ kind: "figure", on: "sofa", dx: 0, dy: 0 }, /does not exist: side-project-figure/, () => false);
  });

  it("an added id that is already taken, or a second figure", () => {
    throws({ kind: "add", id: "queen-bed", sprite: "a", x: 0, y: 0 }, /already taken/);
    expect(() =>
      compose([
        { kind: "figure", on: "sofa", dx: 0, dy: 0 },
        { kind: "figure", on: "sofa", dx: 1, dy: 1 },
      ]),
    ).toThrow(/twice/);
  });

  it("an hidden piece cannot be moved afterwards", () => {
    expect(() =>
      compose([
        { kind: "hide", id: "sofa" },
        { kind: "move", id: "sofa", dx: 1, dy: 0 },
      ]),
    ).toThrow(/sofa/);
  });
});

function cmp(a: { sprite?: string; x: number; y: number }, b: { sprite?: string; x: number; y: number }) {
  return `${a.sprite}${a.x}${a.y}`.localeCompare(`${b.sprite}${b.x}${b.y}`);
}
