import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { SwapDecorActivity } from "./activities/swap-decor";
import { Decor, parseDecor, validateDecorData } from "./decor";
import type { DecorData, DecorItem, DecorSlot } from "./decor-data";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { parseTileMap } from "./tilemap";
import { SWAP_PROMPT } from "./tasks";

// Issue 151: a slot with no default holds nothing until you put something in it. The real room has no
// such slot yet, so this test makes one (a shelf spot for trinkets) next to an ordinary art slot.

const SHELF: DecorSlot = { id: "shelf-test", room: "main", name: "SHELF SPOT", where: "ON THE SHELF", area: { x: 160, y: 0, w: 16, h: 16 }, kinds: ["trinket"], object: "shelf" };
const WALL: DecorSlot = { id: "wall-test", room: "main", name: "WALL SPOT", area: { x: 0, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-plain" };
const ITEMS: DecorItem[] = [
  { id: "art-plain", name: "PLAIN PRINT", kind: "art", sprite: "plain", w: 32, h: 16, how: "start" },
  { id: "art-spare", name: "SPARE PRINT", kind: "art", sprite: "spare", w: 32, h: 16 },
  { id: "trinket-bird", name: "TIN BIRD", kind: "trinket", sprite: "bird", w: 16, h: 16, glow: { radius: 10, alpha: 0.2 } },
  { id: "trinket-shell", name: "SHELL", kind: "trinket", sprite: "shell", w: 16, h: 16 },
];
const data = (): DecorData => ({ slots: [WALL, SHELF], items: ITEMS, families: {} });
const state = () => new ApartmentState(STATE_VARS);
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down" };
const esc: Controls = { ...NO_INPUT, cancelPressed: true };

function open(decor: Decor, slot = "shelf-test") {
  const states = new Map<string, number>();
  return new SwapDecorActivity(slot, decor, { setState: (id: string, v: number) => states.set(id, v) } as never);
}

describe("a slot with no default", () => {
  it("passes validation, starts empty and shows nothing", () => {
    expect(() => validateDecorData(data())).not.toThrow();
    const d = new Decor(data());
    expect(d.canBeEmpty("shelf-test")).toBe(true);
    expect(d.canBeEmpty("wall-test")).toBe(false);
    expect(d.shownIn("shelf-test")).toBeUndefined();
    expect(d.heldIn("shelf-test")).toBeUndefined();
    expect(d.lookAt("shelf-test", state())).toBeNull();
    expect(d.lookAt("wall-test", state())?.sprite).toBe("plain");
    expect(() => d.itemIn("shelf-test")).toThrow(/empty/);
    expect(d.starting()).toEqual(["art-plain"]);
    expect(d.toJSON().placed).toEqual({});
  });

  it("two empty slots do not trip the same-default check", () => {
    const other: DecorSlot = { ...SHELF, id: "shelf-test-2", area: { x: 176, y: 0, w: 16, h: 16 } };
    expect(() => validateDecorData({ ...data(), slots: [WALL, SHELF, other] })).not.toThrow();
  });

  it("is not offered a swap with nothing to put in it, and is offered once you own a fitting item", () => {
    const d = new Decor(data());
    expect(d.canChange("shelf-test")).toBe(false);
    d.own("trinket-bird");
    expect(d.canChange("shelf-test")).toBe(true);
  });

  it("puts a trinket in, takes it out with NOTHING (place(slot, null)) and keeps the item", () => {
    const d = new Decor(data());
    d.own("trinket-bird");
    expect(d.place("shelf-test", "trinket-bird")).toBe(true);
    expect(d.lookAt("shelf-test", state())?.sprite).toBe("bird");
    expect(d.shownIn("shelf-test")?.glow).toBeDefined();
    expect(d.toJSON().placed).toEqual({ "shelf-test": "trinket-bird" });
    expect(d.inventory().map((i) => i.id)).not.toContain("trinket-bird");
    // The slot still offers a way back to empty even with nothing else to choose.
    expect(d.canChange("shelf-test")).toBe(true);
    expect(d.place("shelf-test", null)).toBe(true);
    expect(d.shownIn("shelf-test")).toBeUndefined();
    expect(d.toJSON().placed).toEqual({});
    expect(d.owns("trinket-bird")).toBe(true);
    expect(d.inventory().map((i) => i.id)).toContain("trinket-bird");
    expect(d.place("shelf-test", null)).toBe(true); // already empty: fine, nothing changes
  });

  it("refuses NOTHING for a slot that has a default", () => {
    const d = new Decor(data());
    const plan = d.plan("wall-test", null);
    expect(plan).toMatchObject({ ok: false });
    expect(d.place("wall-test", null)).toBe(false);
    expect(d.shownIn("wall-test")?.id).toBe("art-plain");
  });

  it("previews NOTHING and putting something in without saving", () => {
    const d = new Decor(data());
    d.own("trinket-bird");
    d.place("shelf-test", "trinket-bird");
    expect(d.preview("shelf-test", null)).toBe(true);
    expect(d.shownIn("shelf-test")).toBeUndefined();
    expect(d.heldIn("shelf-test")?.id).toBe("trinket-bird");
    d.clearPreview();
    expect(d.shownIn("shelf-test")?.id).toBe("trinket-bird");
  });

  it("moves an item between two empty slots, and refuses to empty a slot that must hold something", () => {
    const other: DecorSlot = { ...SHELF, id: "shelf-test-2", area: { x: 176, y: 0, w: 16, h: 16 } };
    const d = new Decor({ ...data(), slots: [WALL, SHELF, other] });
    d.own("trinket-bird");
    d.place("shelf-test", "trinket-bird");
    expect(d.place("shelf-test-2", "trinket-bird")).toBe(true);
    expect(d.shownIn("shelf-test")).toBeUndefined();
    expect(d.shownIn("shelf-test-2")?.id).toBe("trinket-bird");
    // A slot with a default is never left empty by a swap.
    const art: DecorSlot = { id: "art-empty", room: "main", name: "ART SPOT", area: { x: 0, y: 32, w: 32, h: 16 }, kinds: ["art"] };
    const e = new Decor({ ...data(), slots: [WALL, art] });
    e.own("art-spare");
    e.place("wall-test", "art-spare");
    expect(e.plan("art-empty", "art-spare")).toMatchObject({ ok: false });
    expect(e.place("art-empty", "art-spare")).toBe(false);
    expect(e.shownIn("wall-test")?.id).toBe("art-spare");
  });

  it("saves and loads, and a hand-edited save is cut down, never an error", () => {
    const d = new Decor(data());
    d.own("trinket-bird");
    d.own("trinket-shell");
    d.place("shelf-test", "trinket-shell");
    const saved = JSON.parse(JSON.stringify(d.toJSON()));
    const back = new Decor(data());
    back.load(saved);
    expect(back.shownIn("shelf-test")?.id).toBe("trinket-shell");
    expect(back.toJSON().placed).toEqual({ "shelf-test": "trinket-shell" });
    for (const bad of [
      { owned: [], placed: { "shelf-test": "trinket-bird" } }, // not owned
      { owned: ["trinket-bird"], placed: { "shelf-test": "art-spare" } }, // does not fit
      { owned: ["art-spare"], placed: { "shelf-test": "nope", "wall-test": 5 } },
      { owned: ["trinket-bird"], placed: { "shelf-test": "trinket-bird", "wall-test": "trinket-bird" } }, // shown twice
      { owned: ["trinket-bird"], placed: { "gone-slot": "trinket-bird" } },
      "junk",
      null,
    ]) {
      expect(() => parseDecor(bad, data())).not.toThrow();
      const p = parseDecor(bad, data());
      expect(Object.keys(p.placed).every((k) => k === "shelf-test" || k === "wall-test")).toBe(true);
      expect(p.placed["shelf-test"] === undefined || p.owned.includes(p.placed["shelf-test"])).toBe(true);
    }
    expect(parseDecor({ owned: [], placed: { "shelf-test": "trinket-bird" } }, data()).placed).toEqual({});
    // Empty slot stays empty even when its neighbour has to fall back.
    expect(parseDecor({ owned: ["trinket-bird"], placed: {} }, data()).placed).toEqual({});
  });

  it("lists in the inventory: an item you own but is not shown says it is in the inventory", () => {
    const d = new Decor(data());
    d.own("trinket-shell");
    const row = d.entries().find((e) => e.item.id === "trinket-shell")!;
    expect(row.where).toBe("IN THE INVENTORY");
    expect(row.changeAt).toBe("CHANGE IT AT THE SHELF");
    d.place("shelf-test", "trinket-shell");
    expect(d.entries().find((e) => e.item.id === "trinket-shell")!.where).toBe("ON THE SHELF");
  });

  it("the swap list has NOTHING at the top, previews, puts up, and clears", () => {
    const d = new Decor(data());
    d.own("trinket-bird");
    d.own("trinket-shell");
    // Opens on NOTHING (the slot is empty), moving down previews the first item.
    let a = open(d);
    expect(a.done).toBe(false);
    expect(a.cursor).toBe(0);
    expect(a.note(null)).toBe("");
    a.update(0, down);
    expect(d.shownIn("shelf-test")?.id).toBe("trinket-bird");
    expect(d.heldIn("shelf-test")).toBeUndefined();
    a.update(0, esc);
    expect(a.done).toBe(true);
    expect(d.shownIn("shelf-test")).toBeUndefined();
    // Down then E puts the bird up.
    a = open(d);
    a.update(0, down);
    a.update(0, press);
    expect(d.heldIn("shelf-test")?.id).toBe("trinket-bird");
    // Open again: the cursor starts on the bird; up (wrap through) to NOTHING and E clears.
    a = open(d);
    expect(a.cursor).toBe(1);
    expect(a.note(null)).toBe("TIN BIRD GOES TO THE INVENTORY");
    a.update(0, { ...NO_INPUT, dirPressed: "up", dir: "up" });
    expect(a.cursor).toBe(0);
    a.update(0, press);
    expect(d.heldIn("shelf-test")).toBeUndefined();
    expect(d.owns("trinket-bird")).toBe(true);
  });

  it("a default slot's swap list has no NOTHING row", () => {
    const d = new Decor(data());
    d.own("art-spare");
    const a = open(d, "wall-test");
    expect(a.note(undefined)).toBe("");
    a.update(0, down);
    expect(d.shownIn("wall-test")?.id).toBe("art-spare");
  });
});

describe("a map object for an empty slot", () => {
  it("needs no sprite in the legend (it draws nothing until something is put there)", () => {
    const level = parseTileMap(["@S"], { S: { name: "shelf", slot: "shelf-test", solid: false } }, { id: "main" });
    expect(level.appearances).toHaveLength(1);
    expect(level.appearances![0]).toMatchObject({ slot: "shelf-test", variants: [] });
    expect(() => new Decor(data()).checkLevel({ ...level, appearances: [{ ...level.appearances![0], area: SHELF.area }] })).not.toThrow();
  });

  it("a legend entry with a slot and a sprite works as before", () => {
    const level = parseTileMap(["@S"], { S: { slot: "wall-test", sprite: "plain", solid: false } });
    expect(level.appearances![0].variants).toEqual([{ sprite: "plain" }]);
  });
});

describe("the new kinds", () => {
  it("each has a plain swap prompt and a slot of that kind validates", () => {
    expect(SWAP_PROMPT).toMatchObject({ trinket: "Change trinket", coffee: "Change coffee gear", outfit: "Change clothes", furniture: "Change furniture" });
    for (const kind of ["trinket", "coffee", "outfit", "furniture"] as const) {
      const slot: DecorSlot = { id: `${kind}-test`, room: "main", name: "TEST", area: { x: 0, y: 0, w: 16, h: 16 }, kinds: [kind] };
      const item: DecorItem = { id: `${kind}-one`, name: "ONE", kind, sprite: "one", w: 16, h: 16 };
      expect(() => validateDecorData({ slots: [slot], items: [item], families: {} })).not.toThrow();
    }
  });
});
