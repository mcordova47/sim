import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { targetAt } from "../../input/tap";
import { DESKTOP_VIEW, NARROW_VIEW, REEL } from "../config";
import { closeupLayout, gridLayout } from "../reel/gallery";
import type { ReelPic } from "../reel/reel-store";
import { syntheticPic } from "../reel/synthetic-pic";
import { fakeHost } from "./fake-host";
import { ReelActivity } from "./reel";

const dt = 1 / 60;
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });
const views = [DESKTOP_VIEW, NARROW_VIEW];

// Synthetic pictures only: bands of colour that differ by id, never derived from a real photo.
const pics = (n: number): ReelPic[] => Array.from({ length: n }, (_, i) => (i % 3 === 2 ? syntheticPic(36, 48, i + 1) : syntheticPic(48, 36, i + 1)));

function make(n: number, seed = 1, lines?: { phoneLines: readonly string[]; closeupLines: readonly string[] }) {
  const h = fakeHost(seed);
  h.host.reelPictures = () => pics(n);
  const a = new ReelActivity(h.host, lines);
  a.start();
  return { h, a };
}
const press = (a: ReelActivity, ...codes: string[]) => a.update(dt, keys(...codes));

describe("ReelActivity (the sofa scene)", () => {
  it("is a quiet free-form activity that holds the clock", () => {
    const { a } = make(3);
    expect(a.cancellable).toBe(true);
    expect(a.readsKeys).toBe(true);
    expect(a.holdsClock).toBe(true);
  });

  it("picks six of many at random, no repeats, on one screen (no paging)", () => {
    for (let seed = 1; seed < 40; seed++) {
      const { a } = make(20, seed);
      const ids = a.gallery.pics.map((p) => p.id);
      expect(ids).toHaveLength(6);
      expect(new Set(ids).size).toBe(6);
    }
    const orders = new Set<string>();
    for (let seed = 1; seed < 20; seed++) orders.add(make(20, seed).a.gallery.pics.map((p) => p.id).join());
    expect(orders.size).toBeGreaterThan(5);
    expect(make(20, 7).a.gallery.pics.map((p) => p.id)).toEqual(make(20, 7).a.gallery.pics.map((p) => p.id));
  });

  it("with fewer than six it shows what there is; with none it ends quietly paying nothing", () => {
    expect(make(2).a.gallery.pics).toHaveLength(2);
    const { a } = make(0);
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: false, quiet: true });
  });

  it("starts in the phone view and never finishes by itself, however long it runs", () => {
    const { a } = make(6);
    for (let i = 0; i < 60 * 600; i++) a.update(dt, NO_INPUT);
    expect(a.done).toBe(false);
    expect(a.inCloseup).toBe(false);
  });

  it("arrows move the highlight within the six, without wrapping or paging; E opens that picture", () => {
    const { a } = make(6, 3);
    for (let i = 0; i < 4; i++) press(a, "ArrowLeft", "ArrowUp");
    expect(a.gallery.cursor).toBe(0);
    press(a, "ArrowRight");
    expect(a.gallery.cursor).toBe(1);
    press(a, "KeyD");
    press(a, "ArrowDown");
    expect(a.gallery.cursor).toBe(5);
    press(a, "ArrowRight");
    expect(a.gallery.cursor).toBe(5);
    expect(a.gallery.page).toBe(0);
    press(a, "KeyE");
    expect(a.inCloseup).toBe(true);
    expect(a.gallery.pics[a.gallery.cursor]).toBe(a.gallery.pics[5]);
    expect(a.done).toBe(false);
  });

  it("the highlight never rests on an empty cell with a short set", () => {
    const { a } = make(4, 2);
    for (let i = 0; i < 10; i++) press(a, "ArrowDown", "ArrowRight");
    expect(a.gallery.cursor).toBeLessThan(4);
  });

  it("E in the close-up completes (pays); the close-up does not react to arrows", () => {
    const { a } = make(6);
    press(a, "KeyE");
    const at = a.gallery.cursor;
    press(a, "ArrowRight", "ArrowDown");
    expect(a.gallery.cursor).toBe(at);
    expect(a.done).toBe(false);
    press(a, "KeyE");
    expect(a.done).toBe(true);
    expect(a.result.completed).toBe(true);
  });

  it("Escape (cancel) pays nothing from the phone view and from the close-up", () => {
    const phone = make(6).a;
    phone.cancel();
    expect(phone.result).toEqual({ completed: false, quiet: true });
    const close = make(6).a;
    press(close, "KeyE");
    close.cancel();
    expect(close.result).toEqual({ completed: false, quiet: true });
  });

  it("no add, delete, look or other key does anything", () => {
    const { a } = make(6);
    const before = a.gallery;
    press(a, "KeyA", "KeyR", "Delete", "Backspace", "Space", "Enter", "KeyL", "KeyO");
    // (KeyA is left on the wasd pad: it moves, but never adds anything)
    expect(a.gallery.pics).toBe(before.pics);
    press(a, "KeyE");
    const open = a.gallery;
    press(a, "Delete", "Backspace", "KeyS", "KeyR", "Enter", "Space");
    expect(a.gallery).toBe(open);
    expect(a.done).toBe(false);
  });

  it("the phone line is fixed for the session; the caption comes from the pool and is chosen at each open", () => {
    const { a } = make(6, 4);
    expect(REEL.phoneLines).toContain(a.phoneLine);
    const line = a.phoneLine;
    press(a, "ArrowRight", "ArrowDown");
    expect(a.phoneLine).toBe(line);
    expect(a.caption).toBe("");
    press(a, "KeyE");
    expect(REEL.closeupLines).toContain(a.caption);
    expect(make(3, 1, { phoneLines: ["Only this."], closeupLines: ["And this."] }).a.phoneLine).toBe("Only this.");
    expect(make(3, 1, { phoneLines: [], closeupLines: [] }).a.phoneLine).toBe("");
  });

  it("no line in either pool mentions resolution, size or pixels, or claims what a picture shows", () => {
    expect(REEL.phoneLines.length).toBeGreaterThanOrEqual(1);
    expect(REEL.closeupLines.length).toBeGreaterThanOrEqual(1);
    for (const c of [...REEL.phoneLines, ...REEL.closeupLines]) {
      expect(c).not.toMatch(/pixel|resolution|small|tiny|size|blur|low[- ]res|quality|\bbit\b|8-bit|grain|chunk|crisp|soft|dither|game|sim\b/i);
      expect(c).not.toMatch(/\d/);
    }
  });

  it.each(views)("taps equal the drawn list (%#): cells select then open, buttons act, outside leaves", (view) => {
    const layout = gridLayout({ mode: "scene", screen: view, line: "x" });
    const { a } = make(6, 5);
    const t = () => a.tapTargets(view);
    // A tap on another cell moves the highlight; the second tap on it opens.
    const other = a.gallery.cursor === 0 ? 1 : 0;
    const c = layout.cells[other];
    targetAt(t(), c.x + 2, c.y + 2)!.run();
    expect(a.gallery.cursor).toBe(other);
    expect(a.inCloseup).toBe(false);
    targetAt(t(), c.x + 2, c.y + 2)!.run();
    expect(a.inCloseup).toBe(true);
    // In the close-up any tap is DONE (pays).
    targetAt(t(), 5, 5)!.run();
    expect(a.result.completed).toBe(true);

    const b = make(6, 5).a;
    const gap = layout.cells[0].x + layout.cells[0].w + 1;
    const stray = targetAt(b.tapTargets(view), gap, layout.cells[0].y + 2)!;
    stray.run();
    expect(b.done).toBe(false);
    targetAt(b.tapTargets(view), 0, 0)!.run();
    expect(b.result).toEqual({ completed: false, quiet: true });
    for (const btn of layout.phone!.buttons) {
      const d = make(6, 5).a;
      targetAt(d.tapTargets(view), btn.rect.x + 2, btn.rect.y + 2)!.run();
      if (btn.id === "continue") expect(d.inCloseup).toBe(true);
      else expect(d.result).toEqual({ completed: false, quiet: true });
    }
  });

  it("the narrow view has the CONTINUE and LEAVE buttons; the wide view has none", () => {
    expect(gridLayout({ mode: "scene", screen: NARROW_VIEW }).phone!.buttons.map((b) => b.id)).toEqual(["continue", "leave"]);
    expect(gridLayout({ mode: "scene", screen: DESKTOP_VIEW }).phone!.buttons).toEqual([]);
  });

  it.each(views)("lays out inside the view with the highlight on a picture (%#), in the close-up too", (view) => {
    for (const p of [syntheticPic(48, 36, 1), syntheticPic(36, 48, 2)]) {
      const l = closeupLayout({ mode: "scene", screen: view, pic: p, caption: REEL.closeupLines.at(-1) });
      expect(l.pic.x).toBeGreaterThanOrEqual(0);
      expect(l.pic.y + l.pic.h).toBeLessThanOrEqual(l.band!.y);
    }
  });
});
