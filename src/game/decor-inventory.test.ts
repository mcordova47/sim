import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { APARTMENT } from "./apartment";
import { Decor, parseDecor } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, type DecorData, type DecorItem } from "./decor-data";
import { SwapDecorActivity } from "./activities/swap-decor";
import type { ActivityHost } from "./activity";
import { Deliveries } from "./deliveries";
import { Game } from "./game";
import { seeded } from "./particles/seeded";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

// Issue 073: an item is displayed in one place at a time; what you own and do
// not show is the inventory.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const TAB: Controls = { ...NO_INPUT, keys: ["Tab"] };
const dir = (d: "up" | "down"): Controls => ({ ...NO_INPUT, dirPressed: d, dir: d });

const shownIds = (d: Decor) => DECOR_SLOTS.map((s) => d.itemIn(s.id).id);
const realShownIds = (d: Decor) => DECOR_SLOTS.map((s) => d.placedIn(s.id).id);
const distinct = (ids: string[]) => new Set(ids).size === ids.length;

describe("the inventory", () => {
  it("is empty in a fresh game and is owned minus shown", () => {
    const d = new Decor();
    expect(d.inventory()).toEqual([]);
    d.own("art-test-barn");
    d.own("lamp-test-stool");
    expect(d.inventory().map((i) => i.id)).toEqual(["art-test-barn", "lamp-test-stool"]);
    expect(d.displayedAt("art-barn")?.id).toBe("art-table");
    expect(d.displayedAt("art-test-barn")).toBeUndefined();
  });

  it("Marc's walk: a new painting replaces the barn drawing, then the barn drawing replaces the gold abstract", () => {
    const d = new Decor();
    d.own("art-test-desk"); // the new painting arrives
    expect(d.place("art-table", "art-test-desk")).toBe(true);
    expect(d.itemIn("art-table").id).toBe("art-test-desk");
    expect(d.inventory().map((i) => i.id)).toEqual(["art-barn"]); // the replaced one is in the inventory
    expect(d.place("art-desk", "art-barn")).toBe(true);
    expect(d.itemIn("art-desk").id).toBe("art-barn");
    expect(d.inventory().map((i) => i.id)).toEqual(["art-abstract"]);
    expect(d.toJSON().placed).toEqual({ "art-table": "art-test-desk", "art-desk": "art-barn" });
    // The default is no longer always available: the barn drawing is just an owned item now, and the table can take the abstract.
    expect(d.place("art-table", "art-abstract")).toBe(true);
    expect(d.inventory().map((i) => i.id)).toEqual(["art-test-desk"]);
    expect(distinct(realShownIds(d))).toBe(true);
  });

  it("swaps two slots when the item is displayed elsewhere (and fresh ones stay put)", () => {
    const d = new Decor();
    expect(d.plan("art-table", "art-abstract")).toEqual({
      ok: true,
      changes: [{ slot: "art-table", item: "art-abstract" }, { slot: "art-desk", item: "art-barn" }],
    });
    expect(d.place("art-table", "art-abstract")).toBe(true);
    expect(d.itemIn("art-table").id).toBe("art-abstract");
    expect(d.itemIn("art-desk").id).toBe("art-barn");
    expect(d.inventory()).toEqual([]);
    expect(d.toJSON().placed).toEqual({ "art-table": "art-abstract", "art-desk": "art-barn" });
    // Swapping back is the default room again.
    expect(d.place("art-table", "art-barn")).toBe(true);
    expect(d.toJSON().placed).toEqual({});
  });

  it("placing the item that is already there changes nothing and does not announce", () => {
    const d = new Decor();
    let n = 0;
    d.onChange = () => n++;
    expect(d.place("art-table", "art-barn")).toBe(true);
    expect(n).toBe(0);
    d.place("art-table", "art-abstract");
    expect(n).toBe(1);
  });

  it("refuses, with a reason, a swap the other slot cannot take, and changes nothing: when the item here does not fit where the other is shown", () => {
    const art = (id: string, slots?: string[]): DecorItem => ({ id, name: id.toUpperCase().replace(/-/g, " "), kind: "art", sprite: id, w: 32, h: 16, slots });
    const data: DecorData = {
      slots: [
        { ...DECOR_SLOTS[0], default: "art-a" },
        { ...DECOR_SLOTS[1], default: "art-b" },
      ],
      items: [art("art-a", ["art-table"]), art("art-b", ["art-desk"]), art("art-x")],
      families: {},
    };
    const d = new Decor(data);
    d.own("art-x");
    d.place("art-desk", "art-x");
    const before = JSON.stringify(d);
    const plan = d.plan("art-table", "art-x");
    expect(plan).toEqual({ ok: false, reason: "ART A DOES NOT FIT ON THE DESK WALL" });
    expect(d.place("art-table", "art-x")).toBe(false);
    expect(d.preview("art-table", "art-x")).toBe(false);
    expect(JSON.stringify(d)).toBe(before);
    expect(d.canChange("art-table")).toBe(false); // nothing spare fits the table wall, so the task is not offered there
  });

  it("the preview shows both slots of a swap and is never saved", () => {
    const d = new Decor();
    expect(d.preview("art-table", "art-abstract")).toBe(true);
    expect(d.itemIn("art-table").id).toBe("art-abstract");
    expect(d.itemIn("art-desk").id).toBe("art-barn");
    expect(distinct(shownIds(d))).toBe(true);
    expect(d.placedIn("art-desk").id).toBe("art-abstract");
    expect(JSON.stringify(d)).toBe(JSON.stringify(new Decor()));
    d.clearPreview();
    expect(d.itemIn("art-desk").id).toBe("art-abstract");
  });

  it("a slot whose default is shown elsewhere is no longer 'always available'", () => {
    const d = new Decor();
    d.own("art-test-desk");
    d.place("art-table", "art-test-desk");
    d.place("art-desk", "art-barn");
    // The table's default (the barn drawing) is on the desk wall now, and the desk's default (gold abstract) is in the inventory.
    expect(d.displayedAt("art-barn")?.id).toBe("art-desk");
    expect(d.inventory().map((i) => i.id)).toEqual(["art-abstract"]);
    expect(distinct(realShownIds(d))).toBe(true);
  });

  it("survives a save and reload", () => {
    const d = new Decor();
    d.own("art-test-desk");
    d.place("art-table", "art-test-desk");
    d.place("art-desk", "art-barn");
    const copy = new Decor();
    copy.load(JSON.parse(JSON.stringify(d)));
    expect(copy.toJSON()).toEqual(d.toJSON());
    expect(copy.inventory().map((i) => i.id)).toEqual(["art-abstract"]);
  });

  it("deliveries never give an item you already own", () => {
    const d = new Decor();
    const deliveries = new Deliveries(d);
    expect(deliveries.deliver("art-barn", 0.5)).toBe(false);
    expect(deliveries.deliver("art-test-desk", 0.5)).toBe(true);
    d.own("art-test-barn");
    expect(deliveries.deliver("art-test-barn", 0.5)).toBe(false);
  });
});

