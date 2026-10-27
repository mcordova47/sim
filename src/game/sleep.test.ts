import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { SLEEP, TIME_OF_DAY } from "./config";
import { Game } from "./game";
import { sleepSceneAt, sleepTotal } from "./sleep";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { TimeOfDayFeature } from "./time-of-day/feature";
import { lightAt, mixLight, roomWashes, sleepLight } from "./time-of-day/tint";

// The sleep sequence, stages 1 and 2 (issue 078, docs/sleep.md): the timeline,
// the held clock, Escape at every moment, the light and the banner.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };

function make(task: "sleep" | "nap", vars: Record<string, number> = {}) {
  const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: [task] } }, { tasks: TASKS });
  const game = new Game({ ...level, facing: "right" }, { random: () => 0.5 });
  const light = new TimeOfDayFeature(game);
  game.state.applyEffects(Object.entries({ energy: 20, clock: task === "sleep" ? 22 : 13, ...vars }).map(([id, value]) => ({ var: id, set: value })));
  const advance = vi.spyOn(game.deliveries, "advance");
  const log: string[] = [];
  for (const n of ["taskStart", "taskComplete", "taskCancelled"] as const) game.events.on(n, () => log.push(n));
  // Let the start-of-game frames pass, then press the key (the task starts that frame).
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  // Measured once the task is running (the press frame itself still ticked the clock).
  const clockBefore = game.state.get("clock");
  const snapshot = { energy: game.state.get("energy"), bedMade: game.state.get("bedMade"), plantDry: game.state.get("plantDry"), mood: game.state.get("mood") };
  advance.mockClear();
  return { game, light, advance, log, clockBefore, snapshot };
}

describe("the timeline (pure)", () => {
  it("the task durations are the sum of the phases", () => {
    expect(TASKS.find((t) => t.id === "sleep")!.duration).toBe(sleepTotal(SLEEP.sleep));
    expect(TASKS.find((t) => t.id === "nap")!.duration).toBe(sleepTotal(SLEEP.nap));
    expect(sleepTotal(SLEEP.sleep)).toBe(9);
    expect(sleepTotal(SLEEP.nap)).toBe(5);
  });

  it("falls, holds dark, then wakes toward the new morning", () => {
    const at = (t: number) => sleepSceneAt("sleep", t, 7);
    expect(at(0)).toMatchObject({ phase: "fall", dark: 0, morning: 0, bannerAlpha: 1 });
    expect(at(1)).toMatchObject({ phase: "fall", dark: 0.5, bannerAlpha: 0 });
    expect(at(2)).toMatchObject({ phase: "asleep", dark: 1, morning: 0 });
    expect(at(6.99)).toMatchObject({ phase: "asleep", dark: 1, morning: 0, bannerAlpha: 0 });
    expect(at(8)).toMatchObject({ phase: "wake", dark: 0.5, morning: 0.5, bannerAlpha: 0 });
    expect(at(8.5).bannerAlpha).toBe(0.5);
    expect(at(9)).toMatchObject({ dark: 0, morning: 1, bannerAlpha: 1 });
    expect(at(-3).t).toBe(0);
    expect(at(99).t).toBe(9);
  });

  it("the nap is shorter and lighter", () => {
    expect(sleepSceneAt("nap", 1, 1)).toMatchObject({ phase: "asleep", dark: 1 });
    expect(SLEEP.nap.darkAlpha).toBeLessThan(SLEEP.sleep.darkAlpha);
    expect(SLEEP.nap.lullaby).toBe(false);
  });
});

