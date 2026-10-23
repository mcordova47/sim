import { describe, expect, it } from "vitest";
import { GLYPHS } from "../render/font";
import { pickVariant } from "./appearance";
import { CLOCK, ENERGY, MOOD } from "./config";
import { ApartmentState, formatClock, type StateChange, type StateVar } from "./state";
import { STATE_VARS } from "./state-vars";

const vars: StateVar[] = [
  { id: "dishes", initial: 2, min: 0, max: 5, meaning: "dishes" },
  { id: "energy", initial: 50, min: 0, max: 100, meaning: "energy" },
  { id: "clock", initial: 23, min: 0, max: 24, wrap: true, meaning: "clock" },
];
const make = () => new ApartmentState(vars);

describe("ApartmentState", () => {
  it("starts every variable at its initial value and rejects unknown ones", () => {
    const s = make();
    expect(s.get("dishes")).toBe(2);
    expect(() => s.get("nope")).toThrow(/nope/);
    expect(() => s.applyEffects([{ var: "nope", add: 1 }])).toThrow(/nope/);
  });

  it("rejects bad data: duplicates and starting outside the range", () => {
    expect(() => new ApartmentState([vars[0], vars[0]])).toThrow(/twice/);
    expect(() => new ApartmentState([{ id: "x", initial: 9, min: 0, max: 5, meaning: "" }])).toThrow(/range/);
  });

  it("checks min and max inclusively, with either end optional", () => {
    const s = make();
    expect(s.matches({ var: "dishes", min: 2 })).toBe(true);
    expect(s.matches({ var: "dishes", min: 3 })).toBe(false);
    expect(s.matches({ var: "dishes", max: 2 })).toBe(true);
    expect(s.matches({ var: "dishes", max: 1 })).toBe(false);
    expect(s.matches({ var: "dishes" })).toBe(true);
    expect(s.matchesAll()).toBe(true);
  });

  it("gives the reason of the first unmet requirement, including anyOf ones", () => {
    const s = make();
    expect(s.unmetReason([{ var: "dishes", min: 1, reason: "NO DIRTY DISHES" }])).toBeNull();
    expect(
      s.unmetReason([
        { var: "dishes", min: 1, reason: "A" },
        { var: "dishes", min: 4, reason: "B" },
        { var: "dishes", min: 5, reason: "C" },
      ]),
    ).toBe("B");
    const tired = {
      anyOf: [{ var: "energy", max: 20 }, { var: "clock", min: 22 }],
      reason: "NOT TIRED YET",
    };
    expect(s.unmetReason([tired])).toBeNull(); // late, though not low on energy
    s.applyEffects([{ var: "clock", set: 12 }]);
    expect(s.unmetReason([tired])).toBe("NOT TIRED YET");
    s.applyEffects([{ var: "energy", set: 10 }]);
    expect(s.unmetReason([tired])).toBeNull();
  });

  it("applies add and set effects, clamped to the range", () => {
    const s = make();
    s.applyEffects([{ var: "dishes", add: 1 }, { var: "energy", add: -15 }]);
    expect([s.get("dishes"), s.get("energy")]).toEqual([3, 35]);
    s.applyEffects([{ var: "dishes", add: 99 }, { var: "energy", add: -99 }]);
    expect([s.get("dishes"), s.get("energy")]).toEqual([5, 0]);
    s.applyEffects([{ var: "dishes", set: 0, add: 4 }]); // set wins
    expect(s.get("dishes")).toBe(0);
  });

  it("runs the clock on and wraps it at midnight, forwards and backwards", () => {
    const s = make();
    s.tick(60 / CLOCK.minutesPerSecond * 2); // two game hours
    expect(s.get("clock")).toBeCloseTo(1, 5);
    s.applyEffects([{ var: "clock", add: -2 }]);
    expect(s.get("clock")).toBeCloseTo(23, 5);
    s.applyEffects([{ var: "clock", add: 7 }]);
    expect(s.get("clock")).toBeCloseTo(6, 5);
  });

  it("lets energy fall with the clock, never below zero", () => {
    const s = make();
    s.tick(60 / CLOCK.minutesPerSecond); // one game hour
    expect(s.get("energy")).toBeCloseTo(50 - ENERGY.fallPerHour, 5);
    s.tick(100000);
    expect(s.get("energy")).toBe(0);
  });

  it("reports effects at once, and time only when the whole-number part changes", () => {
    const s = make();
    const log: StateChange[] = [];
    s.onChange = (c) => log.push(c);
    s.applyEffects([{ var: "dishes", add: 0 }]); // no change, no event
    expect(log).toEqual([]);
    s.applyEffects([{ var: "dishes", add: 1 }]);
    expect(log).toEqual([{ id: "dishes", value: 3, previous: 2 }]);

    log.length = 0;
    for (let i = 0; i < 60; i++) s.tick(1 / 60); // one second, a few game minutes
    expect(log.filter((c) => c.id === "clock")).toEqual([]); // still within the hour
    s.tick(60 / CLOCK.minutesPerSecond); // an hour
    expect(log.filter((c) => c.id === "clock").length).toBeGreaterThanOrEqual(1);
    for (const c of log) expect(Math.floor(c.value)).not.toBe(Math.floor(c.previous));
  });
});

