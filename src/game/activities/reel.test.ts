import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { REEL } from "../config";
import type { ReelPic } from "../reel/reel-store";
import { fakeHost } from "./fake-host";
import { ReelActivity, reelLayout, shuffledPass } from "./reel";

const dt = 1 / 60;
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });

// Synthetic pictures only: a flat colour each, so they can be told apart.
const pic = (id: number, portrait = false): ReelPic => {
  const [w, h] = portrait ? [36, 48] : [48, 36];
  return { id, w, h, px: new Uint8Array(w * h).fill(id % 22), palette: 1 };
};
const pics = (n: number) => Array.from({ length: n }, (_, i) => pic(i + 1, i % 3 === 2));

function make(n: number, seed = 1, captions?: readonly string[]) {
  const h = fakeHost(seed);
  h.host.reelPictures = () => pics(n);
  const a = new ReelActivity(h.host, captions);
  a.start();
  return { h, a };
}
const run = (a: ReelActivity, seconds: number) => {
  for (let t = 0; t < seconds; t += dt) a.update(dt, NO_INPUT);
};

describe("ReelActivity", () => {
  it("is a quiet free-form activity", () => {
    const { a } = make(3);
    expect(a.cancellable).toBe(true);
    expect(a.readsKeys).toBe(true);
    expect(a.holdsClock).toBe(true);
  });

  it("advances by itself every 4 seconds", () => {
    const { a } = make(5);
    expect(a.index).toBe(0);
    run(a, REEL.seconds - 0.2);
    expect(a.index).toBe(0);
    run(a, 0.4);
    expect(a.index).toBe(1);
    run(a, REEL.seconds);
    expect(a.index).toBe(2);
  });

  it("goes on early with Right, and the next picture gets its full time", () => {
    const { a } = make(5);
    run(a, 3);
    a.update(dt, keys("ArrowRight"));
    expect(a.index).toBe(1);
    run(a, 3.5);
    expect(a.index).toBe(1);
    run(a, 1);
    expect(a.index).toBe(2);
  });

  it("ends after one pass of at most 6 and completes", () => {
    const { a } = make(20);
    expect(a.pass).toHaveLength(6);
    run(a, REEL.seconds * 5 + 1);
    expect(a.done).toBe(false);
    run(a, REEL.seconds);
    expect(a.done).toBe(true);
    expect(a.result.completed).toBe(true);
  });

  it("with fewer than 6 pictures the pass is all of them", () => {
    const { a } = make(2);
    expect(a.pass).toHaveLength(2);
    run(a, REEL.seconds * 2 + 0.1);
    expect(a.result.completed).toBe(true);
  });

  it("Right on the last picture ends it", () => {
    const { a } = make(1);
    a.update(dt, keys("ArrowRight"));
    expect(a.result.completed).toBe(true);
  });

  it("Escape leaves at once and pays nothing", () => {
    const { a } = make(5);
    run(a, 1);
    a.cancel();
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: false, quiet: true });
  });

  it("with no pictures it ends quietly at the start", () => {
    const { a } = make(0);
    expect(a.done).toBe(true);
    expect(a.result.completed).toBe(false);
  });

  it("never repeats a picture inside a pass, for any seed", () => {
    for (let seed = 1; seed < 60; seed++) {
      const { a } = make(10, seed);
      const ids = a.pass.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("the order follows the injected random source, and different seeds differ", () => {
    const orders = new Set<string>();
    for (let seed = 1; seed < 20; seed++) orders.add(make(10, seed).a.pass.map((p) => p.id).join());
    expect(orders.size).toBeGreaterThan(5);
    expect(make(10, 7).a.pass.map((p) => p.id)).toEqual(make(10, 7).a.pass.map((p) => p.id));
    // A random source stuck at the top of its range still gives a valid pass.
    expect(shuffledPass(pics(8), () => 0.999999).map((p) => p.id).sort()).toHaveLength(6);
  });

  it("one caption per session, from the pool, fixed for the session", () => {
    const { a } = make(3, 4);
    expect(REEL.captions).toContain(a.caption);
    const before = a.caption;
    run(a, 10);
    expect(a.caption).toBe(before);
    expect(make(3, 1, ["Only this."]).a.caption).toBe("Only this.");
    expect(make(3, 1, []).a.caption).toBe("");
  });

  it("no caption in the pool mentions resolution, size or pixels", () => {
    expect(REEL.captions.length).toBeGreaterThanOrEqual(1);
    for (const c of REEL.captions) expect(c).not.toMatch(/pixel|resolution|small|tiny|size|blur|low[- ]res|quality|\bbit\b|8-bit/i);
  });

  it("the layout fits both views and a tap inside the panel is the next picture, outside leaves", () => {
    for (const screen of [{ width: 320, height: 192 }, { width: 224, height: 208 }]) {
      const l = reelLayout(screen);
      expect(l.panel.x).toBeGreaterThanOrEqual(0);
      expect(l.panel.x + l.panel.w).toBeLessThanOrEqual(screen.width);
      expect(l.panel.y + l.panel.h).toBeLessThanOrEqual(screen.height);
      // Both orientations fit the screen at 3x.
      expect(l.screen.w).toBeGreaterThanOrEqual(48 * REEL.scale);
      const { a } = make(4);
      const targets = a.tapTargets(screen);
      const inside = targets.at(-1)!;
      inside.run();
      expect(a.index).toBe(1);
      targets[0].run();
      expect(a.done).toBe(true);
      expect(a.result.completed).toBe(false);
    }
  });
});
