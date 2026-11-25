import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { APARTMENT } from "./apartment";
import { PLANT } from "./config";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, FAMILIES, GIFT_ITEMS, NOTE_MAX, itemSprites } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";

// Issue 147: three more live houseplants and three more dried arrangements for the plant shelf.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const key = (code: string): Controls => ({ ...NO_INPUT, keys: [code] });
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down", keys: ["KeyS"], keysDown: ["KeyS"] };
const right: Controls = { ...NO_INPUT, dirPressed: "right", dir: "right", keys: ["KeyD"], keysDown: ["KeyD"] };
const TAB = key("Tab");

const LIVE = [
  { id: "plant-pothos", family: "pothos", day: 21 },
  { id: "plant-monstera", family: "monstera", day: 27 },
  { id: "plant-spider", family: "spider", day: 33 },
];
const STILL = [
  { id: "plant-pampas", day: 24 },
  { id: "plant-lavender", day: 30 },
  { id: "plant-eucalyptus", day: 36 },
];
const NEW = [...LIVE, ...STILL].map((x) => x.id);

// Presses left or right in the open Change plants list until the highlighted pot would hold `id`, then E (issue 182).
function pickInList(game: Game, decor: Decor, slot: string, id: string) {
  const pots = decor.groupOf("plant-shelf");
  for (let i = 0; i < pots.indexOf(slot); i++) game.update(dt, down);
  const choices = decor.choices(slot).map((c) => c.id);
  const from = choices.indexOf(decor.heldIn(slot)!.id);
  for (let i = 0; i < (choices.indexOf(id) - from + choices.length) % choices.length; i++) game.update(dt, right);
  game.update(dt, press);
}

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const spriteExists = (name: string) => `/public/sprites/${name}.png` in spriteFiles;

describe("the new plant items (data)", () => {
  it("validate with the real tables, are gifts, and are not given to anyone at the start", () => {
    expect(() => validateDecorData(DECOR_DATA)).not.toThrow();
    const fresh = new Decor();
    for (const id of NEW) {
      const item = fresh.item(id)!;
      expect(item, id).toBeDefined();
      expect(GIFT_ITEMS.includes(item)).toBe(true);
      expect(item.how).toBe("gift");
      expect(fresh.owns(id)).toBe(false);
    }
  });

  it("fit their own pot and nothing else (issue 182: the live ones the plant pot, the dried ones the vase)", () => {
    for (const id of NEW) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.kind).toBe("plant");
      expect(item.plantKind).toBe(LIVE.some((l) => l.id === id) ? "house" : "dried");
      expect(DECOR_SLOTS.filter((s) => fits(s, item)).map((s) => s.id)).toEqual([LIVE.some((l) => l.id === id) ? "plant-shelf" : "pot-vase"]);
    }
  });

  it("have a deadpan capitals note within the limit, letters the font draws, and a from", () => {
    for (const id of NEW) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.note!.length, id).toBeGreaterThan(0);
      expect(item.note!.length, id).toBeLessThanOrEqual(NOTE_MAX);
      expect(item.note, id).toBe(item.note!.toUpperCase());
      expect(unsupportedChars(item.note!), id).toEqual([]);
      expect(unsupportedChars(item.name), id).toEqual([]);
      expect(item.from, id).toBeTruthy();
    }
  });

  it("every sprite they can ask for is a drawn PNG", () => {
    for (const id of NEW) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      for (const name of itemSprites(item)) expect(spriteExists(name), name).toBe(true);
    }
  });

  it("live ones are new families that droop (the spider plant has four stages; the pothos and monstera more, issue 149); dried ones have no family", () => {
    for (const { id, family } of LIVE) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.family).toBe(family);
      expect(FAMILIES[family].droops).toBe(true);
      for (const n of [0, 1, 2, 3]) expect(itemSprites(item)).toContain(`${family}-${n}`);
    }
    expect(new Set(LIVE.map((l) => l.family)).size).toBe(3);
    for (const { id } of STILL) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.family).toBeUndefined();
      expect(itemSprites(item)).toEqual([item.sprite]);
    }
  });
});

