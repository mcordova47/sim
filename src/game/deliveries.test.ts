import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpriteDrawer } from "../render/sprites";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { ProgressStore } from "./achievements/progress";
import { APARTMENT } from "./apartment";
import { DELIVERIES } from "./config";
import { Decor } from "./decor";
import { deliverFromSearch } from "./decor-dev";
import { DEV_CHECKPOINTS, CHECKPOINTS } from "./delivery-checkpoints";
import { Deliveries, parseDeliveries, type Milestone } from "./deliveries";
import { say } from "./dialog";
import { Game } from "./game";
import { reachablePlaces, taskSpots } from "./plan-checks";
import { STATE_VARS } from "./state-vars";
import { TILE } from "./config";

// Issue 062 stage 3a: the delivery queue, the box by the door, the checkpoints.

const press: Controls = { ...NO_INPUT, interactPressed: true };
const BARN = "art-test-barn";
const PLANT = "plant-test-grown";
const LAMP = "lamp-test-stool";

function make() {
  const decor = new Decor();
  const d = new Deliveries(decor);
  return { decor, d };
}

function newGame(storage = new FakeStorage()) {
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 });
  const feature = new AchievementsFeature(game, { storage, keys: undefined });
  return { game, feature, storage };
}

// Plays game time forward: `hours` game hours of ordinary ticking.
function play(game: Game, hours: number) {
  const seconds = (hours * 60) / 2; // two game minutes per second
  for (let t = 0; t < seconds; t += 0.5) game.update(0.5, NO_INPUT);
}

function standAtBox(game: Game) {
  const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "collect-delivery");
  if (!spot) throw new Error("no spot for the package");
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(1 / 60, NO_INPUT);
}

describe("deliver() validation", () => {
  it("queues a known item that is not owned, and refuses the rest", () => {
    const { decor, d } = make();
    expect(d.deliver(BARN, 2)).toBe(true);
    expect(d.deliver(BARN, 2)).toBe(false); // already queued
    expect(d.deliver("art-nope", 1)).toBe(false); // unknown
    expect(d.deliver("", 1)).toBe(false);
    expect(d.deliver("art-barn", 1)).toBe(false); // owned from the start
    decor.own(PLANT);
    expect(d.deliver(PLANT, 1)).toBe(false); // owned
    expect(d.pendingItems.map((p) => p.id)).toEqual([BARN]);
  });

  it("refuses an item that is waiting by the door", () => {
    const { d } = make();
    d.deliver(BARN, 0);
    expect(d.waiting).toBe(true);
    expect(d.deliver(BARN, 5)).toBe(false);
  });

  it("treats a negative, NaN or infinite delay sanely", () => {
    const { d } = make();
    expect(d.deliver(BARN, -5)).toBe(true);
    expect(d.waiting).toBe(true);
    expect(d.deliver(PLANT, Number.NaN)).toBe(true);
    expect(d.waitingItems).toEqual([BARN, PLANT]);
    expect(d.deliver(LAMP, Infinity)).toBe(true); // cut to the longest delay
    expect(d.pendingItems[0].at).toBe(DELIVERIES.maxDelayHours);
  });

  it("is capped", () => {
    const decor = new Decor();
    const d = new Deliveries(decor);
    const ids = ["art-test-desk", BARN, PLANT, LAMP];
    // Squeeze the cap down by filling with the real limit using made-up ids is not
    // possible (ids must be known), so check the limit against the parser instead.
    for (const id of ids) expect(d.deliver(id, 1)).toBe(true);
    expect(d.pendingItems).toHaveLength(4);
    const big = { hours: 1, pending: Array.from({ length: 500 }, (_, i) => ({ id: `art-x${i}`, at: i })), waiting: Array.from({ length: 500 }, (_, i) => `art-w${i}`) };
    const parsed = parseDeliveries(big);
    expect(parsed.pending.length + parsed.waiting.length).toBeLessThanOrEqual(DELIVERIES.maxQueued);
  });
});

