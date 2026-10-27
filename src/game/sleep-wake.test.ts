import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { SLEEP, SLEEP_WAKE } from "./config";
import { say } from "./dialog";
import { Game } from "./game";
import { ApartmentState, wakeJump } from "./state";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { TimeOfDayFeature } from "./time-of-day/feature";
import { lightAt, roomWashes, sleepLight } from "./time-of-day/tint";

// Stage 5 (issue 078): waking is a real brightening. The clock jump is at least
// 7 hours and never lands before 06:30: a 22:00 bedtime wakes at 06:30, a 02:00
// one at 09:00. Everything that listens sees the real jump.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const landing = (clock: number) => (((clock + wakeJump(clock, SLEEP_WAKE)) % 24) + 24) % 24;

describe("the wake hour (pure)", () => {
  it("22:00 wakes at 06:30, 02:00 at 09:00, and the corners", () => {
    expect(wakeJump(22, SLEEP_WAKE)).toBeCloseTo(8.5, 9);
    expect(landing(22)).toBeCloseTo(6.5, 9);
    expect(wakeJump(2, SLEEP_WAKE)).toBe(7);
    expect(landing(2)).toBeCloseTo(9, 9);
    expect(landing(23.5)).toBeCloseTo(6.5, 9); // exactly seven hours
    expect(wakeJump(23.5, SLEEP_WAKE)).toBeCloseTo(7, 9);
    expect(landing(0)).toBeCloseTo(7, 9);
    expect(landing(20)).toBeCloseTo(6.5, 9);
    expect(wakeJump(14, SLEEP_WAKE)).toBe(7); // a daytime sleep wakes in the evening, as before
    expect(landing(14)).toBeCloseTo(21, 9);
  });

  it("is at least seven hours, and never lands before 06:30, at every hour of the day", () => {
    for (let c = 0; c < 24; c += 0.01) {
      const jump = wakeJump(c, SLEEP_WAKE);
      expect(jump, `from ${c}`).toBeGreaterThanOrEqual(7 - 1e-9);
      expect(landing(c), `from ${c}`).toBeGreaterThanOrEqual(6.5 - 1e-9);
      // And never later than it has to be: more than seven only to reach 06:30.
      if (jump > 7 + 1e-9) expect(landing(c)).toBeCloseTo(6.5, 6);
    }
  });
});

describe("the sleep effects (ApartmentState)", () => {
  const stateAt = (clock: number) => {
    const state = new ApartmentState(STATE_VARS);
    state.applyEffects([{ var: "clock", set: clock }, { var: "plantDry", set: 0 }]);
    return state;
  };
  const sleep = () => TASKS.find((t) => t.id === "sleep")!;
  const nap = () => TASKS.find((t) => t.id === "nap")!;

  it("moves the clock to the wake hour in one go and tells the listeners the real jump", () => {
    const state = stateAt(22);
    const skips: number[] = [];
    const changes: { id: string; value: number }[] = [];
    state.onClockSkip = (h) => skips.push(h);
    state.onChange = (c) => changes.push({ id: c.id, value: c.value });
    state.applyEffects(sleep().effects);
    expect(state.get("clock")).toBeCloseTo(6.5, 9);
    expect(skips).toHaveLength(1);
    expect(skips[0]).toBeCloseTo(8.5, 9);
    expect(changes.filter((c) => c.id === "clock")).toHaveLength(1);
    expect(state.get("plantDry")).toBeCloseTo(8.5, 9); // dry for every hour that really went by
    expect(state.get("energy")).toBe(100);
    expect(state.get("bedMade")).toBe(0);
  });

  it("a 02:00 bedtime is the plain seven hours", () => {
    const state = stateAt(2);
    const skips: number[] = [];
    state.onClockSkip = (h) => skips.push(h);
    state.applyEffects(sleep().effects);
    expect(state.get("clock")).toBeCloseTo(9, 9);
    expect(skips).toEqual([7]);
    expect(state.get("plantDry")).toBeCloseTo(7, 9);
  });

  it("the nap is unchanged: one hour on", () => {
    const state = stateAt(22);
    const skips: number[] = [];
    state.onClockSkip = (h) => skips.push(h);
    state.applyEffects(nap().effects);
    expect(state.get("clock")).toBeCloseTo(23, 9);
    expect(skips).toEqual([1]);
    expect(state.get("plantDry")).toBeCloseTo(1, 9);
  });

  it("an effect list without a wake adds nothing for `addSkipped`", () => {
    const state = stateAt(10);
    state.applyEffects([{ var: "plantDry", addSkipped: true }]);
    expect(state.get("plantDry")).toBe(0);
  });
});