describe("the light (pure)", () => {
  it("at no dark and no morning it is exactly the hour's light", () => {
    const l = sleepLight(22, 7, 0, 0, 0.38, 0.25);
    expect(l.base).toEqual(lightAt(22));
    expect(l.extra).toBeNull();
    expect(l.lamps).toBe(lightAt(22).lamps);
  });
  it("at full dark it adds the night wash and takes the lamps to a quarter", () => {
    const l = sleepLight(22, 7, 1, 0, 0.38, 0.25);
    expect(l.extra).toEqual({ color: "night", alpha: 0.38 });
    expect(l.lamps).toBeCloseTo(lightAt(22).lamps * 0.25);
  });
  it("at the end of the wake it is exactly the new hour's light (no seam at the jump)", () => {
    const l = sleepLight(22, 7, 0, 1, 0.38, 0.25);
    expect(l.base).toEqual(lightAt(29));
    expect(l.base).toEqual(lightAt(5));
    expect(l.extra).toBeNull();
    expect(l.lamps).toBe(lightAt(5).lamps);
  });
  it("mixes in between", () => {
    const m = mixLight(lightAt(22), lightAt(5), 0.5);
    expect(m.lamps).toBeCloseTo((lightAt(22).lamps + lightAt(5).lamps) / 2);
    expect(mixLight(lightAt(13), lightAt(14), 0)).toEqual(lightAt(13));
  });
});

describe("a night's sleep in the real game", () => {
  it("holds the clock, then jumps seven hours and pays at the very end", () => {
    const { game, light, advance, log, clockBefore, snapshot } = make("sleep");
    expect(game.interaction.busy).toBe(true);
    expect(game.sleepScene?.kind).toBe("sleep");
    let frames = 0;
    let maxDark = 0;
    while (game.interaction.busy && frames < 2000) {
      expect(game.state.get("clock")).toBe(clockBefore);
      expect(advance).not.toHaveBeenCalled();
      game.update(dt, NO_INPUT);
      maxDark = Math.max(maxDark, light.sleepDark);
      frames++;
    }
    // 9 seconds, give or take a frame; the press frame was already one update.
    expect(frames * dt).toBeGreaterThan(8.9);
    expect(frames * dt).toBeLessThan(9.1);
    expect(maxDark).toBe(1);
    expect(game.state.get("clock")).toBeCloseTo(clockBefore + 7 - 24 * Math.floor((clockBefore + 7) / 24), 5);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance).toHaveBeenCalledWith(7);
    expect(game.state.get("energy")).toBe(100);
    expect(game.state.get("bedMade")).toBe(0);
    expect(game.state.get("plantDry")).toBe(snapshot.plantDry + 7);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
    expect(log).toEqual(["taskStart", "taskComplete"]);
    expect(game.sleepScene).toBeNull();
    // The light snaps to plain at the jump: nothing left of the overlay.
    expect(light.sleepDark).toBe(0);
    expect(light.sleepMorning).toBe(0);
  });

  it("the last frame before the end is already the new hour's light", () => {
    const { game, light } = make("sleep");
    let last = game.sleepScene!;
    while (game.interaction.busy) {
      if (game.sleepScene) last = game.sleepScene;
      game.update(dt, NO_INPUT);
    }
    expect(last.morning).toBeGreaterThan(0.99);
    expect(last.dark).toBeLessThan(0.01);
    expect(light.sleepMorning).toBe(0);
  });

  it("the nap is the smaller version: an hour on, +25 energy, no full dark", () => {
    const { game, light, advance, log, clockBefore, snapshot } = make("nap", { energy: 40 });
    let maxDark = 0;
    let frames = 0;
    while (game.interaction.busy && frames < 1000) {
      expect(game.state.get("clock")).toBe(clockBefore);
      game.update(dt, NO_INPUT);
      maxDark = Math.max(maxDark, light.sleepDark);
      frames++;
    }
    expect(frames * dt).toBeGreaterThan(4.9);
    expect(frames * dt).toBeLessThan(5.1);
    expect(game.state.get("clock")).toBeCloseTo(clockBefore + 1, 5);
    expect(game.state.get("energy")).toBeCloseTo(Math.min(100, snapshot.energy + 25), 5);
    expect(advance).toHaveBeenCalledWith(1);
    expect(log).toEqual(["taskStart", "taskComplete"]);
    expect(maxDark).toBe(1); // the follower tracks the scene's `dark`; the wash strength is darkAlpha
    expect(light.sleepDark).toBe(0);
  });
});

