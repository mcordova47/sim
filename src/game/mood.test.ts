import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { CLOCK, MOOD } from "./config";
import { Game } from "./game";
import { TASKS } from "./tasks";
import { ApartmentState, type StateChange } from "./state";
import { STATE_VARS } from "./state-vars";
import { parseTileMap } from "./tilemap";

const HOUR = 60 / CLOCK.minutesPerSecond;
const make = () => new ApartmentState(STATE_VARS);
const task = (id: string) => TASKS.find((t) => t.id === id)!;

describe("mood state", () => {
  it("is a 0 to 100 variable that starts in the upper middle", () => {
    const v = STATE_VARS.find((x) => x.id === "mood")!;
    expect([v.min, v.max]).toEqual([0, 100]);
    expect(v.initial).toBeGreaterThan(MOOD.rest);
  });

  it("is clamped by effects", () => {
    const s = make();
    s.applyEffects([{ var: "mood", add: 500 }]);
    expect(s.get("mood")).toBe(100);
    s.applyEffects([{ var: "mood", add: -500 }]);
    expect(s.get("mood")).toBe(0);
  });

  it("drifts toward the middle from above and from below, without overshooting", () => {
    const s = make();
    s.applyEffects([{ var: "mood", set: 90 }]);
    s.tick(HOUR);
    expect(s.get("mood")).toBeCloseTo(90 - MOOD.driftPerHour, 5);
    s.applyEffects([{ var: "mood", set: 10 }]);
    s.tick(HOUR);
    expect(s.get("mood")).toBeCloseTo(10 + MOOD.driftPerHour, 5);
    s.tick(100000);
    expect(s.get("mood")).toBe(MOOD.rest);
    s.applyEffects([{ var: "mood", set: 0 }]);
    s.tick(100000);
    expect(s.get("mood")).toBe(MOOD.rest);
  });

  it("announces drift and effects through onChange", () => {
    const s = make();
    const log: StateChange[] = [];
    s.onChange = (c) => log.push(c);
    s.applyEffects([{ var: "mood", add: 5 }]);
    expect(log).toEqual([{ id: "mood", value: 65, previous: 60 }]);
    log.length = 0;
    s.tick(HOUR);
    expect(log.map((c) => c.id)).toContain("mood");
  });

  it("works in a state without mood (older saves, custom rooms)", () => {
    const s = new ApartmentState(STATE_VARS.filter((v) => v.id !== "mood"));
    expect(() => s.tick(HOUR)).not.toThrow();
  });
});

describe("mood in the task list", () => {
  const moodOf = (id: string) =>
    task(id).effects?.filter((e) => e.var === "mood").reduce((n, e) => n + (e.add ?? 0), 0) ?? 0;

  it("raises mood for guitar, a good meal, light and art, and lowers it for doomscrolling and work", () => {
    for (const id of ["guitar", "eat-dinner", "open-blinds", "admire-art"]) expect(moodOf(id), id).toBeGreaterThan(0);
    for (const id of ["doomscroll", "work", "work-sofa", "work-bed"]) expect(moodOf(id), id).toBeLessThan(0);
  });

  it("undoes the mood from opening the blinds when they are closed again", () => {
    expect(moodOf("close-blinds")).toBe(-moodOf("open-blinds"));
  });

  it("keeps every change small and never makes mood a requirement", () => {
    for (const t of TASKS) {
      expect(Math.abs(moodOf(t.id)), t.id).toBeLessThanOrEqual(10);
      const checks = (t.requires ?? []).flatMap((r) => ("anyOf" in r ? r.anyOf : [r]));
      expect(checks.some((c) => c.var === "mood"), t.id).toBe(false);
    }
  });

  it("pays a bonus by mood for guitar", () => {
    expect(task("guitar").pointsBonus?.var).toBe("mood");
  });
});

describe("low mood in the game", () => {
  const room = () =>
    parseTileMap(["#####", "#.@.#", "#####"], {}, {});

  it("sighs once on crossing below the low line, and does not block anything", () => {
    const state = make();
    const game = new Game(room(), { state });
    const seen: string[] = [];
    game.events.on("stateChanged", (c) => seen.push(`${c.id}:${c.value}`));
    state.applyEffects([{ var: "mood", set: MOOD.lowBelow + 1 }]);
    state.applyEffects([{ var: "mood", set: MOOD.lowBelow - 1 }]);
    expect(seen).toEqual([`mood:${MOOD.lowBelow + 1}`, `mood:${MOOD.lowBelow - 1}`]);
    expect(() => game.update(1 / 60, NO_INPUT)).not.toThrow();
  });
});
