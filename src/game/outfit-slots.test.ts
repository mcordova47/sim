import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { OutfitSlotsActivity } from "./activities/outfit-slots";
import { Decor, parseDecor } from "./decor";
import { DESKTOP_VIEW, NARROW_VIEW, OUTFIT_OCCASIONS } from "./config";
import { Game } from "./game";
import { autoFill, parseEquipped, resolveSlot } from "./outfit-slots";
import { OUTFITS, OUTFIT_SLOTS, SLOT_STYLES, outfitItemId, slotOfItem, slotTakes } from "./outfits";
import { emptyDoc, NOW } from "./sync/gen";
import { mergeSaves, normaliseDoc, type SyncDoc } from "./sync/merge";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";

// Issue 175: outfit slots (docs/outfit-slots-design.md; Marc's answers d1 to d9 in issue 164).

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const dir = (d: "up" | "down" | "left" | "right"): Controls => ({ ...NO_INPUT, dirPressed: d, dir: d });
const HOODIE = "outfit-casual-hoodie";
const CARDIGAN = "outfit-casual-cardigan";
const PJ = "outfit-pajamas";
const STRIPED = "outfit-pajamas-striped";
const ROBE = "outfit-pajamas-robe";
const OUT = "outfit-out";

function decorWith(...ids: string[]): Decor {
  const d = new Decor();
  for (const id of ids) d.own(id);
  return d;
}
const worn = (d: Decor) => d.heldIn("worn")?.id;

describe("slot data", () => {
  it("every style belongs to exactly one slot, so each outfit has one place", () => {
    for (const o of OUTFITS) expect(OUTFIT_SLOTS.filter((s) => s.styles.includes(o.style)).length, o.id).toBe(1);
    expect(OUTFIT_SLOTS.map((s) => s.id)).toEqual(["everyday", "pajamas", "robe", "out"]);
    expect(SLOT_STYLES).toEqual({ everyday: ["home", "casual"], pajamas: ["pajamas"], robe: ["robe"], out: ["out"] });
  });

  it("the bathrobe is the only robe; the two pajamas stay pajamas and cannot go in ROBE", () => {
    expect(OUTFITS.filter((o) => o.style === "robe").map((o) => o.id)).toEqual(["pajamas-robe"]);
    expect(slotTakes("robe", ROBE)).toBe(true);
    expect(slotTakes("robe", PJ)).toBe(false);
    expect(slotTakes("robe", STRIPED)).toBe(false);
    expect(slotTakes("pajamas", ROBE)).toBe(false);
    expect(slotTakes("everyday", OUT)).toBe(false);
    expect(slotOfItem(ROBE)).toBe("robe");
    expect(slotOfItem("outfit-nope")).toBeUndefined();
  });

  it("the occasions are sleep to PAJAMAS and shower to ROBE, and name real tasks and slots", () => {
    expect(OUTFIT_OCCASIONS).toEqual({ sleep: "pajamas", shower: "robe" });
    for (const id of Object.keys(OUTFIT_OCCASIONS)) expect(TASKS.some((t) => t.id === id)).toBe(true);
  });
});

describe("resolving, auto-fill and repair (pure)", () => {
  const owned = new Set(["outfit-home", HOODIE, CARDIGAN, PJ, STRIPED]);
  it("auto-fills each empty slot with the first owned outfit it takes, never replacing", () => {
    const e = { everyday: HOODIE } as Record<string, string>;
    expect(autoFill(e, owned)).toBe(true);
    expect(e).toEqual({ everyday: HOODIE, pajamas: PJ });
    expect(autoFill(e, owned)).toBe(false);
  });

  it("an empty slot resolves to the EVERYDAY outfit, then to the home clothes", () => {
    expect(resolveSlot({ everyday: HOODIE }, "robe")).toBe(HOODIE);
    expect(resolveSlot({ everyday: HOODIE, robe: ROBE }, "robe")).toBe(ROBE);
    expect(resolveSlot({}, "out")).toBe("outfit-home");
  });

  it("keeps only known slots with an owned outfit of a style the slot takes, and survives junk", () => {
    expect(parseEquipped({ everyday: HOODIE, pajamas: HOODIE, robe: ROBE, out: OUT, nope: PJ, x: 5 }, owned)).toEqual({ everyday: HOODIE });
    for (const junk of [null, undefined, 3, "x", [], [1], { everyday: 7 }, { everyday: "a".repeat(500) }]) expect(parseEquipped(junk, owned)).toEqual({});
  });
});