describe("Escape at every moment wakes you early with nothing paid", () => {
  const times = [0, 0.5, 1, 2, 4, 7, 8, 8.99];
  for (const kind of ["sleep", "nap"] as const) {
    const total = sleepTotal(SLEEP[kind]);
    const moments = kind === "sleep" ? times : [0, 0.5, 1, 1.5, 3, 3.5, 4, 4.99];
    for (const t of moments) {
      it(`${kind}: Escape at ${t} s`, () => {
        const { game, light, advance, log, clockBefore, snapshot } = make(kind);
        const ran = Math.floor(t / dt);
        for (let i = 0; i < ran; i++) game.update(dt, NO_INPUT);
        expect(game.interaction.busy).toBe(true);
        const restore = SLEEP[kind].escapeRestore;
        game.update(dt, esc);
        expect(game.interaction.busy).toBe(false);
        expect(game.sleepScene).toBeNull();
        expect(game.inputLocked).toBe(false);
        // The clock is exactly where it was (held, and no jump), nothing else changed.
        expect(game.state.get("clock")).toBe(clockBefore);
        expect(game.state.get("energy")).toBe(snapshot.energy);
        expect(game.state.get("bedMade")).toBe(snapshot.bedMade);
        expect(game.state.get("plantDry")).toBe(snapshot.plantDry);
        expect(game.state.get("mood")).toBe(snapshot.mood);
        expect(advance).not.toHaveBeenCalled();
        expect(game.interaction.scoreboard.score).toBe(0);
        expect(log).toEqual(["taskStart", "taskCancelled"]);
        // The light eases back to the hour you lay down at in escapeRestore seconds, with no snap.
        const startDark = light.sleepDark;
        let frames = 0;
        let prev = startDark;
        const first: number[] = [];
        while ((light.sleepDark > 0 || light.sleepMorning > 0) && frames < 200) {
          game.update(dt, NO_INPUT);
          expect(light.sleepDark).toBeLessThanOrEqual(prev + 1e-12);
          prev = light.sleepDark;
          first.push(light.sleepDark + light.sleepMorning);
          frames++;
        }
        // An ease, not a snap: it takes several frames to reach 0 (unless it was nearly 0 already).
        if (startDark + light.sleepMorning > 0.3 || first.length) expect(frames).toBeGreaterThanOrEqual(startDark > 0.3 ? 5 : 0);
        expect(frames * dt).toBeLessThanOrEqual(restore + 2 * dt);
        expect(light.sleepDark).toBe(0);
        expect(light.sleepMorning).toBe(0);
        // (The clock runs on again once you are awake, as it always did.)
        expect(game.state.get("clock")).toBeGreaterThanOrEqual(clockBefore);
        // No cooldown: it can be started again at once.
        game.update(dt, press);
        expect(game.interaction.busy).toBe(true);
        expect(total).toBeGreaterThan(t);
      });
    }
  }

  it("one frame after the end it is a normal, finished sleep (Escape then does nothing)", () => {
    const { game, advance, clockBefore } = make("sleep");
    while (game.interaction.busy) game.update(dt, NO_INPUT);
    game.update(dt, esc);
    expect(advance.mock.calls.filter((c) => c[0] === 7).length).toBe(1);
    expect(game.state.get("energy")).toBeGreaterThan(99.9);
    expect(game.state.get("clock")).not.toBe(clockBefore);
  });

  it("the banner fades while asleep and is back at the end; Escape restores it at once", () => {
    const { game } = make("sleep");
    expect(game.sleepScene!.bannerAlpha).toBe(1);
    for (let i = 0; i < 4 / dt; i++) game.update(dt, NO_INPUT);
    expect(game.sleepScene!.bannerAlpha).toBe(0);
    game.update(dt, esc);
    expect(game.sleepScene).toBeNull(); // the banner code reads 1 with no scene
  });
});

describe("normal play is untouched", () => {
  it("with no scene the tint feature draws what it always did", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const light = new TimeOfDayFeature(game);
    game.state.applyEffects([{ var: "clock", set: 22 }]);
    for (let i = 0; i < 30; i++) game.update(dt, NO_INPUT);
    expect(light.sleepDark).toBe(0);
    expect(roomWashes(lightAt(22.5), "main", true)[0].alpha).toBeCloseTo(TIME_OF_DAY.tint[0].alpha);
  });
});
