import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { DEFAULT_TASK_COOLDOWN } from "./config";
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
});
