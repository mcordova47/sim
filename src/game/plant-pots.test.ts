import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { PotSlotsActivity } from "./activities/pot-slots";
import type { ActivityHost } from "./activity";
import { APARTMENT } from "./apartment";
import { DESKTOP_VIEW, NARROW_VIEW } from "./config";
import { Decor, fits, parseDecor, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, type DecorData, type DecorItem, type DecorSlot } from "./decor-data";
import { itemPool } from "./encounter-draw";
import { Game } from "./game";
import { emptyDoc, NOW } from "./sync/gen";
import { mergeSaves, normaliseDoc, type SyncDoc } from "./sync/merge";
import { TASKS } from "./tasks";

// Issue 182: the three pots on the bookshelf (docs/plant-pots-design.md; Marc's answers in issues 179 and 182).

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const dir = (d: "up" | "down" | "left" | "right"): Controls => ({ ...NO_INPUT, dirPressed: d, dir: d });
const slot = (id: string) => DECOR_SLOTS.find((s) => s.id === id)!;
const item = (id: string) => DECOR_DATA.items.find((i) => i.id === id)!;
const LIVE = ["plant-snake", "plant-pothos", "plant-monstera", "plant-spider", "plant-pot-empty"];
const DRIED = ["plant-vase-dried", "plant-vase-empty", "plant-dried", "plant-pampas", "plant-lavender", "plant-eucalyptus"];
const decorWith = (...ids: string[]) => {
  const d = new Decor();
  for (const id of ids) d.own(id);
  return d;
};
const host = { setState: vi.fn() } as unknown as ActivityHost;

describe("the three pots (data)", () => {
  it("are the vase, the bowl and the plant pot at the design's places, with the plant pot's id kept", () => {
    expect(slot("pot-vase").area).toEqual({ x: 160, y: 16, w: 16, h: 16 });
    expect(slot("pot-bowl").area).toEqual({ x: 160, y: 32, w: 16, h: 16 });
    expect(slot("plant-shelf").area).toEqual({ x: 160, y: 52, w: 16, h: 16 });
    expect(slot("pot-vase").default).toBe("plant-vase-dried");
    expect(slot("pot-bowl").default).toBe("plant-bowl-empty");
    expect(slot("plant-shelf").default).toBe("plant-snake");
    // Only the plant pot is live: the care variables stay on it alone.
    for (const id of ["pot-vase", "pot-bowl"]) expect([slot(id).stageVar, slot(id).dryVar, slot(id).growthVar]).toEqual([undefined, undefined, undefined]);
    expect(validateDecorData(DECOR_DATA)).toBeUndefined();
  });

  it("each takes its own kind of plant, strictly", () => {
    for (const id of LIVE) expect(DECOR_SLOTS.filter((s) => fits(s, item(id))).map((s) => s.id), id).toEqual(["plant-shelf"]);
    for (const id of DRIED) expect(DECOR_SLOTS.filter((s) => fits(s, item(id))).map((s) => s.id), id).toEqual(["pot-vase"]);
    expect(DECOR_SLOTS.filter((s) => fits(s, item("plant-bowl-empty"))).map((s) => s.id)).toEqual(["pot-bowl"]);
  });

  it("items that are not plants are not affected, and a plant with no plantKind fits no pot", () => {
    const pots = DECOR_SLOTS.filter((s) => s.plantKinds);
    expect(pots.length).toBe(3);
    const trinketSlot: DecorSlot = { ...slot("trinket-desk"), plantKinds: ["house"] };
    expect(fits(trinketSlot, { id: "trinket-x", name: "X", kind: "trinket", sprite: "x", w: 16, h: 16 })).toBe(true);
    const bare: DecorItem = { id: "plant-x", name: "X", kind: "plant", sprite: "x", w: 16, h: 16 };
    for (const s of pots) expect(fits(s, bare)).toBe(false);
  });

  it("validation names the problems", () => {
    const bad = (items: DecorItem[], slots: DecorSlot[] = DECOR_SLOTS) => () => validateDecorData({ slots, items, families: DECOR_DATA.families } as DecorData);
    expect(bad([...DECOR_ITEMS, { id: "plant-x", name: "X", kind: "plant", sprite: "x", w: 16, h: 16 }])).toThrow(/no plantKind/);
    expect(bad([...DECOR_ITEMS, { id: "art-x", name: "X", kind: "art", plantKind: "low", sprite: "x", w: 16, h: 16 }])).toThrow(/not a plant/);
    expect(bad([...DECOR_ITEMS, { id: "art-y", name: "X", kind: "art", empty: true, sprite: "x", w: 16, h: 16 }])).toThrow(/marked empty/);
    expect(bad(DECOR_ITEMS, DECOR_SLOTS.map((s) => (s.id === "pot-vase" ? { ...s, via: "nope" } : s)))).toThrow(/unknown slot "nope"/);
    expect(bad(DECOR_ITEMS, DECOR_SLOTS.map((s) => (s.id === "art-bed" ? { ...s, plantKinds: ["low" as const] } : s)))).toThrow(/does not take plants/);
  });

  it("the pots are drawn where the slots are, in the order vase, bowl, plant (so the plant is on top)", () => {
    const main = APARTMENT.rooms.main;
    expect(() => new Decor().checkLevel(main)).not.toThrow();
    const order = main.props!.filter((p) => p.on.name === "cube bookshelf").map((p) => p.slot);
    expect(order).toEqual(["pot-vase", "pot-bowl", "plant-shelf"]);
    expect(new Decor().swapProblems(main)).toEqual([]);
  });
});