describe("old and hand-edited saves", () => {
  const both = { owned: ["art-test-barn"], placed: { "art-table": "art-test-barn", "art-desk": "art-test-barn" } };

  it("an item placed in two slots stays in the first slot (table order); the later slot gets its default if free", () => {
    const parsed = parseDecor(both);
    expect(parsed.placed).toEqual({ "art-table": "art-test-barn" });
    const d = new Decor();
    d.load(both);
    expect(d.itemIn("art-desk").id).toBe("art-abstract");
    expect(distinct(realShownIds(d))).toBe(true);
  });

  it("when the later slot's default is taken, it shows the first free item that fits (a swap in effect)", () => {
    const raw = { owned: [], placed: { "art-desk": "art-barn" } };
    const d = new Decor();
    d.load(raw);
    expect(d.itemIn("art-desk").id).toBe("art-barn");
    expect(d.itemIn("art-table").id).toBe("art-abstract");
    expect(distinct(realShownIds(d))).toBe(true);
  });

  it("a placed default that another slot also claims, and anything else odd, never duplicates", () => {
    for (const raw of [
      { owned: [], placed: { "art-table": "art-barn", "art-desk": "art-barn" } },
      { owned: [], placed: { "art-desk": "art-abstract", "art-table": "art-abstract" } },
      { owned: ["lamp-test-stool"], placed: { "lamp-sofa": "lamp-test-stool", "plant-shelf": "lamp-test-stool" } },
      { owned: [], placed: { "art-bed": "art-barn", "art-table": "art-silkscreen" } },
      { owned: ["a"], placed: { "art-table": 5, nope: "a", "art-desk": null } },
      { owned: [], placed: [] },
      null,
      "junk",
    ]) {
      const d = new Decor();
      d.load(raw);
      expect(distinct(realShownIds(d)), JSON.stringify(raw)).toBe(true);
    }
  });
});

