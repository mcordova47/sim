import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { spriteNames } from "../render/sprite-names";
import type { SpriteDrawer } from "../render/sprites";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { ProgressStore } from "./achievements/progress";
import { APARTMENT } from "./apartment";
import { DECOR } from "./config";
import { Decor, fits, parseDecor, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, itemSprites, type DecorData, type DecorItem } from "./decor-data";
import { Game } from "./game";
import { seeded } from "./particles/seeded";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { parseTileMap } from "./tilemap";

const state = () => new ApartmentState(STATE_VARS);
const set = (s: ApartmentState, id: string, value: number) => s.applyEffects([{ var: id, set: value }]);

// A second set of data for the cases the real room does not have yet: a spare
// painting that fits the table slot, a dried plant that never grows, a 16x16 that fits nothing.
const SPARE: DecorItem[] = [
  { id: "art-spare", name: "SPARE PAINTING", kind: "art", sprite: "painting-spare", w: 32, h: 16, color: "mist" },
  { id: "art-small", name: "SMALL PRINT", kind: "art", sprite: "print-small", w: 16, h: 16 },
  { id: "plant-dried", name: "DRIED FLOWERS", kind: "plant", sprite: "dried-flowers", family: "dried", w: 16, h: 16, color: "butter" },
  { id: "plant-fern", name: "FERN", kind: "plant", sprite: "fern-1", family: "fern", w: 16, h: 16, color: "leaf" },
  { id: "lamp-warm", name: "WARM LAMP", kind: "lamp", sprite: "lamp-warm", w: 16, h: 16 },
];
const data = (): DecorData => ({
  slots: DECOR_SLOTS,
  items: [...DECOR_ITEMS, ...SPARE],
  families: { ...DECOR_DATA.families, dried: { stages: 0, droops: false }, fern: { stages: 3, droops: true } },
});
const withSpare = () => new Decor(data());

describe("the decor tables", () => {
  it("are valid, and every default fits its slot", () => {
    expect(() => validateDecorData(DECOR_DATA)).not.toThrow();
    for (const slot of DECOR_SLOTS) {
      const item = DECOR_ITEMS.find((i) => i.id === slot.default)!;
      expect(fits(slot, item), slot.id).toBe(true);
    }
  });

  it("have the first-cut slots for the main room, and the kitchen's pantry (issue 072)", () => {
    expect(DECOR_SLOTS.map((s) => s.id)).toEqual(["art-table", "art-desk", "art-bed", "plant-shelf", "lamp-sofa", "pantry"]);
    expect(DECOR_SLOTS.filter((s) => s.room !== "main").map((s) => s.id)).toEqual(["pantry"]);
  });

  it("match the real main room: each slot is exactly where and as big as the object it draws", () => {
    expect(() => new Decor().checkLevel(APARTMENT.rooms.main)).not.toThrow();
    const main = APARTMENT.rooms.main;
    for (const slot of DECOR_SLOTS.filter((s) => s.room === "main")) {
      const found = [...(main.appearances ?? []), ...(main.props ?? [])].find((o) => ("slot" in o ? o.slot : undefined) === slot.id);
      expect(found, slot.id).toBeDefined();
      expect(found!.area).toEqual(slot.area);
    }
  });

  it("put the pantry exactly where and as big as the kitchen piece (a swap-free slot: no object, one item)", () => {
    const kitchen = APARTMENT.rooms.kitchen;
    expect(() => new Decor().checkLevel(kitchen)).not.toThrow();
    const found = (kitchen.appearances ?? []).find((a) => a.slot === "pantry");
    expect(found?.area).toEqual(DECOR_SLOTS.find((s) => s.id === "pantry")!.area);
    expect(DECOR_SLOTS.find((s) => s.id === "pantry")!.object).toBeUndefined();
    expect(new Decor().choices("pantry").map((i) => i.id)).toEqual(["pantry-bins"]);
  });

  it("refuse bad data, naming the problem", () => {
    const bad = (items: DecorItem[], slots = DECOR_SLOTS, families = DECOR_DATA.families) =>
      () => validateDecorData({ slots, items, families });
    expect(bad([...DECOR_ITEMS, DECOR_ITEMS[0]])).toThrow(/listed twice/);
    expect(bad([...DECOR_ITEMS, { ...SPARE[0], id: "wall-spare" }])).toThrow(/start with its kind/);
    expect(bad([...DECOR_ITEMS, { ...SPARE[0], family: "nope" }])).toThrow(/unknown family/);
    expect(bad([...DECOR_ITEMS, { ...SPARE[0], name: "café ☃" }])).toThrow(/font/);
    expect(bad([...DECOR_ITEMS, { ...SPARE[0], slots: ["nowhere"] }])).toThrow(/unknown slot "nowhere"/);
    expect(bad(DECOR_ITEMS.slice(1))).toThrow(/unknown default "art-barn"/);
    expect(bad(DECOR_ITEMS.map((i) => (i.id === "art-barn" ? { ...i, w: 16 } : i)))).toThrow(/does not fit/);
    expect(bad(DECOR_ITEMS, [...DECOR_SLOTS, DECOR_SLOTS[0]])).toThrow(/slot "art-table" is listed twice/);
    expect(bad(DECOR_ITEMS, DECOR_SLOTS.map((s) => (s.id === "lamp-sofa" ? { ...s, kinds: ["art" as const] } : s)))).toThrow(/does not fit/);
  });

  it("refuse a level whose slot is unknown or the wrong size or place", () => {
    const main = APARTMENT.rooms.main;
    const [first, ...rest] = main.appearances!;
    const decor = new Decor();
    expect(() => decor.checkLevel({ ...main, appearances: [{ ...first, slot: "nowhere" }, ...rest] })).toThrow(/unknown decor slot "nowhere"/);
    const slotted = main.appearances!.find((a) => a.slot === "art-table")!;
    const wrongSize = { ...slotted, area: { ...slotted.area, w: 48 } };
    expect(() => decor.checkLevel({ ...main, appearances: [wrongSize] })).toThrow(/32x16/);
    const moved = { ...slotted, area: { ...slotted.area, x: 0 } };
    expect(() => decor.checkLevel({ ...main, appearances: [moved] })).toThrow(/is at 0,0/);
    // Game refuses to start in such a room.
    expect(() => new Game({ ...main, appearances: [wrongSize] })).toThrow(/decor slot/);
  });
});

