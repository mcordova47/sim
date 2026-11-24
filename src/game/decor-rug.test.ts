import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { unsupportedChars } from "../render/font";
import type { SpriteDrawer } from "../render/sprites";
import { drawThings, entryLayout, thingsBox, thingsCells } from "./achievements/inventory-draw";
import { APARTMENT } from "./apartment";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Decor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, FROM_MAX, NOTE_MAX } from "./decor-data";
import { Game } from "./game";
import { TASKS } from "./tasks";
import { taskSpots } from "./plan-checks";
import { overlaps } from "./world";

// Issue 166: rugs on the floor. The living-area rug (slot `rug-floor`, 128x64 at cols 2-9, rows 3-6) and the bed rug (slot `rug-bed`,
// 112x48 at cols 11-17, rows 6-8), both floor props drawn under every piece and the player.

vi.mock("../render/font", async (original) => ({ ...(await original<typeof import("../render/font")>()), drawText: vi.fn() }));

const main = APARTMENT.rooms.main;
const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const sources = import.meta.glob("/art/src/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const SETS = {
  "rug-floor": { area: { x: 32, y: 48, w: 128, h: 64 }, object: "sofa", ids: ["rug-striped", "rug-geometric", "rug-field", "rug-shag", "rug-kilim"] },
  "rug-bed": { area: { x: 176, y: 96, w: 112, h: 48 }, object: "queen bed", ids: ["rug-bed-striped", "rug-bed-geometric", "rug-bed-field", "rug-bed-shag", "rug-bed-braid", "rug-bed-kilim"] },
} as const;
const ALL: string[] = [...SETS["rug-floor"].ids, ...SETS["rug-bed"].ids];
const slotOf = (id: string) => (id.startsWith("rug-bed-") ? "rug-bed" : "rug-floor");

