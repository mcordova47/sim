import { afterEach, describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { fakeHost } from "./activities/fake-host";
import {
  BaseActivity,
  createActivity,
  hasActivity,
  registerActivity,
  specFor,
  unregisterActivity,
} from "./activity";
import { ACTIVITY } from "./config";
import { say } from "./dialog";
import type { Interactable } from "./interactable";
import { InteractionSystem } from "./interaction";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const escape: Controls = { ...NO_INPUT, keys: ["Escape"] };

const item = (over: Partial<Interactable> = {}): Interactable => ({
  id: "t",
  name: "Task",
  prompt: "Task",
  duration: 1,
  points: 100,
  zones: [{ x: 100, y: 100, w: 20, h: 20 }],
  ...over,
});

// A player facing the task's zone.
const facing = { target: { x: 105, y: 105, w: 10, h: 10 } };

// A made-up kind of activity, to show a new one needs nothing but registering.
class TwoPresses extends BaseActivity {
  cancellable = true;
  private presses = 0;
  update(_dt: number, controls: Controls): void {
    if (controls.interactPressed) this.presses++;
    this.progress = this.presses / 2;
    if (this.presses >= 2) this.finish({ completed: true, quality: 1 });
  }
}

class Scripted extends BaseActivity {
  constructor(private readonly outcome: { completed: boolean; quality?: number }) {
    super();
  }
  update(): void {
    this.finish(this.outcome);
  }
}

afterEach(() => {
  unregisterActivity("two-presses");
  unregisterActivity("scripted");
});

describe("choosing the activity for a task", () => {
  it("is a wait by default, a dialog if the task has one, else what the task names", () => {
    expect(specFor(item()).type).toBe("wait");
    expect(specFor(item({ dialog: say("hi") })).type).toBe("dialog");
    expect(specFor(item({ dialog: say("hi"), activity: { type: "typing" } })).type).toBe("typing");
  });

  it("names the task when the type isn't known", () => {
    expect(() => createActivity(item({ activity: { type: "nope" } }), null)).toThrow(
      'Task "t" has an unknown activity type "nope"',
    );
  });

  it("knows the built-in types", () => {
    for (const type of ["wait", "dialog", "cutscene", "typing", "notes"]) {
      expect(hasActivity(type), type).toBe(true);
    }
  });

  it("explains when an activity needs the game and there is none", () => {
    expect(() => createActivity(item({ dialog: say("hi") }), null)).toThrow(/no host/);
    expect(() => createActivity(item({ activity: { type: "typing" } }), null)).toThrow(/no host/);
  });
});

describe("a new kind of activity needs no change to the interaction system", () => {
  it("runs through the same system, and scores when it finishes", () => {
    registerActivity("two-presses", () => new TwoPresses());
    const sys = new InteractionSystem([item({ activity: { type: "two-presses" } })]);
    sys.update(dt, facing, press); // starts
    expect(sys.busy).toBe(true);
    sys.update(dt, facing, press); // first press
    expect(sys.progress).toBe(0.5);
    expect(sys.busy).toBe(true);
    sys.update(dt, facing, press); // second press
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBeGreaterThan(0);
  });
});

describe("how an activity ends", () => {
  const run = (result: { completed: boolean; quality?: number }, over: Partial<Interactable> = {}) => {
    registerActivity("scripted", () => new Scripted(result));
    const state = new ApartmentState(STATE_VARS);
    const sys = new InteractionSystem(
      [item({ activity: { type: "scripted" }, ...over })],
      undefined,
      state,
    );
    sys.update(dt, facing, press);
    sys.update(dt, facing, NO_INPUT);
    return { sys, state };
  };

  it("pays its usual points when there is no quality", () => {
    const { sys } = run({ completed: true });
    expect(sys.lastCompletion?.award).toMatchObject({ points: 100, qualityFactor: 1 });
  });

  it("scales points between the minimum and maximum by quality", () => {
    const lo = run({ completed: true, quality: 0 }).sys.lastCompletion!.award;
    const mid = run({ completed: true, quality: 0.5 }).sys.lastCompletion!.award;
    const hi = run({ completed: true, quality: 1 }).sys.lastCompletion!.award;
    expect(lo.qualityFactor).toBe(ACTIVITY.minQualityFactor);
    expect(hi.qualityFactor).toBe(ACTIVITY.maxQualityFactor);
    expect(mid.qualityFactor).toBeCloseTo((ACTIVITY.minQualityFactor + ACTIVITY.maxQualityFactor) / 2);
    expect(lo.points).toBe(50);
    expect(mid.points).toBe(100);
    expect(hi.points).toBe(150);
  });

  it("keeps a quality outside 0 to 1 within the limits", () => {
    expect(run({ completed: true, quality: 7 }).sys.lastCompletion!.award.qualityFactor).toBe(
      ACTIVITY.maxQualityFactor,
    );
    expect(run({ completed: true, quality: -3 }).sys.lastCompletion!.award.qualityFactor).toBe(
      ACTIVITY.minQualityFactor,
    );
  });

  it("combines with the points bonus, repeats and the combo", () => {
    const { sys } = run(
      { completed: true, quality: 1 },
      { points: 20, pointsBonus: { var: "dishes", perUnit: 10 } },
    );
    // 1 dirty dish to start with: (20 + 10) * 1.5.
    expect(sys.lastCompletion!.award.points).toBe(45);
  });

  it("applies the task's effects when it completes", () => {
    const { state } = run({ completed: true }, { effects: [{ var: "dishes", add: 2 }] });
    expect(state.get("dishes")).toBe(3);
  });

  it("scores nothing, changes nothing and starts no cooldown when backed out of", () => {
    const { sys, state } = run(
      { completed: false },
      { effects: [{ var: "dishes", add: 2 }], cooldown: 60 },
    );
    expect(sys.scoreboard.score).toBe(0);
    expect(sys.lastCompletion).toBeNull();
    expect(state.get("dishes")).toBe(1);
    expect(sys.cooldownRemaining(sys.nearby ?? item())).toBe(0);
    expect(sys.busy).toBe(false);
    // So it can be tried again at once.
    sys.update(dt, facing, press);
    expect(sys.busy).toBe(true);
  });

  it("tells the game when a task was backed out of, and leaves the combo alone", () => {
    registerActivity("scripted", () => new Scripted({ completed: false }));
    const sys = new InteractionSystem([item({ activity: { type: "scripted" } })]);
    const cancelled: string[] = [];
    sys.onCancelled = (i) => cancelled.push(i.id);
    sys.update(dt, facing, press);
    sys.update(dt, facing, NO_INPUT);
    expect(cancelled).toEqual(["t"]);
    expect(sys.scoreboard.chainLength(sys.time)).toBe(0);
  });
});

describe("backing out with Escape", () => {
  it("cancels an activity that allows it", () => {
    registerActivity("two-presses", () => new TwoPresses());
    const sys = new InteractionSystem([item({ activity: { type: "two-presses" } })]);
    sys.update(dt, facing, press);
    expect(sys.busy).toBe(true);
    sys.update(dt, facing, escape);
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBe(0);
  });

  it("is ignored by an activity that doesn't allow it", () => {
    class Stubborn extends TwoPresses {
      cancellable = false;
    }
    registerActivity("stubborn", () => new Stubborn());
    const sys = new InteractionSystem([item({ activity: { type: "stubborn" } })]);
    sys.update(dt, facing, press);
    sys.update(dt, facing, escape);
    expect(sys.busy).toBe(true);
  });

  it("is only the Escape key: X does not cancel", () => {
    registerActivity("two-presses", () => new TwoPresses());
    const sys = new InteractionSystem([item({ activity: { type: "two-presses" } })]);
    sys.update(dt, facing, press);
    sys.update(dt, facing, { ...NO_INPUT, cancelPressed: true, keys: ["KeyX"] });
    expect(sys.busy).toBe(true);
  });
});

describe("a dialog as an activity", () => {
  it("opens when the task starts and scores only when the dialog closes", () => {
    const f = fakeHost();
    const sys = new InteractionSystem([item({ dialog: say("hi"), duration: 0 })]);
    sys.host = f.host;
    sys.update(dt, facing, press);
    expect(f.dialogs).toHaveLength(1);
    expect(sys.scoreboard.score).toBe(0);
    sys.update(dt, facing, NO_INPUT);
    expect(sys.busy).toBe(true);
    f.closeDialog({ path: ["x"], cancelled: false });
    sys.update(dt, facing, NO_INPUT);
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBeGreaterThan(0);
  });

  it("is backed out of when the player cancels the dialog", () => {
    const f = fakeHost();
    const sys = new InteractionSystem([item({ dialog: say("hi") })]);
    sys.host = f.host;
    sys.update(dt, facing, press);
    f.closeDialog({ path: [], cancelled: true });
    sys.update(dt, facing, NO_INPUT);
    expect(sys.scoreboard.score).toBe(0);
    expect(sys.busy).toBe(false);
  });

  it("is backed out of at once if another dialog is already open", () => {
    const f = fakeHost();
    f.blockDialogs(true);
    const sys = new InteractionSystem([item({ dialog: say("hi") })]);
    sys.host = f.host;
    sys.update(dt, facing, press);
    expect(sys.busy).toBe(false);
    expect(sys.scoreboard.score).toBe(0);
  });
});

describe("the plain wait", () => {
  it("still works as before: progress, and done after its duration", () => {
    const sys = new InteractionSystem([item({ duration: 1 })]);
    sys.update(dt, facing, press);
    for (let i = 0; i < 30; i++) sys.update(dt, facing, NO_INPUT);
    expect(sys.progress).toBeGreaterThan(0.4);
    expect(sys.progress).toBeLessThan(0.6);
    for (let i = 0; i < 40; i++) sys.update(dt, facing, NO_INPUT);
    expect(sys.busy).toBe(false);
    expect(sys.lastCompletion?.award.qualityFactor).toBe(1);
  });
});