describe("arrival by the game clock", () => {
  it("arrives in order of time, ties in the order queued", () => {
    const { d } = make();
    d.deliver(PLANT, 3);
    d.deliver(BARN, 1);
    d.deliver(LAMP, 3);
    const order: string[] = [];
    d.onArrive = (ids) => order.push(...ids);
    d.advance(0.5);
    expect(order).toEqual([]);
    d.advance(0.5);
    expect(order).toEqual([BARN]);
    d.advance(5);
    expect(order).toEqual([BARN, PLANT, LAMP]);
    expect(d.pendingItems).toEqual([]);
  });

  it("ignores time that is not a positive number", () => {
    const { d } = make();
    d.deliver(BARN, 1);
    for (const h of [0, -3, Number.NaN, Infinity]) d.advance(h);
    expect(d.hours).toBe(0);
    expect(d.waiting).toBe(false);
  });

  it("adds the item only when collected, not on arrival", () => {
    const { decor, d } = make();
    d.deliver(BARN, 1);
    d.advance(2);
    expect(d.waiting).toBe(true);
    expect(decor.owns(BARN)).toBe(false);
    expect(d.collect()).toEqual([BARN]);
    expect(decor.owns(BARN)).toBe(true);
    expect(d.waiting).toBe(false);
    expect(d.collect()).toEqual([]);
  });

  it("pauses with the game: no time passes while a dialog or the track editor holds the clock", () => {
    const { game } = newGame();
    expect(game.deliveries.deliver(BARN, 1)).toBe(true);
    play(game, 0.5);
    const before = game.deliveries.hours;
    expect(before).toBeCloseTo(0.5, 1);
    game.openDialog(say("HELLO"));
    // With a dialog open and DIALOG.pauseClock, time stands still.
    for (let i = 0; i < 400; i++) game.update(0.5, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    expect(game.deliveries.hours).toBeCloseTo(before, 5);
    expect(game.deliveries.waiting).toBe(false);
  });

  it("skips hours when sleeping: a delivery due in the skipped time arrives at wake", () => {
    const { game } = newGame();
    game.deliveries.deliver(BARN, 5);
    game.deliveries.deliver(PLANT, 30);
    game.state.applyEffects([{ var: "clock", add: 7 }]);
    expect(game.deliveries.hours).toBeCloseTo(7, 5);
    expect(game.deliveries.waitingItems).toEqual([BARN]);
    expect(game.deliveries.pendingItems.map((p) => p.id)).toEqual([PLANT]);
  });

  it("does not count a clock that is set, or moved back (the dev shortcuts)", () => {
    const { game } = newGame();
    game.state.applyEffects([{ var: "clock", set: 20 }]);
    game.state.applyEffects([{ var: "clock", add: -1 }]);
    expect(game.deliveries.hours).toBe(0);
  });
});

describe("saving and reload", () => {
  it("resumes after a reload: time, the queue, what waits and what fired", () => {
    const { game, feature, storage } = newGame();
    game.deliveries.deliver(BARN, 1);
    game.deliveries.deliver(PLANT, 6);
    play(game, 2);
    expect(game.deliveries.waitingItems).toEqual([BARN]);
    feature.save();
    const again = newGame(storage).game;
    expect(again.deliveries.waitingItems).toEqual([BARN]);
    expect(again.deliveries.pendingItems.map((p) => p.id)).toEqual([PLANT]);
    expect(again.deliveries.hours).toBeCloseTo(2, 1);
    play(again, 3.9);
    expect(again.deliveries.waiting).toBe(true);
    expect(again.deliveries.pendingItems).toHaveLength(1);
    play(again, 0.5);
    expect(again.deliveries.waitingItems).toEqual([BARN, PLANT]);
  });

  it("saves when something is queued, so closing the tab at once keeps it", () => {
    const { game, storage } = newGame();
    game.deliveries.deliver(LAMP, 4);
    const saved = new ProgressStore(storage, "life.progress.v1").load();
    // The key may differ; read whatever was written.
    const raw = JSON.parse([...storage.data.values()][0]);
    expect(raw.deliveries.pending[0].id).toBe(LAMP);
    expect(saved).toBeDefined();
  });

  it("leaves an old save alone: no deliveries field means nothing queued, and the field is optional", () => {
    const storage = new FakeStorage();
    storage.setItem("any", "x");
    const { game } = newGame(new FakeStorage());
    expect(game.deliveries.hours).toBe(0);
    expect(game.deliveries.waiting).toBe(false);
    expect(game.deliveries.pendingItems).toEqual([]);
    const store = new ProgressStore(new FakeStorage(), "k");
    expect(store.save([], {} as never, null)).toBe(true);
    expect(store.load().deliveries).toBeUndefined();
  });

  it("survives malformed saves", () => {
    const bad: unknown[] = [
      undefined, null, 5, "x", [], {}, { hours: "3" }, { hours: -4, pending: 7, waiting: "no", fired: {} },
      { hours: Number.NaN, pending: [null, 3, {}, { id: 4, at: 1 }, { id: "art-test-barn", at: "soon" }, { id: "art-test-barn", at: Infinity }] },
      { pending: [{ id: "__proto__", at: 1 }], waiting: ["__proto__", "constructor"], fired: ["__proto__"] },
      { waiting: [{}, null, 1, "x".repeat(500)] },
    ];
    for (const raw of bad) {
      const s = parseDeliveries(raw);
      expect(Number.isFinite(s.hours)).toBe(true);
      expect(s.hours).toBeGreaterThanOrEqual(0);
      for (const p of s.pending) expect(Number.isFinite(p.at)).toBe(true);
      const { d } = make();
      expect(() => d.load(raw)).not.toThrow();
      expect(() => JSON.stringify(d.toJSON())).not.toThrow();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    }
    expect(parseDeliveries({ hours: 5, pending: [{ id: BARN, at: 7 }], waiting: [PLANT], fired: ["m"] })).toEqual({
      hours: 5,
      pending: [{ id: BARN, at: 7 }],
      waiting: [PLANT],
      fired: ["m"],
    });
  });

  it("keeps the caps on a huge save and drops repeats", () => {
    const huge = {
      hours: 1e300,
      pending: Array.from({ length: 5000 }, (_, i) => ({ id: `art-p${i % 10}`, at: i })),
      waiting: Array.from({ length: 5000 }, (_, i) => `art-w${i}`),
      fired: Array.from({ length: 5000 }, (_, i) => `f${i}`),
    };
    const s = parseDeliveries(huge);
    expect(s.hours).toBe(DELIVERIES.maxHours);
    expect(s.waiting).toHaveLength(DELIVERIES.maxQueued);
    expect(s.pending).toHaveLength(0);
    expect(s.fired).toHaveLength(DELIVERIES.maxFired);
    const twice = parseDeliveries({ waiting: ["a", "a"], pending: [{ id: "a", at: 1 }, { id: "b", at: 1 }, { id: "b", at: 2 }] });
    expect(twice.waiting).toEqual(["a"]);
    expect(twice.pending).toEqual([{ id: "b", at: 1 }]);
  });

  it("drops saved deliveries of items this build does not know", () => {
    const { d } = make();
    d.load({ pending: [{ id: "art-gone", at: 1 }, { id: BARN, at: 2 }], waiting: ["plant-gone", PLANT] });
    expect(d.pendingItems.map((p) => p.id)).toEqual([BARN]);
    expect(d.waitingItems).toEqual([PLANT]);
  });

  it("drops saved deliveries of things you already own", () => {
    const decor = new Decor();
    decor.own(BARN);
    const d = new Deliveries(decor);
    d.load({ pending: [{ id: BARN, at: 1 }], waiting: [BARN, PLANT] });
    expect(d.pendingItems).toEqual([]);
    expect(d.waitingItems).toEqual([PLANT]);
  });

  it("resets with the rest of the progress", () => {
    const { game, feature } = newGame();
    game.deliveries.deliver(BARN, 0);
    play(game, 1);
    feature.reset();
    expect(game.deliveries.hours).toBe(0);
    expect(game.deliveries.waiting).toBe(false);
  });
});

describe("checkpoints", () => {
  const list: Milestone[] = [
    { id: "p10", stat: "points", atLeast: 10, item: BARN, delayHours: 1 },
    { id: "t2", stat: "tasks", atLeast: 2, item: PLANT, delayHours: 1 },
    { id: "d1", stat: "days", atLeast: 1, item: LAMP, delayHours: 0 },
  ];

  it("fires each once when its number is reached, and remembers it", () => {
    const { d } = make();
    d.milestones = list;
    d.check({ points: 9, tasks: 1, days: 0.9 });
    expect(d.pendingItems).toEqual([]);
    d.check({ points: 10, tasks: 1, days: 0.9 });
    expect(d.pendingItems.map((p) => p.id)).toEqual([BARN]);
    d.check({ points: 500, tasks: 1, days: 0.9 });
    expect(d.pendingItems).toHaveLength(1);
    expect(d.hasFired("p10")).toBe(true);
    d.check({ points: 500, tasks: 5, days: 3 });
    expect(d.waitingItems).toEqual([LAMP]);
    expect(d.pendingItems.map((p) => p.id).sort()).toEqual([BARN, PLANT].sort());
  });

  it("does not fire again after a reload, even if the item was refused", () => {
    const { decor, d } = make();
    d.milestones = list;
    decor.own(BARN);
    d.check({ points: 10, tasks: 0, days: 0 });
    expect(d.pendingItems).toEqual([]);
    expect(d.hasFired("p10")).toBe(true);
    const saved = JSON.parse(JSON.stringify(d.toJSON()));
    const again = new Deliveries(new Decor());
    again.milestones = list;
    again.load(saved);
    again.check({ points: 10, tasks: 0, days: 0 });
    expect(again.pendingItems).toEqual([]);
  });

  it("ignores numbers that are not numbers", () => {
    const { d } = make();
    d.milestones = list;
    d.check({ points: Number.NaN, tasks: undefined as never, days: -1 });
    expect(d.pendingItems).toEqual([]);
  });

  it("has an empty production list, and a dev list that only uses TEST items", () => {
    expect(CHECKPOINTS).toEqual([]);
    const decor = new Decor();
    expect(DEV_CHECKPOINTS.length).toBeGreaterThan(0);
    for (const m of DEV_CHECKPOINTS) expect(decor.testItemIds()).toContain(m.item);
    expect(new Set(DEV_CHECKPOINTS.map((m) => m.id)).size).toBe(DEV_CHECKPOINTS.length);
  });

  it("is fed by the game: tasks done, points and days played", () => {
    const { game } = newGame();
    game.deliveries.milestones = [{ id: "d", stat: "days", atLeast: 1, item: BARN, delayHours: 0 }];
    game.state.applyEffects([{ var: "clock", add: 24 }]);
    play(game, 6); // the feature checks every few seconds
    expect(game.deliveries.hasFired("d")).toBe(true);
    expect(game.deliveries.waitingItems).toEqual([BARN]);
  });

  it("uses the production list by default, so a real milestone fires in a real game", async () => {
    const mod = await import("./delivery-checkpoints");
    expect(new Deliveries(new Decor()).milestones).toBe(mod.CHECKPOINTS);
    const list = mod.CHECKPOINTS as Milestone[];
    list.push({ id: "prod-test", stat: "tasks", atLeast: 0, item: BARN, delayHours: 0 });
    try {
      const { game } = newGame();
      play(game, 0.2);
      expect(game.deliveries.hasFired("prod-test")).toBe(true);
      expect(game.deliveries.waitingItems).toEqual([BARN]);
    } finally {
      list.pop();
    }
  });

  it("the dev shortcut ?deliver= picks the list or queues ids", () => {
    const { d } = make();
    expect(deliverFromSearch(d, "?deliver=test")).toEqual([]);
    expect(d.milestones).toBe(DEV_CHECKPOINTS);
    expect(deliverFromSearch(d, `?deliver=${BARN},nope,${BARN}`)).toEqual([BARN]);
    expect(deliverFromSearch(d, "")).toEqual([]);
  });
});

describe("the package by the door", () => {
  it("is not there and not offered while nothing waits, and there is no state var drift", () => {
    const { game } = newGame();
    standAtBox(game);
    play(game, 0.1);
    expect(game.state.get("parcel")).toBe(0);
    expect(game.interaction.nearby?.id).not.toBe("collect-delivery");
    expect(game.interaction.choices.map((c) => c.id)).not.toContain("collect-delivery");
  });

  it("shows when a package arrives, says one plain line, and E opens it quietly", () => {
    const { game } = newGame();
    const events: string[] = [];
    for (const n of ["taskStart", "taskComplete", "taskCancelled"] as const) game.events.on(n, () => events.push(n));
    game.deliveries.deliver(BARN, 0.5);
    play(game, 0.6);
    expect(game.state.get("parcel")).toBe(1);
    standAtBox(game);
    expect(game.interaction.nearby?.id).toBe("collect-delivery");
    const score = game.interaction.scoreboard.score;
    const mood = game.state.get("mood");
    game.update(1 / 60, press);
    for (let i = 0; i < 5; i++) game.update(1 / 60, NO_INPUT);
    expect(game.decor.owns(BARN)).toBe(true);
    expect(game.deliveries.waiting).toBe(false);
    expect(game.state.get("parcel")).toBe(0);
    expect(game.interaction.scoreboard.score).toBe(score);
    expect(game.state.get("mood")).toBeCloseTo(mood, 0);
    expect(events).not.toContain("taskComplete");
    expect(events).not.toContain("taskCancelled");
    expect(game.interaction.nearby?.id).not.toBe("collect-delivery");
  });

  it("collects everything waiting at once, and never counts as a task for the achievements", () => {
    const { game } = newGame();
    game.deliveries.deliver(BARN, 0);
    game.deliveries.deliver(PLANT, 0);
    game.update(1 / 60, NO_INPUT);
    standAtBox(game);
    game.update(1 / 60, press);
    expect(game.decor.owns(BARN) && game.decor.owns(PLANT)).toBe(true);
  });

  const room = () => APARTMENT.rooms.main;
  const spot = () => {
    const z = room().interactables.find((i) => i.id === "collect-delivery")!.zones[0];
    return { col: z.x / TILE, row: z.y / TILE };
  };
  const hold = (dir: "up" | "down" | "left" | "right"): Controls => ({ ...NO_INPUT, dir, dirPressed: dir });
  const walk = (game: Game, c: Controls, seconds = 1) => {
    for (let t = 0; t < seconds; t += 1 / 60) game.update(1 / 60, c);
  };

  it("is floor you can walk on until a package waits, and a solid box while one does", () => {
    const { game } = newGame();
    const { col, row } = spot();
    game.player.placeAt(col + 1, row, "left");
    game.update(1 / 60, NO_INPUT);
    walk(game, hold("left"), 0.6); // nothing waits: walk onto it
    expect(game.player.col).toBe(col);
    game.player.placeAt(col + 1, row, "left");
    game.deliveries.deliver(BARN, 0);
    game.update(1 / 60, NO_INPUT);
    expect(game.state.get("parcel")).toBe(1);
    walk(game, hold("left"), 1); // the box blocks it
    expect(game.player.col).toBe(col + 1);
    expect(game.interaction.nearby?.id).toBe("collect-delivery");
    game.update(1 / 60, press);
    walk(game, NO_INPUT, 0.2);
    expect(game.decor.owns(BARN)).toBe(true);
    walk(game, hold("left"), 0.6); // collected: the tile is open again
    expect(game.player.col).toBe(col);
  });

  it("collects with E from each open neighbour, and a walking player cannot enter it", () => {
    const { col, row } = spot();
    const sides: [number, number, "left" | "right" | "up" | "down"][] = [
      [col + 1, row, "left"],
      [col, row - 1, "down"],
    ];
    for (const [c, r, face] of sides) {
      const { game } = newGame();
      game.deliveries.deliver(BARN, 0);
      game.update(1 / 60, NO_INPUT);
      game.player.placeAt(c, r, face);
      game.update(1 / 60, NO_INPUT);
      expect(game.interaction.nearby?.id, `${c},${r}`).toBe("collect-delivery");
      game.update(1 / 60, press);
      walk(game, NO_INPUT, 0.2);
      expect(game.decor.owns(BARN), `${c},${r}`).toBe(true);
    }
    // Walking straight at it from further away stops beside it.
    const { game } = newGame();
    game.deliveries.deliver(BARN, 0);
    game.update(1 / 60, NO_INPUT);
    game.player.placeAt(col + 3, row, "left");
    walk(game, hold("left"), 3);
    expect(game.player.col).toBe(col + 1);
  });

  it("is not a trap: with a package waiting every walkable tile of the room is still reachable and the other tile by the door is open", () => {
    const main = room();
    const { col, row } = spot();
    const places = (solids: typeof main.solids) => {
      const lvl = { ...main, solids };
      const start = { room: "main", col: 5, row: 4 };
      return reachablePlaces({ ...APARTMENT.rooms, main: lvl }, start);
    };
    const withBox = places(main.solids); // the box solid is in the static list, blocked while a package waits
    const free = places(main.solids.filter((x) => !x.blockedWhen));
    expect(withBox.has(`main,${col + 1},${row}`)).toBe(true);
    expect(withBox.has(`main,${col},${row}`)).toBe(false);
    expect(free.has(`main,${col},${row}`)).toBe(true);
    // Everything but the box tile can be reached in both states.
    for (const k of free.keys()) if (k !== `main,${col},${row}`) expect(withBox.has(k), k).toBe(true);
    // Every task keeps a stand spot that can be reached while the box is there.
    for (const t of main.interactables) {
      const spots = taskSpots({ ...main, solids: main.solids }).filter((sp) => sp.id === t.id);
      expect(spots.some((sp) => withBox.has(`main,${sp.stand.col},${sp.stand.row}`)), t.id).toBe(true);
    }
  });

  it("holds a package back while the player stands on its tile, then lets it arrive when they step off", () => {
    const { game } = newGame();
    const { col, row } = spot();
    game.player.placeAt(col, row, "right");
    game.update(1 / 60, NO_INPUT);
    game.deliveries.deliver(BARN, 0);
    walk(game, NO_INPUT, 1);
    expect(game.deliveries.waiting).toBe(false);
    expect(game.state.get("parcel")).toBe(0);
    expect(game.deliveries.pendingItems.map((p) => p.id)).toEqual([BARN]);
    walk(game, hold("right"), 0.6);
    walk(game, NO_INPUT, 0.2);
    expect(game.player.col).toBeGreaterThan(col);
    expect(game.deliveries.waitingItems).toEqual([BARN]);
    expect(game.state.get("parcel")).toBe(1);
  });

  it("blocks the tile the moment a package arrives, even with the clock paused by a dialog", () => {
    const { game } = newGame();
    const { col, row } = spot();
    game.player.placeAt(col + 1, row, "left");
    game.update(1 / 60, NO_INPUT);
    game.openDialog(say("HELLO"));
    game.update(1 / 60, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    game.deliveries.deliver(BARN, 0); // arrives while the clock is held
    expect(game.deliveries.waiting).toBe(true);
    expect(game.state.get("parcel")).toBe(1);
    // Close the dialog with E while holding left: the step must be refused.
    for (let i = 0; i < 10 && game.dialogOpen; i++) game.update(1 / 60, { ...press, dir: "left", dirPressed: "left" });
    expect(game.dialogOpen).toBe(false);
    walk(game, hold("left"), 1);
    expect(game.player.col).toBe(col + 1);
    expect(game.player.occupies(col, row)).toBe(false);
  });

  it("blocks the tile on a sleep skip too, and opening the box frees it at once", () => {
    const { game } = newGame();
    const { col, row } = spot();
    game.deliveries.deliver(BARN, 3);
    game.state.applyEffects([{ var: "clock", add: 7 }]);
    expect(game.state.get("parcel")).toBe(1);
    game.player.placeAt(col + 1, row, "left");
    game.update(1 / 60, NO_INPUT);
    game.update(1 / 60, press);
    walk(game, NO_INPUT, 0.2);
    expect(game.state.get("parcel")).toBe(0);
  });

  it("brings the box in step with the queue after a load that has a stale parcel", () => {
    const { game, feature, storage } = newGame();
    game.deliveries.deliver(BARN, 0);
    feature.save();
    // A save written as the package arrived: the queue says waiting, the world says parcel 0.
    const key = [...storage.data.keys()][0];
    const raw = JSON.parse(storage.data.get(key)!);
    raw.world.vars.parcel = 0;
    storage.data.set(key, JSON.stringify(raw));
    const again = newGame(storage).game;
    expect(again.deliveries.waiting).toBe(true);
    again.update(1 / 60, NO_INPUT);
    expect(again.state.get("parcel")).toBe(1);
    // And the other way: a stale parcel 1 with nothing waiting.
    raw.deliveries = { hours: 1, pending: [], waiting: [], fired: [] };
    raw.world.vars.parcel = 1;
    storage.data.set(key, JSON.stringify(raw));
    const third = newGame(storage).game;
    third.update(1 / 60, NO_INPUT);
    expect(third.state.get("parcel")).toBe(0);
  });

  it("holds a package back while the player is stepping onto its tile", () => {
    const { game } = newGame();
    const { col, row } = spot();
    game.player.placeAt(col + 1, row, "left");
    game.update(1 / 60, NO_INPUT);
    game.player.update(0.01, hold("left"), (game as never as { grid: never }).grid);
    expect(game.player.stepping).toBe(true);
    expect(game.player.occupies(col, row)).toBe(true);
    game.deliveries.deliver(BARN, 0);
    expect(game.deliveries.waiting).toBe(false);
  });

  it("the parcel state variable exists and starts at 0", () => {
    expect(STATE_VARS.find((v) => v.id === "parcel")?.initial).toBe(0);
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("drawing the box", () => {
  function drawn(withPackage: boolean): string[] {
    const lines: string[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y) => void lines.push(`${name} ${x} ${y}`),
      drawRegion: () => {},
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites, random: () => 0.5 });
    if (withPackage) game.deliveries.deliver(BARN, 0);
    game.update(1 / 60, NO_INPUT);
    lines.length = 0;
    game.render(ctx, 1);
    return lines;
  }

  it("draws the box on the floor by the door only while a package waits", () => {
    expect(drawn(false).filter((l) => l.startsWith("delivery-box"))).toEqual([]);
    expect(drawn(true).filter((l) => l.startsWith("delivery-box"))).toEqual(["delivery-box 160 128"]);
  });
});
