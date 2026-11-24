import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { drawThings, thingsCells } from "./achievements/inventory-draw";
import { APARTMENT } from "./apartment";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Decor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, NOTE_MAX, FROM_MAX } from "./decor-data";
import { Game } from "./game";
import { overlaps } from "./world";
import { unsupportedChars } from "../render/font";

vi.mock("../render/font", async (original) => ({ ...(await original<typeof import("../render/font")>()), drawText: vi.fn() }));

// Issue 166: a rug on the floor between the table and the sofa (step E of docs/decor-expansion-design.md).

const main = APARTMENT.rooms.main;
const slot = DECOR_SLOTS.find((s) => s.id === "rug-floor")!;
const RUGS = ["rug-striped", "rug-geometric"];
const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// A game whose drawing is logged: every sprite asked for, in order.
function draws(decor: Decor, move: (g: Game) => void = () => {}): { name: string; x: number; y: number }[] {
  const log: { name: string; x: number; y: number }[] = [];
  const sprites: SpriteDrawer = {
    has: () => true,
    draw: (_c, name, x, y) => void log.push({ name, x, y }),
    drawRegion: () => {},
  };
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  try {
    const game = new Game(main, { rooms: APARTMENT.rooms, decor, sprites, random: () => 0.5 });
    game.state.onChange = undefined;
    move(game);
    log.length = 0;
    game.update(1 / 60, NO_INPUT);
    game.render(ctx, 0.5);
  } finally {
    vi.unstubAllGlobals();
  }
  return log;
}
const withRug = (id = "rug-striped") => {
  const d = new Decor();
  d.own(id);
  d.place("rug-floor", id);
  return d;
};

describe("the rug slot and items", () => {
  it("is a 64x32 slot at cols 3-6, rows 3-4 with no default, changed at the sofa", () => {
    expect(slot.area).toEqual({ x: 48, y: 48, w: 64, h: 32 });
    expect(slot.kinds).toEqual(["rug"]);
    expect(slot.default).toBeUndefined();
    expect(slot.object).toBe("sofa");
    expect(new Decor().swapProblems(main)).toEqual([]);
    expect(main.interactables.some((i) => i.id === "swap-rug-floor")).toBe(true);
  });

  it("has two rugs, with a note and a source, the font's letters only, art that exists and the right size", () => {
    const rugs = DECOR_DATA.items.filter((i) => i.kind === "rug");
    expect(rugs.map((r) => r.id)).toEqual(RUGS);
    for (const r of rugs) {
      expect([r.w, r.h]).toEqual([64, 32]);
      expect(r.from).toBeTruthy();
      expect(r.note!.length).toBeLessThanOrEqual(NOTE_MAX);
      expect(r.from!.length).toBeLessThanOrEqual(FROM_MAX);
      for (const text of [r.name, r.note!, r.from!]) expect(unsupportedChars(text), text).toEqual([]);
      expect(`/public/sprites/${r.sprite}.png` in spriteFiles, r.sprite).toBe(true);
      expect(DECOR_ITEMS.includes(r)).toBe(false); // a gift, not a starting thing
    }
  });

  it("arrive as gifts after the last outfit (day 72), on days 75 and 78", () => {
    const day = (id: string) => CHECKPOINTS.find((c) => c.item === id)!;
    expect([day("rug-striped").atLeast, day("rug-geometric").atLeast]).toEqual([75, 78]);
    const lastOutfit = Math.max(...CHECKPOINTS.filter((c) => String(c.item).startsWith("outfit-")).map((c) => Number(c.atLeast)));
    expect(lastOutfit).toBe(72);
  });
});

describe("a fresh game", () => {
  it("has no rug: nothing owned, nothing drawn, no swap offered, the slot is empty", () => {
    const d = new Decor();
    expect(d.shownIn("rug-floor")).toBeUndefined();
    expect(d.canChange("rug-floor")).toBe(false);
    expect(draws(d).filter((l) => RUGS.includes(l.name))).toEqual([]);
  });
});