// A random walk over the real game: swaps, saves (also hand-edited with
// duplicates), reloads, Escape, and items arriving.
describe("fuzz: random swaps, saves, reloads and Escape on the real Game", () => {
  const swapIds = TASKS.filter((t) => t.decorSlot).map((t) => t.id);
  const ownedOf = (d: Decor) => new Set(d.toJSON().owned);

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    it(`seed ${seed}`, () => {
      const rand = seeded(seed);
      const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
      const storage = new FakeStorage();
      let decor = new Decor();
      let game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: rand });
      let feature = new AchievementsFeature(game, { storage, keys: undefined });
      const allIds = DECOR_DATA.items.map((i) => i.id);
      const reload = () => {
        decor = new Decor();
        game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: rand });
        feature = new AchievementsFeature(game, { storage, keys: undefined });
      };
      const standAt = (id: string) => {
        const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === id);
        if (!spot) return;
        game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
        game.update(dt, NO_INPUT);
      };
      for (let step = 0; step < 500; step++) {
        const roll = rand();
        const before = ownedOf(decor);
        const shownBefore = JSON.stringify(decor);
        let ownedMayChange = false;
        const listOpen = game.interaction.active?.item.decorSlot !== undefined;
        if (roll < 0.06) {
          decor.own(pick(allIds));
          ownedMayChange = true;
        } else if (roll < 0.14 && !listOpen) standAt(pick(swapIds));
        else if (roll < 0.2 && !listOpen) {
          for (let i = 0; i < 6 && !game.interaction.active; i++) {
            if (swapIds.includes(game.interaction.nearby?.id ?? "")) game.update(dt, press);
            else game.update(dt, TAB);
          }
        } else if (roll < 0.25) feature.save();
        else if (roll < 0.29) {
          feature.save();
          reload();
          ownedMayChange = true;
        } else if (roll < 0.33) {
          // A hand-edited save: random placements, duplicates and junk.
          feature.save();
          const saved = JSON.parse(storage.data.get("life.progress.v1")!);
          const placed: Record<string, unknown> = {};
          for (const s of DECOR_SLOTS) if (rand() < 0.7) placed[s.id] = rand() < 0.1 ? pick([7, null, "nope"]) : pick(allIds);
          saved.decor = { owned: rand() < 0.3 ? [pick(allIds), pick(allIds), 3] : saved.decor.owned, placed };
          storage.data.set("life.progress.v1", JSON.stringify(saved));
          reload();
          ownedMayChange = true;
        } else if (roll < 0.62) game.update(dt, dir(rand() < 0.5 ? "up" : "down"));
        else if (roll < 0.78) game.update(dt, press);
        else if (roll < 0.9) {
          const wasOpen = game.interaction.active?.item.decorSlot !== undefined && !game.dialogOpen && !game.inputLocked;
          game.update(dt, esc);
          if (wasOpen) {
            expect(decor.previewing, `step ${step}`).toBe(false);
            expect(JSON.stringify(decor), `step ${step}: Escape restores the room`).toBe(shownBefore);
          }
        } else game.update(dt, NO_INPUT);
        // Always: nothing is displayed twice (as placed, and as the room draws it, preview included).
        expect(distinct(realShownIds(decor)), `step ${step} placed ${JSON.stringify(decor)}`).toBe(true);
        expect(distinct(shownIds(decor)), `step ${step} preview`).toBe(true);
        // Every slot shows something it owns that fits it.
        for (const s of DECOR_SLOTS) {
          const item = decor.placedIn(s.id);
          expect(decor.owns(item.id), `step ${step}`).toBe(true);
          expect(item.kind === s.kinds[0] || s.kinds.includes(item.kind)).toBe(true);
        }
        // Swapping never loses or gains an item.
        if (!ownedMayChange) expect(ownedOf(decor), `step ${step}`).toEqual(before);
        // The inventory is exactly owned, known and not shown.
        const inv = new Set(decor.inventory().map((i) => i.id));
        for (const id of allIds) expect(inv.has(id), `step ${step} ${id}`).toBe(decor.owns(id) && !decor.displayedAt(id));
        // A preview exists only while a list is open.
        if (decor.previewing) expect(game.interaction.active?.item.decorSlot, `step ${step}`).toBeDefined();
      }
    });
  }
});

describe("the swap list when a swap is refused", () => {
  it("E stays in the list, says why, and changes nothing; Escape leaves", () => {
    const art = (id: string, slots?: string[]): DecorItem => ({ id, name: id.toUpperCase().replace(/-/g, " "), kind: "art", sprite: id, w: 32, h: 16, slots });
    const data: DecorData = {
      slots: [{ ...DECOR_SLOTS[0], default: "art-a" }, { ...DECOR_SLOTS[1], default: "art-b" }],
      items: [art("art-a", ["art-table"]), art("art-b", ["art-desk"]), art("art-x")],
      families: {},
    };
    const d = new Decor(data);
    d.own("art-x");
    d.place("art-desk", "art-x"); // x on the desk wall, b in the inventory, a on the table wall
    const act = new SwapDecorActivity("art-table", d, { setState: () => {} } as unknown as ActivityHost);
    expect(act.done).toBe(false);
    const list = d.choices("art-table").map((i) => i.id);
    expect(list).toEqual(["art-a", "art-x"]);
    act.update(dt, dir("down"));
    expect(act.note(d.item("art-x"))).toBe("ART A DOES NOT FIT ON THE DESK WALL");
    expect(d.previewing).toBe(false);
    const saved = JSON.stringify(d);
    act.update(dt, press);
    expect(act.done).toBe(false);
    expect(JSON.stringify(d)).toBe(saved);
    act.update(dt, esc);
    expect(act.done).toBe(true);
    expect(JSON.stringify(d)).toBe(saved);
  });
});