describe("how they look and behave in the shelf slot", () => {
  const stateWith = (stage: number, dry: number) => {
    const st = new ApartmentState(STATE_VARS);
    st.applyEffects([{ var: "plantStage", set: stage }, { var: "plantDry", set: dry }]);
    return st;
  };
  for (const { id, family } of LIVE) {
    it(`${id}: follows the stage and droops like the snake plant`, () => {
      const d = new Decor();
      d.own(id);
      d.place("plant-shelf", id);
      expect([0, 1, 2, 3].map((n) => d.look("plant-shelf", stateWith(n, 0)).sprite)).toEqual([0, 1, 2, 3].map((n) => `${family}-${n}`));
      for (const n of [0, 3]) expect(d.look("plant-shelf", stateWith(n, PLANT.droopAfterHours)).sprite).toBe(`${family}-wilted`);
      expect(d.look("plant-shelf", stateWith(2, PLANT.droopAfterHours - 0.1)).sprite).toBe(`${family}-2`);
      expect(d.isLive("plant-shelf")).toBe(true);
    });
  }

  for (const { id } of LIVE) {
    it(`${id}: putting it over the snake plant sets the stage, growth and dryness back to 0, and it keeps drying`, () => {
      const decor = new Decor();
      decor.own(id);
      const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
      game.state.applyEffects([{ var: "plantStage", set: 3 }, { var: "plantGrowth", set: 2 }, { var: "plantDry", set: 50 }]);
      const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "swap-plant-shelf")!;
      game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
      game.update(dt, NO_INPUT);
      for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-plant-shelf"; i++) game.update(dt, TAB);
      game.update(dt, press);
      pickInList(game, decor, "plant-shelf", id);
      expect(decor.placedIn("plant-shelf").id).toBe(id);
      expect([game.state.get("plantStage"), game.state.get("plantGrowth"), game.state.get("plantDry")]).toEqual([0, 0, 0]);
      game.state.tick(3600);
      expect(game.state.get("plantDry")).toBeGreaterThan(0);
      for (const t of APARTMENT.rooms.main.interactables.filter((i) => i.liveSlot)) expect(game.interaction.hidden?.(t)).toBe(false);
    });
  }

  for (const { id } of STILL) {
    it(`${id}: stands in the vase, never grows or droops, and leaves the snake plant and its tasks alone (issue 182)`, () => {
      const decor = new Decor();
      decor.own(id);
      const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
      game.state.applyEffects([{ var: "plantStage", set: 2 }, { var: "plantGrowth", set: 1 }, { var: "plantDry", set: 5 }]);
      const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "swap-plant-shelf")!;
      game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
      game.update(dt, NO_INPUT);
      for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-plant-shelf"; i++) game.update(dt, TAB);
      game.update(dt, press);
      pickInList(game, decor, "pot-vase", id);
      expect(decor.placedIn("pot-vase").id).toBe(id);
      expect(decor.placedIn("plant-shelf").id).toBe("plant-snake");
      expect(decor.isLive("pot-vase")).toBe(false);
      // The snake plant carries on as before: it dries, and its tasks are still offered.
      game.state.tick(3600);
      expect(game.state.get("plantDry")).toBeGreaterThan(5);
      expect([game.state.get("plantStage"), game.state.get("plantGrowth")]).toEqual([2, 1]);
      for (const t of APARTMENT.rooms.main.interactables.filter((i) => i.liveSlot)) expect(game.interaction.hidden?.(t)).toBe(false);
      // The same sprite whatever the plant's state: it never droops.
      for (const [stage, dry] of [[0, 0], [3, 200]]) expect(decor.look("pot-vase", stateWith(stage, dry)).sprite).toBe(decor.item(id)!.sprite);
    });
  }

  it("each can be put in over the others (a live one over a dried one keeps the snake plant's state; two live ones restart)", () => {
    const d = new Decor();
    for (const id of NEW) d.own(id);
    for (const id of NEW) {
      const slot = LIVE.some((l) => l.id === id) ? "plant-shelf" : "pot-vase";
      expect(d.place(slot, id)).toBe(true);
      expect(d.placedIn(slot).id).toBe(id);
      // Each fits only its own pot (issue 182).
      expect(d.place(slot === "plant-shelf" ? "pot-vase" : "plant-shelf", id)).toBe(false);
    }
    expect(d.displayedAt("plant-snake")).toBeUndefined();
    expect(d.inventory().map((i) => i.id)).toContain("plant-snake");
  });
});

describe("the THINGS inventory", () => {
  it("shows each new item with its name, note, source and where to change it once owned", () => {
    for (const id of NEW) {
      const d = new Decor();
      d.own(id);
      const entry = d.entries().find((e) => e.item.id === id)!;
      expect(entry.item.note).toBeTruthy();
      expect(entry.from).toBe("FROM: A PACKAGE");
      expect(entry.where).toBe("IN THE INVENTORY");
      expect(entry.changeAt).toBe("CHANGE IT AT THE CUBE BOOKSHELF");
      const live = LIVE.some((l) => l.id === id);
      d.place(live ? "plant-shelf" : "pot-vase", id);
      expect(d.entries().find((e) => e.item.id === id)!.where).toBe(live ? "ON THE SHELF" : "IN THE VASE");
    }
    expect(new Decor().entries().map((e) => e.item.id).filter((i) => NEW.includes(i))).toEqual([]);
  });
});

describe("the gifts", () => {
  it("arrive on later days than the first ten, one each, and are named once", () => {
    const first = CHECKPOINTS.slice(0, 10);
    const lastFirstDay = Math.max(...first.map((m) => m.atLeast ?? 0));
    for (const { id, day } of [...LIVE, ...STILL]) {
      const m = CHECKPOINTS.find((c) => c.item === id)!;
      expect(m, id).toBeDefined();
      expect(m).toMatchObject({ stat: "days", atLeast: day });
      expect(day).toBeGreaterThan(lastFirstDay);
      expect(m.delayHours).toBe(2);
    }
    expect(CHECKPOINTS.filter((c) => NEW.includes(c.item as string))).toHaveLength(6);
  });

  it("are not owned before their day and are owned after it", () => {
    const decor = new Decor();
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
    game.deliveries.check({ points: 0, tasks: 0, days: 20 });
    expect([...game.deliveries.waitingItems, ...game.deliveries.pendingItems.map((p) => p.id)].filter((i) => NEW.includes(i))).toEqual([]);
    game.deliveries.check({ points: 0, tasks: 0, days: 21 });
    expect(game.deliveries.pendingItems.map((p) => p.id)).toContain("plant-pothos");
  });
});