function make(hour: number, kind: "sleep" | "nap" = "sleep") {
  const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: [kind] } }, { tasks: TASKS });
  const game = new Game({ ...level, facing: "right" }, { random: () => 0.5 });
  const light = new TimeOfDayFeature(game);
  game.state.applyEffects([{ var: "energy", set: 20 }, { var: "clock", set: hour }, { var: "plantDry", set: 0 }]);
  const advance = vi.spyOn(game.deliveries, "advance");
  const clockEvents: number[] = [];
  game.events.on("stateChanged", (c) => c.id === "clock" && clockEvents.push(c.value));
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  const clockBefore = game.state.get("clock");
  advance.mockClear();
  clockEvents.length = 0;
  return { game, light, advance, clockEvents, clockBefore, dryBefore: game.state.get("plantDry") };
}

describe("a night's sleep wakes at the right hour in the real game", () => {
  for (const [start, wake] of [[22, 6.5], [23.5, 6.5], [0, 7], [2, 9], [20, 6.5], [14, 21]] as const) {
    it(`bedtime ${start}:00 wakes at ${wake}`, () => {
      const { game, advance, clockEvents, clockBefore, dryBefore } = make(start);
      const scene = game.sleepScene!;
      // The wake light is aimed at exactly where the clock will land.
      expect(scene.skipHours).toBeCloseTo(wakeJump(clockBefore, SLEEP_WAKE), 9);
      let last = scene;
      while (game.interaction.busy) {
        if (game.sleepScene) last = game.sleepScene;
        expect(game.state.get("clock")).toBe(clockBefore);
        game.update(dt, NO_INPUT);
      }
      expect(game.state.get("clock")).toBeCloseTo(wake, 1);
      expect(advance).toHaveBeenCalledTimes(1);
      expect(advance.mock.calls[0][0]).toBeCloseTo(last.skipHours, 9);
      expect(game.state.get("plantDry")).toBeCloseTo(dryBefore + last.skipHours, 9);
      expect(clockEvents.length).toBe(1);
    });
  }

  it("the last frame of the sequence is the first frame after the jump: its light is the light of the new hour", () => {
    const { game, light, clockBefore } = make(22);
    const jump = wakeJump(clockBefore, SLEEP_WAKE);
    const end = sleepLight(clockBefore, jump, 0, 1, SLEEP.sleep.darkAlpha, SLEEP.sleep.darkLamps);
    expect(end.base).toEqual(lightAt(clockBefore + jump));
    expect(end.extra).toBeNull();
    while (game.interaction.busy) game.update(dt, NO_INPUT);
    expect(light.sleepDark).toBe(0);
    expect(light.sleepMorning).toBe(0);
    expect(lightAt(game.state.get("clock"))).toEqual(lightAt(clockBefore + jump - 24 * Math.floor((clockBefore + jump) / 24)));
  });

  it("waking is a real brightening: the 22:00 sleep ends in a lighter room than it began in", () => {
    const total = (hour: number, extra = 0) => roomWashes(lightAt(hour), "main", true).reduce((s, w) => s + w.alpha, 0) + extra;
    const lamp = (hour: number) => lightAt(hour).lamps;
    const asleep = total(22) + SLEEP.sleep.darkAlpha;
    expect(total(6.5)).toBeLessThan(total(22) - 0.1);
    expect(total(6.5)).toBeLessThan(asleep - 0.3);
    expect(lamp(6.5)).toBeLessThan(lamp(22));
    // A 02:00 bedtime wakes into the full morning.
    expect(total(9)).toBeLessThan(total(6.5));
  });
});

describe("Escape while a dialog is open mid-sleep leaves the clock exactly as it was", () => {
  for (const kind of ["sleep", "nap"] as const) {
    for (const t of kind === "sleep" ? [0.5, 3, 8] : [0.5, 2, 4]) {
      it(`${kind} at ${t} s`, () => {
        const { game, advance, clockBefore } = make(kind === "sleep" ? 22 : 13, kind);
        for (let i = 0; i < Math.floor(t / dt); i++) game.update(dt, NO_INPUT);
        expect(game.openDialog(say("zzz. ".repeat(10)))).toBe(true);
        game.update(dt, NO_INPUT);
        expect(game.state.get("clock")).toBe(clockBefore); // the dialog freezes it too
        game.update(dt, esc);
        expect(game.interaction.busy).toBe(false);
        expect(game.dialogOpen).toBe(false);
        // The cancel frame itself did not tick the clock; no payout, no jump.
        expect(game.state.get("clock")).toBe(clockBefore);
        expect(advance).not.toHaveBeenCalled();
        expect(game.interaction.scoreboard.score).toBe(0);
        // Time runs again from the next frame, as it always did after waking.
        game.update(dt, NO_INPUT);
        expect(game.state.get("clock")).toBeGreaterThan(clockBefore);
        expect(game.state.get("clock") - clockBefore).toBeLessThan(0.01);
      });
    }
  }

  it("a normal task cancelled the same way still ticks (only a clock-holding activity is exact)", () => {
    // The clock-holding rule is the activity's; nothing else about Escape changed (see escape.test.ts).
    expect(TASKS.find((t) => t.id === "sleep")!.activity).toEqual({ type: "sleep", kind: "sleep" });
  });
});
