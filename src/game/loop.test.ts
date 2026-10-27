import { describe, expect, it } from "vitest";
import { RENDER_INTERVAL_MS, startLoop, type LoopEnv } from "./loop";

function env() {
  let now = 0;
  let hidden = false;
  let pending: ((t: number) => void) | null = null;
  let vis: () => void = () => {};
  const e: LoopEnv = {
    raf: (cb) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
    now: () => now,
    hidden: () => hidden,
    onVisibility: (l) => (vis = l),
  };
  return {
    e,
    // Runs one animation frame `ms` after the last.
    frame(ms: number) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.(now);
    },
    get waiting() {
      return pending !== null;
    },
    hide() {
      hidden = true;
    },
    show() {
      hidden = false;
      vis();
    },
  };
}

describe("startLoop", () => {
  it("renders at most about 60 a second on a 120 Hz display, and still updates at 60", () => {
    const t = env();
    let updates = 0;
    let renders = 0;
    startLoop({ update: () => updates++, render: () => renders++ }, t.e);
    for (let i = 0; i < 120; i++) t.frame(1000 / 120);
    expect(updates).toBeGreaterThanOrEqual(59);
    expect(updates).toBeLessThanOrEqual(61);
    expect(renders).toBeGreaterThanOrEqual(58);
    expect(renders).toBeLessThanOrEqual(62);
  });

  it.each([75, 90, 144, 165])("draws about 60 a second on a %i Hz display, not a divisor of it", (hz) => {
    const t = env();
    let renders = 0;
    startLoop({ update() {}, render: () => renders++ }, t.e);
    for (let i = 0; i < hz; i++) t.frame(1000 / hz);
    expect(renders).toBeGreaterThanOrEqual(57);
    expect(renders).toBeLessThanOrEqual(61);
  });

  it("does not skip frames on a jittery 60 Hz display", () => {
    const t = env();
    let renders = 0;
    startLoop({ update() {}, render: () => renders++ }, t.e);
    const steps = [16.1, 17.3, 16.4, 16.9, 16.6, 16.7];
    for (let i = 0; i < 60; i++) t.frame(steps[i % steps.length]);
    expect(renders).toBeGreaterThanOrEqual(58);
    expect(renders).toBeLessThanOrEqual(60);
    expect(RENDER_INTERVAL_MS).toBeCloseTo(1000 / 60);
  });

  it("stops while the page is hidden, and carries on without a jump", () => {
    const t = env();
    let updates = 0;
    startLoop({ update: () => updates++, render() {} }, t.e);
    t.frame(17);
    t.hide();
    t.frame(17);
    expect(t.waiting).toBe(false);
    const before = updates;
    // A long time away, then back.
    t.show();
    expect(t.waiting).toBe(true);
    t.frame(17);
    expect(updates - before).toBeLessThanOrEqual(2);
  });

  it("the stop function ends it", () => {
    const t = env();
    let renders = 0;
    const stop = startLoop({ update() {}, render: () => renders++ }, t.e);
    t.frame(17);
    stop();
    t.frame(17);
    expect(renders).toBe(1);
  });
});