describe("the empty pots", () => {
  it("are three still items owned from the start, with the `empty` flag and no new prompt on a fresh game", () => {
    const d = new Decor();
    for (const id of ["plant-vase-empty", "plant-bowl-empty", "plant-pot-empty"]) {
      expect(item(id).empty, id).toBe(true);
      expect(item(id).family, id).toBeUndefined();
      expect(d.owns(id), id).toBe(true);
      expect(item(id).how, id).toBe("start");
    }
    for (const s of ["pot-vase", "pot-bowl", "plant-shelf"]) expect(d.canChange(s), s).toBe(false);
    expect(d.canChange("plant-shelf")).toBe(false);
  });

  it("do not count as spares, but a real spare for any pot offers the one list (and the empties are in it)", () => {
    const d = decorWith("plant-pampas");
    expect(d.canChange("plant-shelf")).toBe(true);
    expect(d.groupOf("plant-shelf")).toEqual(["pot-vase", "pot-bowl", "plant-shelf"]);
    expect(d.choices("pot-vase").map((i) => i.id)).toEqual(["plant-vase-dried", "plant-vase-empty", "plant-dried", "plant-pampas"].filter((id) => d.owns(id)));
    expect(d.choices("plant-shelf").map((i) => i.id)).toEqual(["plant-snake", "plant-pot-empty"]);
    // The arrangement it replaced is a real spare in turn, so the list stays offered (you can swap back).
    d.place("pot-vase", "plant-pampas");
    expect(d.canChange("plant-shelf")).toBe(true);
    // That is the only real spare in the inventory (the empty pots are never counted).
    expect(d.inventory().filter((i) => !i.empty).map((i) => i.id)).toEqual(["plant-vase-dried"]);
  });

  it("an empty pot can be put in any time it is owned, and a pot can be emptied again", () => {
    const d = decorWith("plant-pampas");
    expect(d.place("pot-vase", "plant-vase-empty")).toBe(true);
    expect(d.itemIn("pot-vase").name).toBe("EMPTY VASE");
    expect(d.place("plant-shelf", "plant-pot-empty")).toBe(true);
    expect(d.isLive("plant-shelf")).toBe(false);
    // The empty pot freezes the plant pot's variables, as any still item does (it replaces parking dried flowers there).
    expect(d.frozenVars().has("plantDry")).toBe(true);
    // The wrong pot's empty item is refused.
    expect(d.place("pot-bowl", "plant-vase-empty")).toBe(false);
    expect(d.place("plant-shelf", "plant-bowl-empty")).toBe(false);
  });

  it("the THINGS page gets four ALREADY HERE lines (the three empties and the vase arrangement)", () => {
    const entries = new Decor().entries();
    const here = entries.filter((e) => e.from === "FROM: ALREADY HERE" && e.item.kind === "plant").map((e) => e.item.id).sort();
    expect(here).toEqual(["plant-bowl-empty", "plant-pot-empty", "plant-snake", "plant-vase-dried", "plant-vase-empty"]);
  });

  it("are never sold: the item pool leaves out every starting item, and each plant it does sell fits a pot", () => {
    const pool = itemPool(DECOR_DATA.items);
    for (const id of ["plant-vase-dried", "plant-vase-empty", "plant-bowl-empty", "plant-pot-empty"]) expect(pool.some((p) => p.id === id), id).toBe(false);
    const plants = pool.filter((p) => p.kind === "plant");
    expect(plants.length).toBeGreaterThan(0);
    for (const p of plants) expect(DECOR_SLOTS.some((s) => fits(s, item(p.id))), p.id).toBe(true);
  });
});