describe("the store", () => {
  it("starts as today's room: defaults shown, defaults owned, nothing else", () => {
    const d = new Decor();
    expect(d.itemIn("art-table").id).toBe("art-barn");
    expect(d.itemIn("art-desk").id).toBe("art-abstract");
    expect(d.itemIn("art-bed").id).toBe("art-silkscreen");
    expect(d.itemIn("plant-shelf").id).toBe("plant-snake");
    expect(d.itemIn("lamp-sofa").id).toBe("lamp-table");
    expect(d.toJSON()).toEqual({ owned: DECOR_SLOTS.map((s) => s.default), placed: {} });
    expect(() => d.itemIn("nowhere")).toThrow(/Unknown decor slot/);
    expect(d.choices("nowhere")).toEqual([]);
  });

  it("only lets you place an owned item of the right kind and size", () => {
    const d = withSpare();
    const changed = vi.fn();
    d.onChange = changed;
    expect(d.place("art-table", "art-spare")).toBe(false); // not owned yet
    expect(d.own("art-spare")).toBe(true);
    expect(d.own("art-spare")).toBe(false); // already owned
    expect(d.own("no-such-item")).toBe(false);
    expect(d.place("art-bed", "art-spare")).toBe(false); // 32x16 in a 48x16 slot
    expect(d.place("art-table", "art-small")).toBe(false); // not owned, and the wrong size
    d.own("art-small");
    expect(d.place("art-table", "art-small")).toBe(false); // wrong size
    expect(d.place("art-table", "plant-dried")).toBe(false); // wrong kind
    expect(d.place("nowhere", "art-spare")).toBe(false);
    expect(d.place("art-table", "nope")).toBe(false);
    expect(d.itemIn("art-table").id).toBe("art-barn");
    expect(d.place("art-table", "art-spare")).toBe(true);
    expect(d.itemIn("art-table").id).toBe("art-spare");
    expect(changed).toHaveBeenCalledTimes(3); // two owns and one placement
  });

  it("puts the old one back for free, and keeps the save to what differs", () => {
    const d = withSpare();
    d.own("art-spare");
    d.place("art-table", "art-spare");
    expect(d.toJSON().placed).toEqual({ "art-table": "art-spare" });
    expect(d.place("art-table", "art-barn")).toBe(true);
    expect(d.toJSON().placed).toEqual({});
    expect(d.owns("art-spare")).toBe(true); // nothing is lost
  });

  it("keeps today's paintings to their own walls, so a fresh game has nothing to swap", () => {
    const d = new Decor();
    for (const s of DECOR_SLOTS) expect(d.choices(s.id).map((i) => i.id), s.id).toEqual([s.default]);
    expect(d.place("art-desk", "art-barn")).toBe(false);
    expect(d.place("art-table", "art-abstract")).toBe(false);
  });

  it("lists the choices for a slot: owned items that fit, the default first, nothing locked or unowned", () => {
    const d = withSpare();
    expect(d.choices("art-table").map((i) => i.id)).toEqual(["art-barn"]);
    d.own("art-spare");
    d.own("art-small");
    d.own("plant-fern");
    expect(d.choices("art-table").map((i) => i.id)).toEqual(["art-barn", "art-spare"]);
    expect(d.choices("plant-shelf").map((i) => i.id)).toEqual(["plant-snake", "plant-fern"]);
    expect(d.choices("art-bed").map((i) => i.id)).toEqual(["art-silkscreen"]);
  });

  it("goes back to today's room on reset", () => {
    const d = withSpare();
    d.own("art-spare");
    d.place("art-table", "art-spare");
    d.reset();
    expect(d.toJSON()).toEqual(new Decor().toJSON());
  });
});

