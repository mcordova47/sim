import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS_UI as UI, VIEW } from "../config";
import { ACHIEVEMENTS } from "./data";
import { TOAST_AVOID, ToastQueue, toastHeight } from "./toasts";

const intersects = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const run = (q: ToastQueue, seconds: number, step = 1 / 30, each?: () => void) => {
  for (let t = 0; t < seconds; t += step) {
    q.update(step);
    each?.();
  }
};

describe("ToastQueue", () => {
  it("shows a toast, then removes it after its time", () => {
    const q = new ToastQueue();
    q.push("Name", "A description.");
    q.update(0);
    expect(q.views()).toHaveLength(1);
    run(q, UI.toastSeconds + 0.1);
    expect(q.views()).toHaveLength(0);
    expect(q.idle).toBe(true);
  });

  it("slides and fades in and out, and is fully shown in between", () => {
    const q = new ToastQueue();
    q.push("Name", "A description.");
    q.update(0);
    expect(q.views()[0].alpha).toBe(0);
    q.update(UI.toastSeconds / 2);
    const mid = q.views()[0];
    expect(mid.alpha).toBe(1);
    q.update(UI.toastSeconds / 2 - UI.toastSlide / 2);
    const leaving = q.views()[0];
    expect(leaving.alpha).toBeGreaterThan(0);
    expect(leaving.alpha).toBeLessThan(1);
    expect(leaving.box.x).toBeLessThan(mid.box.x);
  });

  it("shows no more than the maximum at once; the rest wait", () => {
    const q = new ToastQueue();
    for (let i = 0; i < 5; i++) q.push(`N${i}`, "d");
    q.update(0);
    expect(q.views().map((v) => v.title)).toEqual(["N0", "N1"]);
    run(q, UI.toastSeconds + 0.1);
    expect(q.views().map((v) => v.title)).toEqual(["N2", "N3"]);
  });

  it("never overlaps another toast, the HUD or the screen edge, at any moment", () => {
    const q = new ToastQueue();
    // Long descriptions, with some arriving while others are showing.
    ACHIEVEMENTS.slice(0, 8).forEach((a) => q.push(a.name, a.description));
    const check = () => {
      const views = q.views();
      for (const v of views) {
        expect(v.box.x).toBeGreaterThanOrEqual(0);
        expect(v.box.y).toBeGreaterThanOrEqual(0);
        expect(v.box.x + v.box.w).toBeLessThanOrEqual(VIEW.width);
        expect(v.box.y + v.box.h).toBeLessThanOrEqual(VIEW.height);
        for (const avoid of TOAST_AVOID) expect(intersects(v.box, avoid)).toBe(false);
      }
      for (let i = 0; i < views.length; i++) {
        for (let j = i + 1; j < views.length; j++) expect(intersects(views[i].box, views[j].box)).toBe(false);
      }
    };
    run(q, UI.toastSeconds * 5, 1 / 30, check);
    expect(q.idle).toBe(true);
  });

  it("keeps a toast where it is when the one beside it ends", () => {
    const q = new ToastQueue();
    q.push("One", "a");
    q.update(1);
    q.push("Two", "b");
    q.update(0);
    const before = q.views().find((v) => v.title === "Two")!;
    run(q, UI.toastSeconds - 1 + 0.05);
    const after = q.views().find((v) => v.title === "Two")!;
    expect(after.box.y).toBe(before.box.y);
  });

  it("wraps a description to the toast's width, up to two lines", () => {
    const q = new ToastQueue();
    q.push("Name", "Repeat a task until it pays the minimum.");
    q.update(0);
    const v = q.views()[0];
    expect(v.lines.length).toBeGreaterThan(1);
    expect(v.box.h).toBe(toastHeight(v.lines.length));
  });

  it("can be cleared", () => {
    const q = new ToastQueue();
    q.push("a", "b");
    q.update(0);
    q.clear();
    expect(q.views()).toEqual([]);
    expect(q.idle).toBe(true);
  });
});