describe("the decor store", () => {
  it("a fresh game saves exactly what it always did, and wears the home clothes", () => {
    const d = new Decor();
    expect(Object.keys(d.toJSON())).toEqual(["owned", "placed"]);
    expect(d.equippedIn("everyday")).toBe("outfit-home");
    expect(worn(d)).toBe("outfit-home");
  });

  it("an outfit that arrives fills its empty slot by itself, and never replaces what is equipped", () => {
    const d = decorWith(PJ);
    expect(d.equippedIn("pajamas")).toBe(PJ);
    d.own(STRIPED);
    expect(d.equippedIn("pajamas")).toBe(PJ);
    d.own(ROBE);
    expect(d.equippedIn("robe")).toBe(ROBE);
    expect(d.equippedIn("out")).toBeUndefined();
  });

  it("an old save without the field seeds EVERYDAY with the outfit worn now", () => {
    const d = new Decor();
    d.load({ owned: [HOODIE], placed: { worn: HOODIE } });
    expect(d.equippedIn("everyday")).toBe(HOODIE);
    expect(worn(d)).toBe(HOODIE);
    // Worn pajamas do not fit EVERYDAY: it falls back to the home clothes.
    d.load({ owned: [PJ], placed: { worn: PJ } });
    expect(d.equippedIn("everyday")).toBe("outfit-home");
    expect(d.equippedIn("pajamas")).toBe(PJ);
    // Nothing worn but the default: nothing is seeded into the save.
    expect(parseDecor({ owned: [], placed: {} }).outfits).toBeUndefined();
  });

  it("equips, saves and reloads; the equipped slot being worn moves `worn` at once", () => {
    const d = decorWith(HOODIE, CARDIGAN, PJ, STRIPED);
    expect(d.equip("everyday", CARDIGAN)).toBe(true);
    expect(worn(d)).toBe(CARDIGAN);
    expect(d.equip("pajamas", STRIPED)).toBe(true);
    expect(worn(d)).toBe(CARDIGAN);
    expect(d.equip("pajamas", HOODIE)).toBe(false);
    expect(d.equip("robe", ROBE)).toBe(false);
    const saved = JSON.parse(JSON.stringify(d.toJSON()));
    expect(saved.outfits.equipped).toMatchObject({ everyday: CARDIGAN, pajamas: STRIPED });
    const e = new Decor();
    e.load(saved);
    expect(e.equippedIn("everyday")).toBe(CARDIGAN);
    expect(e.equippedIn("pajamas")).toBe(STRIPED);
    expect(worn(e)).toBe(CARDIGAN);
  });

  it("repairs a junk or stale field on load (an outfit that is not owned loses its entry, and auto-fill refills it)", () => {
    const d = new Decor();
    d.load({ owned: [PJ], placed: {}, outfits: { equipped: { pajamas: STRIPED, out: OUT, robe: PJ, zzz: PJ } } });
    expect(d.equippedIn("pajamas")).toBe(PJ);
    expect(d.equippedIn("out")).toBeUndefined();
    expect(d.equippedIn("robe")).toBeUndefined();
    for (const junk of [null, 5, "x", [], { equipped: 3 }, { equipped: [PJ] }]) {
      expect(() => d.load({ owned: [], placed: {}, outfits: junk })).not.toThrow();
      expect(d.equippedIn("everyday")).toBe("outfit-home");
    }
  });

  it("wearing a slot puts on its outfit; an empty slot puts on EVERYDAY's", () => {
    const d = decorWith(HOODIE, PJ);
    d.equip("everyday", HOODIE);
    d.wearSlot("pajamas");
    expect(worn(d)).toBe(PJ);
    expect(d.wornSlot()).toBe("pajamas");
    d.wearSlot("robe");
    expect(worn(d)).toBe(HOODIE);
    d.wearSlot("out");
    expect(worn(d)).toBe(HOODIE);
  });
});