describe("what a slot looks like (plant rules per family)", () => {
  const s = state();
  it("is the item's sprite for plain items", () => {
    expect(new Decor().look("art-table", s)).toMatchObject({ sprite: "painting", color: "paper", label: "BARN DRAWING" });
    expect(new Decor().look("lamp-sofa", s).sprite).toBe("lamp-table");
  });

  it("follows the snake plant's stage and drooping exactly as before", () => {
    const d = new Decor();
    const look = (stage: number, dry = 0) => {
      const st = state();
      set(st, "plantStage", stage);
      set(st, "plantDry", dry);
      return d.look("plant-shelf", st);
    };
    expect([0, 1, 2, 3].map((n) => look(n).sprite)).toEqual(["plant-0", "plant-1", "plant-2", "plant-3"]);
    expect([0, 1, 2, 3].map((n) => look(n, 96).sprite)).toEqual(Array(4).fill("plant-wilted"));
    expect(look(2, 95.9).sprite).toBe("plant-2");
    expect(look(2).color).toBe("leaf");
    expect(look(2, 200).color).toBe("butter");
  });

  it("a swapped-in plant uses its own family's sprites and rules", () => {
    const d = withSpare();
    d.own("plant-fern");
    d.place("plant-shelf", "plant-fern");
    const st = state();
    set(st, "plantStage", 3);
    // The fern has three stages, so the shelf's stage 3 is its last one.
    expect(d.look("plant-shelf", st).sprite).toBe("fern-2");
    set(st, "plantStage", 1);
    expect(d.look("plant-shelf", st).sprite).toBe("fern-1");
    set(st, "plantDry", 150);
    expect(d.look("plant-shelf", st).sprite).toBe("fern-wilted");
  });

  it("a plant that never grows never droops, however dry the shelf is", () => {
    const d = withSpare();
    d.own("plant-dried");
    d.place("plant-shelf", "plant-dried");
    for (const [stage, dry] of [[0, 0], [3, 0], [2, 999], [0, 500]]) {
      const st = state();
      set(st, "plantStage", stage);
      set(st, "plantDry", dry);
      expect(d.look("plant-shelf", st)).toMatchObject({ sprite: "dried-flowers", color: "butter" });
    }
  });

  it("lists every sprite an item can ask for, so they are loaded", () => {
    expect(itemSprites(DECOR_ITEMS.find((i) => i.id === "plant-snake")!).sort()).toEqual(["plant-0", "plant-1", "plant-2", "plant-3", "plant-wilted"]);
    expect(itemSprites(SPARE[2], data().families)).toEqual(["dried-flowers"]);
    expect(itemSprites(DECOR_ITEMS[0])).toEqual(["painting"]);
    const names = spriteNames(Object.values(APARTMENT.rooms));
    for (const n of new Decor().spriteNames()) expect(names).toContain(n);
  });
});