describe("the floor layer", () => {
  it("draws the rug at its place, before every piece and before the player", () => {
    for (const id of RUGS) {
      const log = draws(withRug(id));
      const names = log.map((l) => l.name);
      const at = names.indexOf(id);
      expect(at, id).toBeGreaterThanOrEqual(0);
      expect(log[at]).toMatchObject({ x: 48, y: 48 });
      expect(names.filter((n) => n === id)).toHaveLength(1);
      // After the floor and walls, before the table, desk, sofa, bed and the player.
      expect(at).toBeGreaterThan(names.lastIndexOf("floor-wood"));
      for (const over of ["table", "desk", "sofa-td", "bookshelf", "player-idle-down"]) {
        expect(names.indexOf(over), over).toBeGreaterThan(at);
      }
    }
  });

  it("draws the player over the rug even when they stand on it", () => {
    const log = draws(withRug(), (g) => g.loadLevel(main, 4, 3, "down"));
    const names = log.map((l) => l.name);
    expect(names.indexOf("player-idle-down")).toBeGreaterThan(names.indexOf("rug-striped"));
  });

  it("is not a solid: nothing blocks any tile of it, and walking across it is the same with and without", () => {
    const rug = withRug();
    const game = new Game(main, { rooms: APARTMENT.rooms, decor: rug, random: () => 0.5 });
    const area = slot.area;
    expect(main.solids.some((s) => overlaps(s, area))).toBe(false);
    expect(main.pieces.some((p) => overlaps(p.bounds, area))).toBe(false);
    expect((main.floorProps ?? []).length).toBe(1);
    expect((main.props ?? []).some((p) => p.slot === "rug-floor")).toBe(false);
    const walk = (g: Game, from: [number, number], dir: "right" | "down") => {
      g.loadLevel(main, from[0], from[1], "down");
      for (let i = 0; i < 90; i++) g.update(1 / 60, { ...NO_INPUT, dir });
      return { x: g.player.x, y: g.player.y };
    };
    const bare = new Game(main, { rooms: APARTMENT.rooms, random: () => 0.5 });
    for (const [from, dir] of [[[3, 3], "right"], [[6, 3], "down"], [[3, 4], "right"]] as const) {
      const a = walk(game, [...from], dir);
      expect(a).toEqual(walk(bare, [...from], dir));
      expect(a.x !== from[0] * 16 || a.y !== from[1] * 16).toBe(true); // it did move
    }
    // Standing on the middle of it, and every tile of it, is allowed.
    for (let col = 3; col <= 6; col++) for (let row = 3; row <= 4; row++) {
      game.loadLevel(main, col, row, "down");
      expect(game.player.x).toBe(col * 16);
      expect(game.player.y).toBe(row * 16);
    }
  });
});

describe("changing the rug", () => {
  it("offers the swap only when a rug is owned and not on show, and NOTHING takes it up again", () => {
    const d = new Decor();
    expect(d.canBeEmpty("rug-floor")).toBe(true);
    d.own("rug-striped");
    expect(d.canChange("rug-floor")).toBe(true);
    expect(d.choices("rug-floor").map((i) => i.id)).toEqual(["rug-striped"]);
    d.place("rug-floor", "rug-striped");
    expect(d.shownIn("rug-floor")?.id).toBe("rug-striped");
    d.own("rug-geometric");
    d.place("rug-floor", "rug-geometric");
    expect(d.shownIn("rug-floor")?.id).toBe("rug-geometric");
    expect(d.inventory().map((i) => i.id)).toEqual(["rug-striped"]);
    d.place("rug-floor", null);
    expect(d.shownIn("rug-floor")).toBeUndefined();
    expect(d.inventory().map((i) => i.id).sort()).toEqual(RUGS.slice().sort());
    expect(d.toJSON().placed["rug-floor"]).toBeUndefined();
  });

  it("keeps the rug through a save and a load, and a rug is refused in any other slot", () => {
    const d = withRug("rug-geometric");
    const copy = new Decor();
    copy.load(JSON.parse(JSON.stringify(d)));
    expect(copy.shownIn("rug-floor")?.id).toBe("rug-geometric");
    for (const other of DECOR_SLOTS.filter((s) => s.id !== "rug-floor")) expect(d.choices(other.id).some((i) => i.kind === "rug")).toBe(false);
  });
});

describe("the THINGS page", () => {
  it("draws a rug at half size in its cell, the whole of it, and keeps other things at their own size", () => {
    const d = new Decor();
    for (const id of RUGS) d.own(id);
    const entries = d.entries();
    const calls: { name: string; from: { w: number; h: number }; into: { width: number; height: number } }[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: () => {},
      drawRegion: (_c, name, from, into) => void calls.push({ name, from, into }),
    };
    const ctx = { fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, drawImage: () => {}, fillText: () => {} } as unknown as CanvasRenderingContext2D;
    const view = { entries, cursor: 0, touch: false, sprites };
    drawThings(ctx, view);
    const cells = new Map(thingsCells(view).map((c) => [c.index, c.rect]));
    for (const id of RUGS) {
      const index = entries.findIndex((e) => e.item.id === id);
      const rect = cells.get(index)!;
      const inCell = calls.find((c) => c.name === id)!;
      expect(inCell.from).toEqual({ x: 0, y: 0, w: 64, h: 32 }); // the whole picture
      expect(inCell.into).toEqual({ width: 32, height: 16 }); // at half size
      expect(inCell.into.width).toBeLessThanOrEqual(rect.w - 4);
      expect(inCell.into.height).toBeLessThanOrEqual(rect.h - 4);
    }
    // A painting (32x16) fits its cell and is still drawn at 1x.
    const barn = calls.find((c) => c.name === "painting");
    expect(barn?.into).toEqual({ width: 32, height: 16 });
  });
});