describe("formatClock", () => {
  it("formats hours as a 12 hour clock", () => {
    expect(formatClock(0)).toBe("12:00 AM");
    expect(formatClock(7.5)).toBe("7:30 AM");
    expect(formatClock(12)).toBe("12:00 PM");
    expect(formatClock(23.99)).toBe("11:59 PM");
  });

  it("only uses characters the font can draw", () => {
    for (let h = 0; h < 24; h += 0.25) {
      for (const ch of formatClock(h)) if (ch !== " ") expect(GLYPHS[ch], formatClock(h)).toBeDefined();
    }
  });
});

describe("pickVariant", () => {
  const variants = [
    { sprite: "dishes-3", when: [{ var: "dishes", min: 3 }] },
    { sprite: "dishes-1", when: [{ var: "dishes", min: 1 }] },
    { sprite: "dishes-0" },
  ];
  it("picks the first variant whose rule holds, falling back to one with no rule", () => {
    const s = make();
    expect(pickVariant(variants, s)?.sprite).toBe("dishes-1");
    s.applyEffects([{ var: "dishes", set: 4 }]);
    expect(pickVariant(variants, s)?.sprite).toBe("dishes-3");
    s.applyEffects([{ var: "dishes", set: 0 }]);
    expect(pickVariant(variants, s)?.sprite).toBe("dishes-0");
  });

  it("returns null when nothing matches", () => {
    expect(pickVariant([{ sprite: "x", when: [{ var: "dishes", min: 9 }] }], make())).toBeNull();
  });
});

describe("the state variable data", () => {
  it("builds, and has the variables the tasks and HUD rely on", () => {
    const s = new ApartmentState(STATE_VARS);
    for (const id of ["dishes", "bedMade", "energy", "clock"]) expect(s.has(id), id).toBe(true);
  });

  it("says what each one means", () => {
    for (const v of STATE_VARS) expect(v.meaning.length, v.id).toBeGreaterThan(0);
  });
});

describe("state hardening (issue 027)", () => {
  it("rejects a wrapping variable whose min equals its max", () => {
    expect(() => new ApartmentState([{ id: "x", initial: 3, min: 3, max: 3, wrap: true, meaning: "" }])).toThrow(/wraps/);
    expect(() => new ApartmentState([{ id: "x", initial: 3, min: 3, max: 3, meaning: "" }])).not.toThrow();
  });

  it("announces a task's changes only after all its effects have applied", () => {
    const s = new ApartmentState(STATE_VARS);
    s.applyEffects([{ var: "energy", set: 20 }, { var: "bedMade", set: 1 }]);
    const seen: { id: string; energy: number; bedMade: number }[] = [];
    s.onChange = (c) => seen.push({ id: c.id, energy: s.get("energy"), bedMade: s.get("bedMade") });
    // Sleeping: energy back up, bed unmade.
    s.applyEffects([{ var: "energy", set: 100 }, { var: "bedMade", set: 0 }, { var: "clock", add: 7 }]);
    expect(seen).toEqual([
      { id: "energy", energy: 100, bedMade: 0 },
      { id: "bedMade", energy: 100, bedMade: 0 },
      { id: "clock", energy: 100, bedMade: 0 },
    ]);
  });

  it("reports one event per variable even if several effects touch it, and none for a net zero", () => {
    const s = make();
    const log: StateChange[] = [];
    s.onChange = (c) => log.push(c);
    s.applyEffects([{ var: "dishes", add: 1 }, { var: "dishes", add: 1 }]);
    expect(log).toEqual([{ id: "dishes", value: 4, previous: 2 }]);
    log.length = 0;
    s.applyEffects([{ var: "dishes", add: 1 }, { var: "dishes", add: -1 }]);
    expect(log).toEqual([]);
  });

  it("changes nothing if an effect names an unknown variable", () => {
    const s = make();
    expect(() => s.applyEffects([{ var: "dishes", add: 1 }, { var: "nope", add: 1 }])).toThrow(/nope/);
    expect(s.get("dishes")).toBe(2);
  });

  it("applies a tick's clock and energy before announcing either", () => {
    const s = new ApartmentState(STATE_VARS);
    s.applyEffects([{ var: "clock", set: 8.99 }, { var: "energy", set: 50.2 }, { var: "mood", set: MOOD.rest }]);
    const log: { id: string; clock: number; energy: number }[] = [];
    s.onChange = (c) => log.push({ id: c.id, clock: s.get("clock"), energy: s.get("energy") });
    s.tick(60 / CLOCK.minutesPerSecond); // an hour: both cross a whole number
    expect(log.map((l) => l.id)).toEqual(["clock", "energy"]);
    expect(log.every((l) => l.energy === s.get("energy") && l.clock === s.get("clock"))).toBe(true);
  });

  it("reports the clock once per whole in-game hour, 24 times a day, including midnight", () => {
    const s = new ApartmentState(STATE_VARS);
    const hours: number[] = [];
    s.onChange = (c) => c.id === "clock" && hours.push(Math.floor(c.value));
    const frame = 1 / 60;
    const dayOfFrames = Math.round((24 * 60) / CLOCK.minutesPerSecond / frame);
    for (let i = 0; i < dayOfFrames + 5; i++) s.tick(frame); // a few frames over, for rounding
    expect(hours.length).toBe(24);
    expect(hours.slice(0, 3)).toEqual([9, 10, 11]); // starts at 8:00
    expect(hours).toContain(0); // midnight is one event, not two
    expect(hours.filter((h) => h === 0).length).toBe(1);
    // Each event is exactly the next hour: no skipped or doubled hours.
    hours.forEach((h, i) => expect(h).toBe((9 + i) % 24));
    // And the exact time is always there to read.
    expect(Math.floor(s.get("clock"))).toBe(8);
  });
});