describe("reading a saved decor value", () => {
  const start = DECOR_SLOTS.map((s) => s.default);
  const today = { owned: start, placed: {} };

  it("a missing field is today's room", () => {
    expect(parseDecor(undefined)).toEqual(today);
    expect(new Decor().toJSON()).toEqual(today);
  });

  it.each([null, 5, "text", true, [], [1, 2], () => 1])("ignores a value of the wrong shape: %s", (raw) => {
    expect(parseDecor(raw)).toEqual(today);
  });

  it("ignores fields of the wrong shape one by one", () => {
    expect(parseDecor({ owned: "art-spare", placed: [1] }, data())).toEqual(today);
    expect(parseDecor({ owned: { 0: "art-spare" }, placed: "x" }, data())).toEqual(today);
    expect(parseDecor({ owned: [1, null, {}, [], "art-spare", true], placed: { "art-table": 5, "art-desk": null } }, data())).toEqual({
      owned: [...start, "art-spare"],
      placed: {},
    });
  });

  it("keeps what is placed when it is known, fits and is owned", () => {
    const raw = { owned: ["art-spare"], placed: { "art-table": "art-spare" } };
    expect(parseDecor(raw, data())).toEqual({ owned: [...start, "art-spare"], placed: { "art-table": "art-spare" } });
  });

  it("round trips through the store", () => {
    const d = withSpare();
    d.own("art-spare");
    d.own("plant-fern");
    d.place("art-table", "art-spare");
    d.place("plant-shelf", "plant-fern");
    const copy = withSpare();
    copy.load(JSON.parse(JSON.stringify(d.toJSON())));
    expect(copy.toJSON()).toEqual(d.toJSON());
    expect(copy.itemIn("art-table").id).toBe("art-spare");
  });

  it("drops an item this build no longer has from the room but keeps it in the list", () => {
    // Saved by a build that had the spare painting; this one does not.
    const raw = { owned: ["art-spare", "art-old"], placed: { "art-table": "art-spare", "art-desk": "art-old" } };
    const d = new Decor();
    d.load(raw);
    expect(d.itemIn("art-table").id).toBe("art-barn");
    expect(d.itemIn("art-desk").id).toBe("art-abstract");
    expect(d.choices("art-table").map((i) => i.id)).toEqual(["art-barn"]);
    expect(d.toJSON().owned).toEqual([...start, "art-spare", "art-old"]);
    expect(d.toJSON().placed).toEqual({});
    // A build that brings it back finds it again.
    const back = withSpare();
    back.load(d.toJSON());
    expect(back.owns("art-spare")).toBe(true);
    back.place("art-table", "art-spare");
    expect(back.itemIn("art-table").id).toBe("art-spare");
  });

  it("falls back to the default for a bad placement: unknown slot, wrong kind or size, not owned, not an item", () => {
    const raw = {
      owned: ["art-spare", "art-small", "plant-dried"],
      placed: {
        "art-table": "plant-dried", // wrong kind
        "art-desk": "art-small", // wrong size
        "art-bed": "art-spare", // wrong size (32x16 in 48x16)
        "plant-shelf": "plant-fern", // known but not owned
        "lamp-sofa": "no-such-item",
        "no-such-slot": "art-spare",
      },
    };
    expect(parseDecor(raw, data()).placed).toEqual({});
    const d = withSpare();
    d.load(raw);
    expect(DECOR_SLOTS.map((s) => d.itemIn(s.id).id)).toEqual(DECOR_SLOTS.map((s) => s.default));
  });

  it("always owns the starting items, even if the save lacks them, and never repeats an id", () => {
    const parsed = parseDecor({ owned: ["art-spare", "art-spare", "art-barn", "art-barn"] }, data());
    expect(parsed.owned).toEqual([...start, "art-spare"]);
    expect(parseDecor({ owned: [] }).owned).toEqual(start);
  });

  it("caps hand-edited oversize data", () => {
    const owned = Array.from({ length: DECOR.maxOwned * 4 }, (_, i) => `art-extra-${i}`);
    expect(parseDecor({ owned }).owned.length).toBe(DECOR.maxOwned);
    expect(parseDecor({ owned: ["x".repeat(DECOR.maxIdLength + 1), "x".repeat(DECOR.maxIdLength), ""] }).owned).toEqual([...start, "x".repeat(DECOR.maxIdLength)]);
    const placed = Object.fromEntries(Array.from({ length: DECOR.maxPlaced * 3 }, (_, i) => [`slot-${i}`, "art-barn"]));
    expect(parseDecor({ placed }).placed).toEqual({});
    // A placement past the cap is not read, even for a real slot.
    const late = { ...placed, "art-table": "art-spare" };
    expect(parseDecor({ owned: ["art-spare"], placed: late }, data()).placed).toEqual({});
    // Huge input is cut before it is walked.
    const big = { owned: { length: 1e9 }, placed: Array(10) };
    expect(parseDecor(big)).toEqual(today);
  });

  it("is not fooled by keys like __proto__", () => {
    const raw = JSON.parse('{"owned":["__proto__","constructor"],"placed":{"__proto__":"art-barn","constructor":"art-barn","toString":"x"}}');
    const parsed = parseDecor(raw);
    expect(parsed.placed).toEqual({});
    expect(Object.getPrototypeOf(parsed.placed)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).art).toBeUndefined();
    const d = new Decor();
    expect(() => d.load(raw)).not.toThrow();
    expect(d.itemIn("art-table").id).toBe("art-barn");
  });

  it("survives fuzzed save data: never throws, always leaves a valid room", () => {
    const rand = seeded(62);
    const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)];
    const ids = [...DECOR_ITEMS.map((i) => i.id), ...SPARE.map((i) => i.id), "art-old", "", "__proto__", "x".repeat(200)];
    const slots = [...DECOR_SLOTS.map((s) => s.id), "nowhere", "__proto__", ""];
    const junk = (depth = 0): unknown => {
      const r = rand();
      if (r < 0.15) return pick([null, undefined, true, false, 0, -1, 1.5, NaN, Infinity, "", "text"]);
      if (r < 0.35) return pick(ids);
      if (depth > 3) return 1;
      if (r < 0.6) return Array.from({ length: Math.floor(rand() * 8) }, () => junk(depth + 1));
      return Object.fromEntries(Array.from({ length: Math.floor(rand() * 6) }, () => [pick([...slots, ...ids, "owned", "placed"]), junk(depth + 1)]));
    };
    for (let n = 0; n < 2000; n++) {
      const raw =
        rand() < 0.5
          ? { owned: junk(), placed: junk() }
          : { owned: Array.from({ length: Math.floor(rand() * 12) }, () => pick(ids)), placed: Object.fromEntries(slots.map((s) => [s, pick(ids)])) };
      const d = withSpare();
      expect(() => d.load(JSON.parse(JSON.stringify(rand() < 0.2 ? junk() : raw) ?? "null"))).not.toThrow();
      const saved = d.toJSON();
      expect(saved.owned.length).toBeLessThanOrEqual(DECOR.maxOwned);
      for (const s of DECOR_SLOTS) {
        const item = d.itemIn(s.id);
        expect(fits(s, item), `${s.id} holds ${item.id}`).toBe(true);
        expect(d.owns(item.id)).toBe(true);
      }
      for (const [slot, item] of Object.entries(saved.placed)) {
        expect(DECOR_SLOTS.some((s) => s.id === slot)).toBe(true);
        expect(saved.owned).toContain(item);
      }
      // What it saves reads back as the same thing.
      const again = withSpare();
      again.load(JSON.parse(JSON.stringify(saved)));
      expect(again.toJSON()).toEqual(saved);
    }
  });
});

