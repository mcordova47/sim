import { describe, expect, it } from "vitest";
import { ENCOUNTERS, SOUND, TIMESTEP } from "../game/config";
import { IntroPreview, frameSeconds, hitFrame, introPlan } from "./lab-intro";

describe("introPlan", () => {
  it("is the game's own schedule, in seconds, with its cues resolved", () => {
    const plan = introPlan();
    const S = ENCOUNTERS.entrance.sounds;
    expect(plan.events).toHaveLength(S.length);
    S.forEach(([frame, cue, semis], i) => {
      expect(plan.events[i].at).toBeCloseTo(frame * TIMESTEP, 9);
      expect(plan.events[i].effect).toBe(SOUND.cues[cue]);
      expect(plan.events[i].effect).not.toBeNull();
      expect(plan.events[i].pitch).toBe(semis === 0 ? undefined : 2 ** (semis / 12));
    });
  });

  it("puts the hit at frame 32 (0.533 s)", () => {
    expect(hitFrame()).toBe(32);
    expect(introPlan().hitAt).toBeCloseTo(32 / 60, 9);
    expect(frameSeconds(60)).toBeCloseTo(1, 9);
  });

  it("takes whatever schedule and cues it is given, and leaves out unknown cues", () => {
    const plan = introPlan([[0, "a", 0], [6, "zzz", 12], [12, "hit", 0]], { a: "fx-a", hit: "fx-h" });
    expect(plan.events.map((e) => e.effect)).toEqual(["fx-a", null, "fx-h"]);
    expect(plan.events[1].pitch).toBe(2);
    expect(plan.hitAt).toBeCloseTo(0.2, 9);
  });
});

function run(plan = introPlan()) {
  const played: { effect: string; pitch: number | undefined; at: number }[] = [];
  const loops: number[] = [];
  let clock = 10;
  const p = new IntroPreview({
    playAt: (effect, pitch, delay) => played.push({ effect, pitch, at: clock + delay }),
    startLoop: () => loops.push(clock),
  });
  p.start(plan, clock);
  for (; clock < 10 + 2; clock += 1 / 60) p.tick(clock);
  return { p, played, loops, t0: 10 };
}

describe("IntroPreview", () => {
  it("hands every cue to the engine once, at its exact time, and the loop starts just before the hit", () => {
    const { played, loops, t0 } = run();
    const plan = introPlan();
    expect(played).toHaveLength(plan.events.length);
    plan.events.forEach((e, i) => expect(played[i].at).toBeCloseTo(t0 + e.at, 6));
    expect(loops).toHaveLength(1);
    expect(loops[0]).toBeGreaterThanOrEqual(t0 + plan.hitAt - 0.05);
    expect(loops[0]).toBeLessThan(t0 + plan.hitAt - 0.05 + 0.02);
  });

  it("does not start the loop before the entrance reaches the hit", () => {
    const loops: number[] = [];
    const p = new IntroPreview({ playAt: () => {}, startLoop: () => loops.push(1) });
    p.start(introPlan(), 0);
    p.tick(0.3);
    expect(loops).toHaveLength(0);
    expect(p.inEntrance).toBe(true);
    p.tick(0.5);
    expect(loops).toHaveLength(1);
    expect(p.inEntrance).toBe(false);
  });

  it("stops: nothing more is played or started", () => {
    const played: string[] = [];
    const loops: number[] = [];
    const p = new IntroPreview({ playAt: (e) => played.push(e), startLoop: () => loops.push(1) });
    p.start(introPlan(), 0);
    p.stop();
    p.tick(5);
    expect(p.running).toBe(false);
    expect(loops).toHaveLength(0);
    expect(played.length).toBeLessThanOrEqual(3);
  });

  it("can be started again from the top", () => {
    const { p, played } = run();
    const n = played.length;
    p.start(introPlan(), 100);
    p.tick(101);
    expect(played.length).toBe(2 * n);
  });
});