describe("device sync keeps the equipped slots", () => {
  const withOutfits = (device: string, equipped: Record<string, string>, owned: string[], activeAt = NOW): SyncDoc => {
    const doc = emptyDoc();
    doc.device = device;
    doc.activeAt = activeAt;
    doc.progress.decor = { owned: [...doc.progress.decor.owned, ...owned], placed: {}, outfits: { equipped } };
    return doc;
  };
  const normalised = (doc: SyncDoc): SyncDoc => {
    const r = normaliseDoc(JSON.parse(JSON.stringify(doc)));
    if (!r.ok) throw new Error("not read");
    return r.doc;
  };

  it("normalising a document keeps them (and drops stale or unowned ones)", () => {
    const doc = normalised(withOutfits("aaa", { everyday: HOODIE, pajamas: PJ, robe: ROBE, junk: PJ }, [HOODIE, PJ]));
    expect(doc.progress.decor.outfits).toEqual({ equipped: { everyday: HOODIE, pajamas: PJ } });
  });

  it("a merge takes the newer side's equipped slots, keeping what the union owns, and is the same both ways round", () => {
    const a = normalised(withOutfits("aaa", { everyday: HOODIE }, [HOODIE], NOW - 1000));
    const b = normalised(withOutfits("bbb", { everyday: CARDIGAN, pajamas: PJ }, [CARDIGAN, PJ], NOW));
    const m = mergeSaves(a, b, NOW);
    expect(m.progress.decor.outfits).toEqual({ equipped: { everyday: CARDIGAN, pajamas: PJ } });
    expect(mergeSaves(b, a, NOW).progress.decor.outfits).toEqual(m.progress.decor.outfits);
    expect([...m.progress.decor.owned]).toEqual(expect.arrayContaining([HOODIE, CARDIGAN, PJ]));
    // Then a game that loads the merged save is in the same outfits.
    const d = new Decor();
    d.load(JSON.parse(JSON.stringify(m.progress.decor)));
    expect(d.equippedIn("everyday")).toBe(CARDIGAN);
    expect(d.equippedIn("pajamas")).toBe(PJ);
  });

  it("a save with none is untouched (no field appears)", () => {
    const doc = normalised(emptyDoc());
    expect(doc.progress.decor.outfits).toBeUndefined();
    expect("outfits" in mergeSaves(doc, doc, NOW).progress.decor).toBe(false);
  });
});