describe("saving with the progress", () => {
  const stats = { steps: 1 } as never;

  it("writes the decor field and reads it back, without a version bump", () => {
    const storage = new FakeStorage();
    const d = withSpare();
    d.own("art-spare");
    d.place("art-table", "art-spare");
    new ProgressStore(storage, "k").save(["a"], stats, null, d.toJSON());
    expect(JSON.parse(storage.data.get("k")!).version).toBe(1);
    const loaded = new ProgressStore(storage, "k").load();
    expect(loaded.unlocked).toEqual(["a"]);
    expect(loaded.decor).toEqual(d.toJSON());
  });

  it("leaves the field out when there is none, and an old save loads with none", () => {
    const storage = new FakeStorage();
    new ProgressStore(storage, "k").save([], stats, null);
    expect("decor" in JSON.parse(storage.data.get("k")!)).toBe(false);
    expect(new ProgressStore(storage, "k").load().decor).toBeUndefined();
    const old = new FakeStorage();
    old.setItem("k", JSON.stringify({ version: 1, unlocked: ["a"], stats: {}, world: null }));
    expect(new ProgressStore(old, "k").load()).toMatchObject({ unlocked: ["a"], world: null });
  });

  const KEY = "life.progress.v1";
  const gameWith = (storage: FakeStorage, decor = withSpare()) => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor });
    const feature = new AchievementsFeature(game, { storage });
    return { game, feature };
  };

  it("an old save (no decor field) gives today's room", () => {
    const storage = new FakeStorage();
    storage.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: null }));
    const { game } = gameWith(storage);
    expect(game.decor.toJSON()).toEqual({ owned: DECOR_SLOTS.map((s) => s.default), placed: {} });
  });

  it("the game saves its decor and the next visit has it back", () => {
    const storage = new FakeStorage();
    const first = gameWith(storage);
    first.game.decor.own("art-spare");
    first.game.decor.place("art-table", "art-spare");
    expect(first.feature.save()).toBe(true);
    expect(JSON.parse(storage.data.get(KEY)!).decor).toEqual({
      owned: [...DECOR_SLOTS.map((s) => s.default), "art-spare"],
      placed: { "art-table": "art-spare" },
    });
    const second = gameWith(storage);
    expect(second.game.decor.itemIn("art-table").id).toBe("art-spare");
  });

  it("a damaged decor field costs only the decor, not the rest of the save", () => {
    const storage = new FakeStorage();
    storage.setItem(KEY, JSON.stringify({ version: 1, unlocked: ["coffee-3"], stats: {}, world: null, decor: { owned: 7, placed: "no" } }));
    const { game, feature } = gameWith(storage);
    expect(game.decor.toJSON().placed).toEqual({});
    expect(feature.unlocks.ids()).toEqual(["coffee-3"]);
  });

  it("starting afresh also puts the room back", () => {
    const storage = new FakeStorage();
    const { game, feature } = gameWith(storage);
    game.decor.own("art-spare");
    game.decor.place("art-table", "art-spare");
    feature.reset();
    expect(game.decor.itemIn("art-table").id).toBe("art-barn");
    expect(game.decor.owns("art-spare")).toBe(false);
  });
});