describe("saves and the migration", () => {
  it("a fresh game saves what it always did, plus the empties as owned", () => {
    const save = new Decor().toJSON();
    expect(save.placed).toEqual({});
    expect(save.owned).toEqual(expect.arrayContaining(["plant-vase-dried", "plant-bowl-empty", "plant-vase-empty", "plant-pot-empty", "plant-snake"]));
  });

  it("an old save with a dried item in the plant pot moves it to the vase", () => {
    for (const id of ["plant-dried", "plant-pampas", "plant-lavender", "plant-eucalyptus"]) {
      const save = parseDecor({ owned: ["art-barn", id], placed: { "plant-shelf": id } });
      expect(save.placed, id).toEqual({ "pot-vase": id });
      const d = new Decor();
      d.load({ owned: ["art-barn", id], placed: { "plant-shelf": id } });
      expect(d.itemIn("pot-vase").id).toBe(id);
      expect(d.itemIn("plant-shelf").id).toBe("plant-snake");
      expect(d.inventory().map((i) => i.id)).toContain("plant-vase-dried");
    }
  });

  it("the migration does not overwrite what the save already placed in the vase, and is tolerant of junk", () => {
    expect(parseDecor({ owned: ["plant-dried", "plant-pampas"], placed: { "plant-shelf": "plant-dried", "pot-vase": "plant-pampas" } }).placed).toEqual({ "pot-vase": "plant-pampas" });
    // Not owned, unknown, wrong type: all fall back to the defaults.
    for (const bad of [{ "plant-shelf": "plant-dried" }, { "plant-shelf": 5 }, { "plant-shelf": null }, { "plant-shelf": "plant-nope" }, { "plant-shelf": "art-barn" }, { "pot-bowl": "plant-snake" }, { "pot-vase": "plant-pothos" }]) {
      expect(parseDecor({ owned: [], placed: bad }).placed, JSON.stringify(bad)).toEqual({});
    }
    // A live plant never moves anywhere: a house plant in the vase is simply refused.
    expect(parseDecor({ owned: ["plant-pothos"], placed: { "pot-vase": "plant-pothos" } }).placed).toEqual({});
  });

  it("a placement round trips through the save, and through a device merge (placed travels whole with the newer side)", () => {
    const a = decorWith("plant-pampas", "plant-pothos");
    a.place("pot-vase", "plant-pampas");
    a.place("pot-bowl", "plant-bowl-empty");
    a.place("plant-shelf", "plant-pothos");
    const saved = JSON.parse(JSON.stringify(a.toJSON()));
    const b = new Decor();
    b.load(saved);
    expect(b.itemIn("pot-vase").id).toBe("plant-pampas");
    expect(b.itemIn("plant-shelf").id).toBe("plant-pothos");
    const doc = (device: string, activeAt: number, decor: unknown): SyncDoc => {
      const d = emptyDoc();
      d.device = device;
      d.activeAt = activeAt;
      d.progress.decor = decor as SyncDoc["progress"]["decor"];
      const r = normaliseDoc(JSON.parse(JSON.stringify(d)));
      if (!r.ok) throw new Error("not read");
      return r.doc;
    };
    const newer = doc("aaa", NOW, saved);
    const older = doc("bbb", NOW - 1000, new Decor().toJSON());
    for (const merged of [mergeSaves(newer, older, NOW), mergeSaves(older, newer, NOW)]) {
      expect(merged.progress.decor.placed).toEqual({ "pot-vase": "plant-pampas", "plant-shelf": "plant-pothos" });
      expect(merged.progress.decor.owned).toEqual(expect.arrayContaining(["plant-pampas", "plant-pothos"]));
    }
    // An old save from another device that shows the pampas in the plant pot reads through the same rule.
    const old = doc("ccc", NOW, { owned: ["plant-pampas"], placed: { "plant-shelf": "plant-pampas" } });
    expect(old.progress.decor.placed).toEqual({ "pot-vase": "plant-pampas" });
  });
});