describe("the list activity", () => {
  const open = (d: Decor) => new OutfitSlotsActivity(d);
  const rig = () => {
    const d = decorWith(HOODIE, CARDIGAN, PJ, STRIPED, ROBE, OUT);
    return { d, a: open(d) };
  };

  it("starts on the slot you wear, up and down choose a slot (wrapping), and the outfit is previewed on you", () => {
    const { d, a } = rig();
    expect(a.slot.id).toBe("everyday");
    a.update(dt, dir("down"));
    expect(a.slot.id).toBe("pajamas");
    expect(d.shownIn("worn")?.id).toBe(PJ);
    expect(worn(d)).toBe("outfit-home");
    a.update(dt, dir("up"));
    a.update(dt, dir("up"));
    expect(a.slot.id).toBe("out");
    expect(d.shownIn("worn")?.id).toBe(OUT);
  });

  it("left and right change the equipped outfit, wrapping; a slot with one outfit does nothing", () => {
    const { d, a } = rig();
    a.update(dt, dir("right"));
    expect(d.equippedIn("everyday")).toBe(CARDIGAN);
    expect(d.shownIn("worn")?.id).toBe(CARDIGAN);
    a.update(dt, dir("left"));
    expect(d.equippedIn("everyday")).toBe("outfit-home");
    a.update(dt, dir("left"));
    expect(d.equippedIn("everyday")).toBe(HOODIE);
    a.update(dt, dir("down"));
    a.update(dt, dir("down"));
    a.update(dt, dir("right"));
    expect(d.equippedIn("robe")).toBe(ROBE);
  });

  it("E wears the slot and ends quietly; Escape leaves what you wear (equipment changes stay)", () => {
    const { d, a } = rig();
    a.update(dt, dir("down"));
    a.update(dt, dir("right"));
    a.update(dt, press);
    expect(a.done).toBe(true);
    expect(a.result).toMatchObject({ completed: false, quiet: true });
    expect(worn(d)).toBe(STRIPED);
    expect(d.previewing).toBe(false);

    const r = rig();
    r.a.update(dt, dir("right"));
    r.a.update(dt, dir("down"));
    r.a.update(dt, esc);
    expect(r.a.done).toBe(true);
    // EVERYDAY was the worn slot, so its change followed at once; the preview is gone.
    expect(worn(r.d)).toBe(CARDIGAN);
    expect(r.d.previewing).toBe(false);
    const q = rig();
    q.a.update(dt, dir("down"));
    q.a.update(dt, esc);
    expect(worn(q.d)).toBe("outfit-home");
  });

  it("an empty slot puts on the EVERYDAY clothes, and an empty GOING OUT is still listed", () => {
    const d = decorWith(HOODIE);
    d.equip("everyday", HOODIE);
    d.wearSlot("everyday");
    const a = open(d);
    for (let i = 0; i < 3; i++) a.update(dt, dir("down"));
    expect(a.slot.id).toBe("out");
    expect(d.shownIn("worn")?.id).toBe(HOODIE);
    a.update(dt, press);
    expect(worn(d)).toBe(HOODIE);
  });
});

describe("drawing the list", () => {
  afterEach(() => vi.unstubAllGlobals());
  // Records the filled rectangles (the box is the first one in the border colour) and every drawn string.
  function render(view: { width: number; height: number }, avoid?: { x: number; y: number; w: number; h: number }, cursorDowns = 0) {
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const ctx = new Proxy({}, { get: (_t, prop) => (prop === "fillRect" ? (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h }) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const d = decorWith(HOODIE, PJ, ROBE, OUT);
    const a = new OutfitSlotsActivity(d);
    for (let i = 0; i < cursorDowns; i++) a.update(dt, dir("down"));
    a.draw(ctx, view, avoid);
    return { box: rects[0], a };
  }

  it("the box stays inside the screen on the desktop view and the phone view", () => {
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      for (const downs of [0, 1, 2, 3]) {
        const { box } = render(view, undefined, downs);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(view.width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.h).toBeLessThanOrEqual(view.height);
      }
    }
  });

  it("the phone's box is 105 px high (two rows per slot) and goes to the top when the player is low", () => {
    const low = render(NARROW_VIEW, { x: 100, y: 150, w: 16, h: 16 });
    const high = render(NARROW_VIEW, { x: 100, y: 40, w: 16, h: 16 });
    expect(low.box.h).toBe(105);
    expect(low.box.y).toBe(4);
    expect(high.box.y).toBe(NARROW_VIEW.height - 4 - 105);
    // Never over the player.
    expect(low.box.y + low.box.h).toBeLessThan(150);
    expect(high.box.y).toBeGreaterThan(56);
  });

  it("an outfit row fits the phone's inner width (180 px) for the longest outfit name, with its arrows", () => {
    const longest = Math.max(...OUTFITS.map((o) => o.name.length));
    expect((longest + 4) * 6 - 1 + 12).toBeLessThanOrEqual(180);
  });
});

// A one-room game with one task in front of the player, started by a press.
function room(decor: Decor, task: "sleep" | "shower" | "nap") {
  const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: [task] } }, { tasks: TASKS });
  const game = new Game({ ...level, facing: "right" }, { random: () => 0.5, decor });
  game.state.applyEffects([{ var: "energy", set: 20 }, { var: "clock", set: task === "sleep" ? 22 : 13 }]);
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  return game;
}
const finish = (game: Game, max = 60 * 14) => {
  for (let i = 0; i < max && game.interaction.active; i++) game.update(dt, NO_INPUT);
  game.update(dt, NO_INPUT);
};
const owner = () => decorWith(HOODIE, PJ, ROBE);