describe("drawing from the store", () => {
  afterEach(() => vi.unstubAllGlobals());

  // A room with one slot-driven object (A, 32x16 at col 2, row 1) matching the "art-table" slot moved down a row.
  const slots = DECOR_SLOTS.map((s) => (s.id === "art-table" ? { ...s, area: { x: 32, y: 16, w: 32, h: 16 } } : s));
  const customData = (): DecorData => ({ ...data(), slots });
  const MAP = ["#######", "#.AA..#", "#.....#", "#..@..#", "#######"];
  const room = (sprite = "painting") =>
    parseTileMap(MAP, { A: { name: "art", sprite, color: "paper", slot: "art-table" } }, { id: "main" });

  function setup(has: (name: string) => boolean) {
    const drawn: string[] = [];
    const fills: string[] = [];
    const texts: string[] = [];
    const sprites: SpriteDrawer = { has, draw: (_c, name) => void drawn.push(name) };
    const ctx = new Proxy({}, { get: (_t, p) => (...a: number[]) => (p === "fillRect" ? fills.push(a.join(",")) : undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ({ ...ctx, fillRect: (...a: number[]) => texts.push(a.join(",")), drawImage: () => {} }) }) });
    const game = new Game(room(), { sprites, decor: new Decor(customData()) });
    return { game, drawn, fills, ctx };
  }

  it("draws the default item's sprite, and the placed one after a swap, at once", () => {
    const { game, drawn, ctx } = setup(() => true);
    game.update(1 / 60, NO_INPUT);
    game.render(ctx, 1);
    expect(drawn).toContain("painting");
    drawn.length = 0;
    game.decor.own("art-spare");
    game.decor.place("art-table", "art-spare");
    game.render(ctx, 1);
    expect(drawn).toContain("painting-spare");
    expect(drawn).not.toContain("painting");
    drawn.length = 0;
    game.decor.place("art-table", "art-barn");
    game.render(ctx, 1);
    expect(drawn).toContain("painting");
  });

  it("draws a box the size of the slot, not a crash, when an item's art is missing", () => {
    const { game, drawn, fills, ctx } = setup((n) => n === "painting");
    game.decor.own("art-spare");
    game.decor.place("art-table", "art-spare");
    expect(() => game.render(ctx, 1)).not.toThrow();
    expect(drawn).not.toContain("painting-spare");
    expect(fills).toContain("32,16,32,16");
  });

  it("refuses a room that has a slot object without its default sprite or with variants", () => {
    expect(() => parseTileMap(MAP, { A: { slot: "art-table" } }, { id: "main" })).toThrow(/default sprite/);
    expect(() =>
      parseTileMap(MAP, { A: { slot: "art-table", sprite: "x", variants: [{ sprite: "x" }] } }, { id: "main" }),
    ).toThrow(/variants/);
  });
});