// A game whose drawing is logged: every sprite asked for, in order.
function draws(decor: Decor, move: (g: Game) => void = () => {}): { name: string; x: number; y: number }[] {
  const log: { name: string; x: number; y: number }[] = [];
  const sprites: SpriteDrawer = { has: () => true, draw: (_c, name, x, y) => void log.push({ name, x, y }), drawRegion: () => {} };
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
const withRugs = (...ids: string[]) => {
  const d = new Decor();
  for (const id of ids) { d.own(id); d.place(slotOf(id), id); }
  return d;
};

describe("the rug slots and items", () => {
  it("are a 128x64 living-area slot at the sofa and a 112x48 bed slot at the bed, both with no default", () => {
    for (const [id, set] of Object.entries(SETS)) {
      const slot = DECOR_SLOTS.find((s) => s.id === id)!;
      expect(slot.area, id).toEqual(set.area);
      expect(slot.kinds).toEqual(["rug"]);
      expect(slot.default).toBeUndefined();
      expect(slot.object).toBe(set.object);
      expect(main.interactables.some((i) => i.id === `swap-${id}`), id).toBe(true);
    }
    expect(new Decor().swapProblems(main)).toEqual([]);
    expect(TASKS.find((t) => t.id === "swap-rug-floor")!.prompt).toBe("Change the rug");
    expect(TASKS.find((t) => t.id === "swap-rug-bed")!.prompt).toBe("Change the bed rug");
  });

  it("are 11 items (5 main, 6 bed), each with a note and a source, the font's letters only, art that exists and the right size", () => {
    const rugs = DECOR_DATA.items.filter((i) => i.kind === "rug");
    expect(rugs.map((r) => r.id)).toEqual(ALL);
    expect(new Set(rugs.map((r) => r.name)).size).toBe(rugs.length);
    for (const r of rugs) {
      const area = SETS[slotOf(r.id)].area;
      expect([r.w, r.h], r.id).toEqual([area.w, area.h]);
      expect(r.from).toBeTruthy();
      expect(r.note!.length, r.id).toBeLessThanOrEqual(NOTE_MAX);
      expect(r.note, r.id).toBe(r.note!.toUpperCase());
      expect(r.from!.length).toBeLessThanOrEqual(FROM_MAX);
      for (const text of [r.name, r.note!, r.from!]) expect(unsupportedChars(text), text).toEqual([]);
      expect(`/public/sprites/${r.sprite}.png` in spriteFiles, r.sprite).toBe(true);
      const src = sources[`/art/src/${r.sprite}.sprite`];
      expect(new RegExp(`^size: ${area.w}x${area.h}$`, "m").test(src), r.id).toBe(true);
      expect(DECOR_ITEMS.includes(r)).toBe(false); // a gift, not a starting thing
      // A rug fits only its own slot (a different size), so a bed rug can never go in the living area or the other way round.
      const d = new Decor();
      d.own(r.id);
      expect(d.choices(slotOf(r.id)).some((i) => i.id === r.id)).toBe(true);
      expect(d.choices(slotOf(r.id) === "rug-bed" ? "rug-floor" : "rug-bed").some((i) => i.id === r.id)).toBe(false);
    }
  });

  it("arrive as a starter pair of checkpoint gifts after the last outfit (day 72): a living-area rug on day 75 and a bed rug on day 78; the other nine have no checkpoint yet", () => {
    const rugGifts = CHECKPOINTS.filter((c) => [c.item].flat().some((i) => i.startsWith("rug-")));
    expect(rugGifts.map((c) => [c.item, c.atLeast])).toEqual([["rug-striped", 75], ["rug-bed-striped", 78]]);
    const lastOutfit = Math.max(...CHECKPOINTS.filter((c) => String(c.item).startsWith("outfit-")).map((c) => Number(c.atLeast)));
    expect(lastOutfit).toBe(72);
    // An item with no source is just never owned: it is not a problem for the store, a save or the lists.
    const unsourced = ALL.filter((id) => !rugGifts.some((c) => c.item === id));
    expect(unsourced).toHaveLength(9);
    const d = new Decor();
    for (const id of unsourced) expect(d.owns(id)).toBe(false);
    expect(d.entries().some((e) => unsourced.includes(e.item.id))).toBe(false);
    expect(() => d.load(JSON.parse(JSON.stringify({ owned: [], placed: { "rug-floor": unsourced[0] } })))).not.toThrow();
    expect(d.shownIn("rug-floor")).toBeUndefined();
  });
});

describe("a fresh game", () => {
  it("has no rug: nothing owned, nothing drawn, no swap offered, both slots empty", () => {
    const d = new Decor();
    for (const id of ["rug-floor", "rug-bed"]) {
      expect(d.shownIn(id)).toBeUndefined();
      expect(d.canChange(id)).toBe(false);
    }
    expect(draws(d).filter((l) => ALL.includes(l.name))).toEqual([]);
  });
});

describe("the floor layer", () => {
  it("draws each rug at its place, after the floor and before every piece and the player", () => {
    for (const id of ALL) {
      const log = draws(withRugs(id));
      const names = log.map((l) => l.name);
      const at = names.indexOf(id);
      expect(at, id).toBeGreaterThanOrEqual(0);
      expect(log[at]).toMatchObject({ x: SETS[slotOf(id)].area.x, y: SETS[slotOf(id)].area.y });
      expect(names.filter((n) => n === id)).toHaveLength(1);
      expect(at).toBeGreaterThan(names.lastIndexOf("floor-wood"));
      for (const over of ["table", "desk", "sofa-td", "bookshelf", "player-idle-down"]) expect(names.indexOf(over), `${id} before ${over}`).toBeGreaterThan(at);
    }
  });

  it("draws both rugs together, and the bed and its pictures over the bed rug", () => {
    const names = draws(withRugs("rug-striped", "rug-bed-kilim")).map((l) => l.name);
    expect(names).toContain("rug-striped");
    expect(names).toContain("rug-bed-kilim");
    const bed = names.findIndex((n) => n === "bed-made" || n === "bed-unmade");
    expect(bed).toBeGreaterThan(names.indexOf("rug-bed-kilim"));
    // The bed's own pictures (the made and unmade bed and the sleeping poses) are fully opaque, so the rug never shows through them.
    const opaque = (name: string) => !sources[`/art/src/${name}.sprite`].split("\n").filter((r) => /^[.1-9a-m]{80}$/.test(r)).some((r) => r.includes("."));
    for (const name of ["bed-made", "bed-unmade", "player-sleep-bed", "player-sleep-bed-unmade", "sp-bed-top"]) expect(opaque(name), name).toBe(true);
  });

  it("draws the player over the rug even when they stand on it", () => {
    for (const [stand, id] of [[[4, 3], "rug-striped"], [[12, 8], "rug-bed-striped"]] as const) {
      const log = draws(withRugs(id), (g) => g.loadLevel(main, stand[0], stand[1], "down"));
      const names = log.map((l) => l.name);
      expect(names.indexOf("player-idle-down")).toBeGreaterThan(names.indexOf(id));
    }
  });

  it("are not solids: nothing blocks any tile of them, they keep off walls, the package tile and the door, and walking over them is the same", () => {
    const game = new Game(main, { rooms: APARTMENT.rooms, decor: withRugs("rug-striped", "rug-bed-striped"), random: () => 0.5 });
    const bare = new Game(main, { rooms: APARTMENT.rooms, random: () => 0.5 });
    expect((main.floorProps ?? []).map((p) => p.slot)).toEqual(["rug-floor", "rug-bed"]);
    expect((main.props ?? []).some((p) => p.slot.startsWith("rug-"))).toBe(false);
    const wallOnly = main.solids.filter((s) => !main.pieces.some((p) => p.tiles.some((t) => t.col * 16 === s.x && t.row * 16 === s.y)));
    const doors = main.doors.map((d) => `${d.col},${d.row}`);
    for (const { area } of Object.values(SETS)) {
      expect(wallOnly.some((s) => overlaps(s, area))).toBe(false);
      expect(overlaps({ x: 160, y: 128, w: 16, h: 16 }, area)).toBe(false); // the package tile
      for (const d of doors) { const [c, r] = d.split(",").map(Number); expect(overlaps({ x: c * 16, y: r * 16, w: 16, h: 16 }, area)).toBe(false); }
    }
    const walk = (g: Game, from: [number, number], dir: "right" | "down" | "left") => {
      g.loadLevel(main, from[0], from[1], "down");
      for (let i = 0; i < 90; i++) g.update(1 / 60, { ...NO_INPUT, dir });
      return { x: g.player.x, y: g.player.y };
    };
    for (const [from, dir] of [[[2, 3], "right"], [[6, 3], "down"], [[3, 4], "right"], [[11, 8], "right"], [[16, 8], "left"]] as const) {
      expect(walk(game, [...from], dir)).toEqual(walk(bare, [...from], dir));
    }
  });

  it("hide no task prompt or standing tile: every stand tile of the sofa and the bed is still reachable and drawn under the player", () => {
    const spots = taskSpots(main).filter((s) => ["swap-rug-floor", "swap-rug-bed", "sleep", "make-bed", "nap", "doomscroll"].includes(s.id));
    expect(spots.length).toBeGreaterThan(0);
    const game = new Game(main, { rooms: APARTMENT.rooms, decor: withRugs("rug-striped", "rug-bed-striped"), random: () => 0.5 });
    for (const s of spots) {
      game.loadLevel(main, s.stand.col, s.stand.row, s.face);
      expect(game.player.x).toBe(s.stand.col * 16);
      expect(game.player.y).toBe(s.stand.row * 16);
    }
  });
});

describe("changing the rugs", () => {
  it("offers each swap only when a rug is owned and not on show, and NOTHING takes it up again", () => {
    const d = new Decor();
    for (const slot of ["rug-floor", "rug-bed"]) expect(d.canBeEmpty(slot)).toBe(true);
    d.own("rug-field");
    d.own("rug-bed-field");
    expect(d.choices("rug-floor").map((i) => i.id)).toEqual(["rug-field"]);
    expect(d.choices("rug-bed").map((i) => i.id)).toEqual(["rug-bed-field"]);
    d.place("rug-floor", "rug-field");
    d.own("rug-kilim");
    expect(d.canChange("rug-floor")).toBe(true);
    d.place("rug-floor", "rug-kilim");
    expect(d.shownIn("rug-floor")?.id).toBe("rug-kilim");
    expect(d.inventory().map((i) => i.id).sort()).toEqual(["rug-bed-field", "rug-field"]);
    d.place("rug-floor", null);
    expect(d.shownIn("rug-floor")).toBeUndefined();
    expect(d.toJSON().placed["rug-floor"]).toBeUndefined();
  });

  it("keeps both rugs through a save and a load, and refuses a rug in any other slot", () => {
    const d = withRugs("rug-geometric", "rug-bed-braid");
    const copy = new Decor();
    copy.load(JSON.parse(JSON.stringify(d)));
    expect(copy.shownIn("rug-floor")?.id).toBe("rug-geometric");
    expect(copy.shownIn("rug-bed")?.id).toBe("rug-bed-braid");
    for (const other of DECOR_SLOTS.filter((s) => !s.id.startsWith("rug-"))) expect(d.choices(other.id).some((i) => i.kind === "rug")).toBe(false);
  });
});

describe("the THINGS page", () => {
  const sprites = () => {
    const calls: { name: string; from: { w: number; h: number }; into: { width: number; height: number } }[] = [];
    const s: SpriteDrawer = { has: () => true, draw: () => {}, drawRegion: (_c, name, from, into) => void calls.push({ name, from, into }) };
    return { calls, s };
  };
  const ctx = { fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, drawImage: () => {}, fillText: () => {} } as unknown as CanvasRenderingContext2D;

  it("draws each rug whole at a quarter size in its cell (nothing cropped), and a painting at its own size", () => {
    const d = new Decor();
    for (const id of ALL) d.own(id);
    const entries = d.entries();
    const { calls, s } = sprites();
    const view = { entries, cursor: 0, touch: false, sprites: s };
    drawThings(ctx, view);
    const cells = new Map(thingsCells(view).map((c) => [c.index, c.rect]));
    for (const id of ALL) {
      const rect = cells.get(entries.findIndex((e) => e.item.id === id));
      if (!rect) continue; // on another page
      const area = SETS[slotOf(id)].area;
      const call = calls.find((c) => c.name === id)!;
      expect(call.from).toEqual({ x: 0, y: 0, w: area.w, h: area.h });
      expect(call.into).toEqual({ width: area.w / 4, height: area.h / 4 });
      expect(call.into.width).toBeLessThanOrEqual(rect.w - 4);
      expect(call.into.height).toBeLessThanOrEqual(rect.h - 4);
    }
    expect(calls.find((c) => c.name === "painting")?.into).toEqual({ width: 32, height: 16 });
  });

  it("draws the entry picture at half size inside the box, with the text beside it", () => {
    const d = new Decor();
    for (const id of ALL) d.own(id);
    const box = thingsBox();
    for (const e of d.entries().filter((x) => x.item.kind === "rug")) {
      const { sprite } = entryLayout(e);
      expect([sprite.w, sprite.h]).toEqual([e.item.w / 2, e.item.h / 2]);
      expect(sprite.x + sprite.w).toBeLessThanOrEqual(box.x + box.w);
      expect(sprite.y + sprite.h).toBeLessThanOrEqual(box.y + box.h);
    }
  });
});
