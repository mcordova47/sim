import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { BATTERY, CLOCK, SLEEP_WAKE } from "./config";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";

// Issue 088: the phone battery is a saved level and one task that fills it; nothing else touches it.

const dt = 1 / 60;
const press = { ...NO_INPUT, interactPressed: true };
const rooms = APARTMENT.rooms;
const KEY = "life.progress.v1";
const battery = STATE_VARS.find((v) => v.id === "battery")!;

function doTask(game: Game, id: string): boolean {
  const spot = taskSpots(rooms.main).find((s) => s.id === id)!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  let started = false;
  game.events.on("taskStart", () => (started = true));
  game.update(dt, press);
  for (let i = 0; i < 60 * 30 && game.interaction.busy; i++) game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  return started;
}

describe("the battery variable", () => {
  it("is a 0 to 100 level that starts partly charged", () => {
    expect([battery.min, battery.max]).toEqual([0, 100]);
    expect(battery.initial).toBeGreaterThan(0);
    expect(battery.initial).toBeLessThan(100);
  });

  it("drains with game time at the configured rate, and never below 0", () => {
    const s = new ApartmentState(STATE_VARS);
    s.applyEffects([{ var: "battery", set: 100 }]);
    const secondsPerHour = 60 / CLOCK.minutesPerSecond;
    s.tick(secondsPerHour * 10);
    expect(s.get("battery")).toBeCloseTo(100 - 10 * BATTERY.fallPerHour, 6);
    s.tick(100000);
    expect(s.get("battery")).toBe(0);
  });

  it("drains through skipped time (sleep, a nap) at the gentler sleeping rate", () => {
    const s = new ApartmentState(STATE_VARS);
    s.applyEffects([{ var: "battery", set: 100 }]);
    s.applyEffects([{ var: "clock", add: 8 }]);
    expect(s.get("battery")).toBeCloseTo(100 - 8 * BATTERY.fallPerHour * BATTERY.sleepFactor, 6);
    s.applyEffects([{ var: "clock", wake: SLEEP_WAKE }]);
    expect(s.get("battery")).toBeLessThan(100 - 8 * BATTERY.fallPerHour * BATTERY.sleepFactor);
    s.applyEffects([{ var: "battery", set: 3 }, { var: "clock", add: 100 }]);
    expect(s.get("battery"), "an effect list that sets it wins").toBe(3);
    s.applyEffects([{ var: "clock", add: 100 }]);
    expect(s.get("battery")).toBe(0);
  });

  it("is rounded to sensible numbers: a full phone lasts days, not minutes", () => {
    expect(BATTERY.fallPerHour * 24).toBeLessThan(50);
    expect(BATTERY.doomscrollCost).toBeLessThanOrEqual(10);
    expect(BATTERY.sleepFactor).toBeLessThanOrEqual(1);
  });

  it("is saved, and an old save without it starts at the initial value", () => {
    const storage = new FakeStorage();
    const build = (st: FakeStorage) => {
      const game = new Game(rooms[APARTMENT.start], { rooms, state: new ApartmentState(STATE_VARS) });
      const feature = new AchievementsFeature(game, { storage: st, keys: { addEventListener() {} }, visibility: { addEventListener() {}, hidden: false } as never });
      return { game, feature };
    };
    const first = build(storage);
    first.game.state.applyEffects([{ var: "battery", set: 77 }]);
    first.feature.save();
    expect(build(storage).game.state.get("battery")).toBe(77);
    const old = new FakeStorage();
    old.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { dishes: 2 }, room: "main", col: 3, row: 4, facing: "left" } }));
    expect(build(old).game.state.get("battery")).toBe(battery.initial);
    const bad = new FakeStorage();
    bad.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { battery: 9999 }, room: "main", col: 3, row: 4, facing: "left" } }));
    expect(build(bad).game.state.get("battery")).toBe(100);
    const text = new FakeStorage();
    text.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { battery: "full" }, room: "main", col: 3, row: 4, facing: "left" } }));
    expect(build(text).game.state.get("battery")).toBe(battery.initial);
  });
});

describe("the charge task", () => {
  it("is at the nightstand, with its prop, and its words fit the font", () => {
    const main = rooms.main;
    expect(main.interactables.some((i) => i.id === "charge-phone")).toBe(true);
    expect(main.props?.some((p) => p.sprite === "phone-charger")).toBe(true);
    const t = TASKS.find((x) => x.id === "charge-phone")!;
    for (const text of [t.name, t.prompt, t.flavor ?? ""]) expect(unsupportedChars(text.toUpperCase()), text).toEqual([]);
  });

  it("fills the phone, and can be done at any level and never blocks", () => {
    for (const start of [0, 40, 100]) {
      const game = new Game(rooms.main, { rooms, random: () => 0.5 });
      game.state.applyEffects([{ var: "battery", set: start }]);
      expect(doTask(game, "charge-phone"), `from ${start}`).toBe(true);
      expect(game.state.get("battery")).toBe(100);
    }
  });

  it("waits out a cooldown before it can be done again", () => {
    const game = new Game(rooms.main, { rooms, random: () => 0.5 });
    expect(doTask(game, "charge-phone")).toBe(true);
    expect(doTask(game, "charge-phone")).toBe(false);
    for (let i = 0; i < 61 / dt; i++) game.update(dt, NO_INPUT);
    expect(doTask(game, "charge-phone")).toBe(true);
  });

  it("is the only task that raises the battery, Doomscroll the only one that lowers it, and no task requires it", () => {
    for (const t of TASKS) {
      const touches = (t.effects ?? []).filter((e) => e.var === "battery");
      expect(touches.length > 0, t.id).toBe(t.id === "charge-phone" || t.id === "doomscroll");
      const checks = (t.requires ?? []).flatMap((r) => ("anyOf" in r ? r.anyOf : [r]));
      expect(checks.some((c) => c.var === "battery"), t.id).toBe(false);
    }
  });

  it("a completed Doomscroll takes the configured points, and clamps at 0", () => {
    // Only the sofa's doomscroll is offered (an object offers its first task), and no ad rolls.
    const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "doomscroll") };
    const game = new Game(main, { rooms, random: () => 0.99 });
    game.state.applyEffects([{ var: "battery", set: 80 }]);
    const clock = game.state.get("clock");
    expect(doTask(game, "doomscroll")).toBe(true);
    // The task takes game time too, so allow for the clock's share.
    const hours = game.state.get("clock") - clock;
    expect(game.state.get("battery")).toBeCloseTo(80 - BATTERY.doomscrollCost - hours * BATTERY.fallPerHour, 1);
    game.state.applyEffects([{ var: "battery", set: 2 }]);
    game.update(60, NO_INPUT);
    expect(doTask(game, "doomscroll")).toBe(true);
    expect(game.state.get("battery")).toBe(0);
  });

  it("does not move any other variable", () => {
    const game = new Game(rooms.main, { rooms, random: () => 0.5 });
    const before = Object.fromEntries(STATE_VARS.filter((v) => !["battery", "clock", "energy", "mood", "plantDry"].includes(v.id)).map((v) => [v.id, game.state.get(v.id)]));
    doTask(game, "charge-phone");
    for (const [id, value] of Object.entries(before)) expect(game.state.get(id), id).toBe(value);
  });
});