describe("the Change plants task and list", () => {
  it("one task on the bookshelf covers the three pots; the vase and the bowl have none of their own", () => {
    const swaps = TASKS.filter((t) => t.decorSlot && ["pot-vase", "pot-bowl", "plant-shelf"].includes(t.decorSlot));
    expect(swaps.map((t) => t.id)).toEqual(["swap-plant-shelf"]);
    expect(swaps[0]).toMatchObject({ prompt: "Change plants", activity: { type: "pot-slots" }, points: 0, cooldown: 0 });
    const book = APARTMENT.rooms.main.pieces.find((p) => p.name === "cube bookshelf")!;
    expect(book).toBeDefined();
    expect(TASKS.some((t) => t.id === "swap-pot-vase" || t.id === "swap-pot-bowl")).toBe(false);
  });

  const open = (...owned: string[]) => {
    const d = decorWith(...owned);
    return { d, a: new PotSlotsActivity("plant-shelf", d, host) };
  };

  it("lists the pots north to south, starts on the vase, and up and down choose a pot (wrapping)", () => {
    const { a } = open("plant-pampas");
    expect(a.pots).toEqual(["pot-vase", "pot-bowl", "plant-shelf"]);
    expect(a.slot).toBe("pot-vase");
    a.update(dt, dir("up"));
    expect(a.slot).toBe("plant-shelf");
    a.update(dt, dir("down"));
    expect(a.slot).toBe("pot-vase");
  });

  it("left and right pick a plant for the pot and show it in the room, without placing it until E", () => {
    const { d, a } = open("plant-pampas");
    const before = JSON.stringify(d);
    a.update(dt, dir("right"));
    expect(d.shownIn("pot-vase")!.id).toBe("plant-vase-empty");
    expect(d.itemIn("pot-vase").id).toBe("plant-vase-empty");
    expect(d.heldIn("pot-vase")!.id).toBe("plant-vase-dried");
    expect(JSON.stringify(d)).toBe(before);
    expect(d.previewing).toBe(true);
    a.update(dt, dir("right"));
    expect(d.shownIn("pot-vase")!.id).toBe("plant-pampas");
    a.update(dt, dir("right")); // wraps
    expect(d.shownIn("pot-vase")!.id).toBe("plant-vase-dried");
    a.update(dt, dir("left")); // and back
    expect(d.shownIn("pot-vase")!.id).toBe("plant-pampas");
  });

  it("each pot keeps its own pick while you move between them, and E puts all of them up", () => {
    const { d, a } = open("plant-pampas");
    a.update(dt, dir("right"));
    a.update(dt, dir("right")); // vase: pampas
    a.update(dt, dir("down")); // bowl: only its own empty bowl, so nothing to pick
    a.update(dt, dir("right"));
    expect(d.shownIn("pot-bowl")!.id).toBe("plant-bowl-empty");
    a.update(dt, dir("down")); // plant pot: the empty pot
    a.update(dt, dir("left"));
    expect(d.shownIn("plant-shelf")!.id).toBe("plant-pot-empty");
    expect(d.shownIn("pot-vase")!.id).toBe("plant-pampas");
    a.update(dt, press);
    expect(a.done).toBe(true);
    expect(d.previewing).toBe(false);
    expect(d.heldIn("pot-vase")!.id).toBe("plant-pampas");
    expect(d.heldIn("plant-shelf")!.id).toBe("plant-pot-empty");
    expect(d.heldIn("pot-bowl")!.id).toBe("plant-bowl-empty");
    expect(d.inventory().map((i) => i.id)).toEqual(expect.arrayContaining(["plant-vase-dried", "plant-snake"]));
  });

  it("Escape leaves the room as it was", () => {
    const { d, a } = open("plant-pampas");
    const before = JSON.stringify(d);
    a.update(dt, dir("right"));
    a.update(dt, dir("down"));
    a.update(dt, dir("down"));
    a.update(dt, dir("right"));
    a.update(dt, esc);
    expect(a.done).toBe(true);
    expect(d.previewing).toBe(false);
    expect(JSON.stringify(d)).toBe(before);
  });

  it("a live plant put over a live plant starts small; a still one standing in the vase leaves the plant pot's state alone", () => {
    const setState = vi.fn();
    const d = decorWith("plant-pothos", "plant-pampas");
    const a = new PotSlotsActivity("plant-shelf", d, { setState } as unknown as ActivityHost);
    a.update(dt, dir("right")); // vase: empty vase
    a.update(dt, dir("down"));
    a.update(dt, dir("down")); // plant pot
    a.update(dt, dir("right")); // pot-empty
    a.update(dt, dir("right")); // pothos
    expect(d.shownIn("plant-shelf")!.id).toBe("plant-pothos");
    a.update(dt, press);
    expect(d.heldIn("plant-shelf")!.id).toBe("plant-pothos");
    expect(setState.mock.calls.map((c) => c[0]).sort()).toEqual(["plantDry", "plantGrowth", "plantStage"]);
    setState.mockClear();
    const b = new PotSlotsActivity("plant-shelf", d, { setState } as unknown as ActivityHost);
    b.update(dt, dir("right"));
    b.update(dt, press);
    expect(setState).not.toHaveBeenCalled();
  });

  it("ends quietly when nothing is left to change (a reset while it is open)", () => {
    const { d, a } = open("plant-pampas");
    a.update(dt, dir("right"));
    d.reset();
    a.update(dt, NO_INPUT);
    expect(a.done).toBe(true);
    expect(d.previewing).toBe(false);
  });

  it("the task is offered at the bookshelf only when a pot has a real spare, in the real game", () => {
    const make = (...owned: string[]) => new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor: decorWith(...owned), random: () => 0.5 });
    const task = APARTMENT.rooms.main.interactables.find((i) => i.id === "swap-plant-shelf")!;
    const hidden = (g: Game) => g.interaction.hidden?.(task);
    expect(hidden(make())).toBe(true);
    expect(hidden(make("plant-pampas"))).toBe(false);
    expect(hidden(make("plant-pothos"))).toBe(false);
  });
});

describe("the list on screen", () => {
  afterEach(() => vi.unstubAllGlobals());
  const draw = (view: { width: number; height: number }, downs: number) => {
    const texts: string[] = [];
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const ctx = new Proxy({}, { get: (_t, p) => (p === "fillRect" ? (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h }) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const a = new PotSlotsActivity("plant-shelf", decorWith("plant-pampas"), host);
    for (let i = 0; i < downs; i++) a.update(dt, dir("down"));
    a.draw(ctx, view);
    return { box: rects[0], texts };
  };

  it("the box stays inside the screen on the desktop view and the phone view", () => {
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      for (const downs of [0, 1, 2]) {
        const { box } = draw(view, downs);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(view.width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.h).toBeLessThanOrEqual(view.height);
      }
    }
  });
});
