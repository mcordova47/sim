import { describe, expect, it } from "vitest";
import { ENERGY, MUSIC, SOUND } from "../config";
import { MoodLift, comboPitch, floorOf, noteKeyPitch, stepEffect, stepGain, stepPitch } from "./decisions";

describe("comboPitch", () => {
  it("is unchanged for a chain of one and climbs with each link", () => {
    expect(comboPitch(1)).toBe(1);
    expect(comboPitch(2)).toBeCloseTo(2 ** (SOUND.combo.semitonesPerStep / 12), 9);
    expect(comboPitch(3)).toBeGreaterThan(comboPitch(2));
    expect(comboPitch(5)).toBeGreaterThan(comboPitch(4));
  });
  it("stops climbing at the cap", () => {
    const top = comboPitch(SOUND.combo.maxSteps + 1);
    expect(comboPitch(SOUND.combo.maxSteps + 2)).toBe(top);
    expect(comboPitch(500)).toBe(top);
  });
  it("copes with nonsense chains", () => {
    expect(comboPitch(0)).toBe(1);
    expect(comboPitch(-3)).toBe(1);
    expect(comboPitch(2.7)).toBe(comboPitch(2));
  });
});

describe("footsteps", () => {
  it("picks the floor by room, defaulting to wood", () => {
    expect(floorOf("main")).toBe("wood");
    expect(floorOf("kitchen")).toBe("stone");
    expect(floorOf("bath")).toBe("tile");
    expect(floorOf("attic")).toBe("wood");
  });
  it("names an effect that exists for every floor", () => {
    for (const floor of new Set([...Object.values(SOUND.floors), SOUND.defaultFloor])) {
      expect(SOUND.effects[stepEffect(floor)], floor).toBeDefined();
    }
    expect(stepEffect("lava")).toBe("stepWood");
  });
  it("is quieter only when tired", () => {
    expect(stepGain(ENERGY.lowBelow)).toBe(1);
    expect(stepGain(100)).toBe(1);
    expect(stepGain(ENERGY.lowBelow - 1)).toBe(SOUND.tiredStepGain);
    expect(SOUND.tiredStepGain).toBeLessThan(1);
  });
  it("wobbles the pitch within its range", () => {
    expect(stepPitch(0.5)).toBe(1);
    expect(stepPitch(0)).toBeCloseTo(1 - SOUND.stepPitchWobble, 9);
    expect(stepPitch(1)).toBeCloseTo(1 + SOUND.stepPitchWobble, 9);
  });
});

describe("noteKeyPitch", () => {
  it("gives each arrow (and its letter) its own note and ignores other keys", () => {
    const pitches = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].map(noteKeyPitch);
    expect(new Set(pitches).size).toBe(4);
    expect(noteKeyPitch("KeyW")).toBe(noteKeyPitch("ArrowUp"));
    expect(noteKeyPitch("KeyQ")).toBeNull();
    expect(noteKeyPitch("Enter")).toBeNull();
  });
});

describe("MoodLift", () => {
  it("does nothing until a step of game time has passed", () => {
    const lift = new MoodLift();
    expect(lift.advance(MUSIC.everyGameMinutes - 0.1, 50)).toBeNull();
    expect(lift.advance(0.2, 50)).toEqual({ var: "mood", add: MUSIC.moodPerStep });
  });
  it("adds a step for each whole step of time, keeping the remainder", () => {
    const lift = new MoodLift();
    expect(lift.advance(MUSIC.everyGameMinutes * 2.5, 10)).toEqual({ var: "mood", add: 2 * MUSIC.moodPerStep });
    expect(lift.advance(MUSIC.everyGameMinutes * 0.5, 10)).toEqual({ var: "mood", add: MUSIC.moodPerStep });
  });
  it("never takes mood past the cap", () => {
    const lift = new MoodLift();
    expect(lift.advance(MUSIC.everyGameMinutes * 5, MUSIC.moodCap - 1)).toEqual({ var: "mood", add: 1 });
    expect(lift.advance(MUSIC.everyGameMinutes, MUSIC.moodCap)).toBeNull();
    expect(lift.advance(MUSIC.everyGameMinutes, 100)).toBeNull();
  });
  it("starts over after a reset", () => {
    const lift = new MoodLift();
    lift.advance(MUSIC.everyGameMinutes - 1, 10);
    lift.reset();
    expect(lift.advance(2, 10)).toBeNull();
  });
});