describe("the occasions", () => {
  it("finishing the sleep task puts you in PAJAMAS, and you stay in them (no timer)", () => {
    const d = owner();
    const game = room(d, "sleep");
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("sleep");
    expect(worn(d)).toBe("outfit-home");
    finish(game);
    expect(worn(d)).toBe(PJ);
    expect(game.state.get("outfit")).toBe(OUTFITS.findIndex((o) => outfitItemId(o) === PJ));
    // A long day passes: nothing changes the clothes back.
    for (let i = 0; i < 60 * 120; i++) game.update(dt, NO_INPUT);
    expect(worn(d)).toBe(PJ);
  });

  it("finishing the shower task puts you in ROBE; with ROBE empty you are in the EVERYDAY outfit", () => {
    const d = owner();
    const game = room(d, "shower");
    game.update(dt, press);
    finish(game);
    expect(worn(d)).toBe(ROBE);

    const e = decorWith(HOODIE, PJ);
    e.equip("everyday", HOODIE);
    e.wearSlot("pajamas");
    const g2 = room(e, "shower");
    g2.update(dt, press);
    finish(g2);
    expect(worn(e)).toBe(HOODIE);
  });

  it("a manual change sticks, and the next occasion wins over it", () => {
    const d = owner();
    const game = room(d, "shower");
    d.wearSlot("everyday");
    game.update(dt, press);
    finish(game);
    expect(worn(d)).toBe(ROBE);
    d.wearSlot("everyday");
    for (let i = 0; i < 60 * 30; i++) game.update(dt, NO_INPUT);
    expect(worn(d)).toBe("outfit-home");
  });

  it("a nap changes nothing", () => {
    const d = owner();
    const game = room(d, "nap");
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("nap");
    finish(game);
    expect(worn(d)).toBe("outfit-home");
    expect(game.pendingOccasionForTest()).toBeNull();
  });

  it("Escape in the sleep scene or the shower fires nothing", () => {
    for (const task of ["sleep", "shower"] as const) {
      const d = owner();
      const game = room(d, task);
      game.update(dt, press);
      for (let i = 0; i < 30; i++) game.update(dt, NO_INPUT);
      expect(game.interaction.active).not.toBeNull();
      game.update(dt, esc);
      finish(game, 10);
      expect(game.interaction.active).toBeNull();
      expect(worn(d)).toBe("outfit-home");
    }
  });

  it("never changes clothes while a task, a dialog or a pose is active: it waits, then applies", () => {
    const d = owner();
    const game = room(d, "shower");
    game.occasion("sleep");
    // A task is not running yet, so it applies at once on the next update...
    game.update(dt, NO_INPUT);
    expect(worn(d)).toBe(PJ);
    // ...but not while one is running.
    d.wearSlot("everyday");
    game.update(dt, press);
    expect(game.interaction.active).not.toBeNull();
    game.occasion("shower");
    for (let i = 0; i < 20; i++) game.update(dt, NO_INPUT);
    expect(game.interaction.active).not.toBeNull();
    expect(worn(d)).toBe("outfit-home");
    finish(game);
    expect(worn(d)).toBe(ROBE);
  });

  it("an unknown task id is no occasion", () => {
    const d = owner();
    const game = room(d, "nap");
    game.occasion("coffee");
    game.update(dt, NO_INPUT);
    expect(worn(d)).toBe("outfit-home");
  });
});
