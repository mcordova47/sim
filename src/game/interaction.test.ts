import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { DEFAULT_TASK_COOLDOWN, INTERACT_BUFFER_TIME, SCORING } from "./config";
import type { Interactable } from "./interactable";
import { InteractionSystem, type CompletionEvent } from "./interaction";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

const fridge: Interactable = {
  id: "fridge",
  name: "Raid the fridge",
  prompt: "Raid the fridge",
  duration: 1,
  points: 10,
  cooldown: 5,
  zone: { x: 100, y: 100, w: 20, h: 20 },
};
const sink: Interactable = {
  id: "sink",
  name: "Do the dishes",
  prompt: "Do the dishes",
  duration: 2,
  points: 20,
  zone: { x: 200, y: 100, w: 20, h: 20 },
};

const at = (x: number, grounded = true) => ({ x, y: 106, w: 10, h: 14, grounded });

function run(sys: InteractionSystem, seconds: number, player = at(105)) {
  for (let i = 0; i < Math.ceil(seconds / dt) + 1; i++) sys.update(dt, player, NO_INPUT);
}

describe("InteractionSystem", () => {
  it("shows the nearby task only while in range", () => {
    const sys = new InteractionSystem([fridge, sink]);
    sys.update(dt, at(105), NO_INPUT);
    expect(sys.nearby).toBe(fridge);
    sys.update(dt, at(150), NO_INPUT);
    expect(sys.nearby).toBeNull();
  });

  it("starts on the interact key and locks until the duration passes", () => {
    const sys = new InteractionSystem([fridge]);
    sys.update(dt, at(105), press);
    expect(sys.busy).toBe(true);
    run(sys, 0.5);
    expect(sys.busy).toBe(true);
    expect(sys.progress).toBeGreaterThan(0.4);
    run(sys, 0.6);
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBe(10);
  });

  it("does not start out of range or in the air", () => {
    const sys = new InteractionSystem([fridge]);
    sys.update(dt, at(150), press);
    expect(sys.busy).toBe(false);
    sys.update(dt, at(105, false), press);
    expect(sys.busy).toBe(false);
  });

  it("enforces the cooldown, using the default when unset", () => {
    const sys = new InteractionSystem([fridge, sink]);
    sys.update(dt, at(105), press);
    run(sys, 1.1);
    expect(sys.cooldownRemaining(fridge)).toBeGreaterThan(0);
    sys.update(dt, at(105), press);
    expect(sys.busy).toBe(false);
    run(sys, 5);
    sys.update(dt, at(105), press);
    expect(sys.busy).toBe(true);

    const fresh = new InteractionSystem([sink]);
    fresh.update(dt, at(205), press);
    run(fresh, 2.1, at(205));
    expect(fresh.cooldownRemaining(sink)).toBeCloseTo(DEFAULT_TASK_COOLDOWN, 0);
  });

  it("reports completions and gives a variety bonus", () => {
    const events: CompletionEvent[] = [];
    const sys = new InteractionSystem([fridge, sink], (e) => events.push(e));
    sys.update(dt, at(105), press);
    run(sys, 1.1);
    sys.update(dt, at(205), press);
    run(sys, 2.1, at(205));
    expect(events.map((e) => e.item.id)).toEqual(["fridge", "sink"]);
    expect(events[0].award.multiplier).toBe(1);
    expect(events[1].award.multiplier).toBeGreaterThan(1);
  });

  it("completes a zero-duration task immediately with finite progress", () => {
    const instant: Interactable = { ...fridge, id: "instant", duration: 0 };
    const sys = new InteractionSystem([instant]);
    expect(sys.progress).toBe(0);
    sys.update(dt, at(105), press);
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBe(10);
    expect(sys.progress).toBe(0);
    // Mid-task progress is never NaN either.
    const zero = { ...instant, id: "zero" };
    const s2 = new InteractionSystem([zero]);
    s2.active = { item: zero, elapsed: 0 };
    expect(s2.progress).toBe(1);
  });

  it("buffers an interact press made just before a task ends", () => {
    const other: Interactable = { ...sink, id: "other", duration: 1, zone: fridge.zone };
    const both = new InteractionSystem([fridge, other]);
    both.update(dt, at(105), press);
    run(both, 1 - 5 * dt);
    expect(both.busy).toBe(true);
    both.update(dt, at(105), press); // pressed a few frames before it ends
    expect(both.busy).toBe(true);
    run(both, 6 * dt);
    expect(both.busy).toBe(true);
    expect(both.active?.item.id).toBe("other");
  });

  it("drops a press older than the buffer", () => {
    const sys = new InteractionSystem([fridge]);
    sys.update(dt, at(150), press); // out of range
    run(sys, INTERACT_BUFFER_TIME + 3 * dt, at(150));
    sys.update(dt, at(105), NO_INPUT);
    expect(sys.busy).toBe(false);
  });

  it("starts the first task that is off cooldown when zones overlap", () => {
    const twin: Interactable = { ...sink, id: "twin", zone: fridge.zone };
    const sys = new InteractionSystem([fridge, twin]);
    sys.update(dt, at(105), press);
    expect(sys.active?.item).toBe(fridge);
    run(sys, 1.1);
    sys.update(dt, at(105), NO_INPUT);
    expect(sys.nearby).toBe(twin);
    sys.update(dt, at(105), press);
    expect(sys.active?.item).toBe(twin);
  });

  it("falls back to the first task in reach when all are cooling down", () => {
    const twin: Interactable = { ...sink, id: "twin", duration: 0, zone: fridge.zone };
    const sys = new InteractionSystem([twin, fridge]);
    sys.update(dt, at(105), press);
    sys.update(dt, at(105), press);
    expect(sys.cooldownRemaining(twin)).toBeGreaterThan(0);
    expect(sys.cooldownRemaining(fridge)).toBe(0);
    expect(sys.nearby).toBe(fridge);
  });

  it("pays minPoints for a task with 0 base points", () => {
    const free: Interactable = { ...fridge, id: "free", points: 0, duration: 0 };
    const sys = new InteractionSystem([free]);
    sys.update(dt, at(105), press);
    expect(sys.scoreboard.score).toBe(SCORING.minPoints);
  });
});
