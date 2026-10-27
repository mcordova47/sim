import { describe, expect, it } from "vitest";
import { ENCOUNTERS } from "./config";
import { barRects, drawTransition, entranceFrames, exitFrames, transitionFrame } from "./encounter-transition";

const screen = { width: 320, height: 192 };
const E = ENCOUNTERS.entrance;

describe("the entrance timeline", () => {
  it("runs about 0.8 seconds (48 frames), and the exit is quicker", () => {
    expect(entranceFrames(false)).toBe(48);
    expect(exitFrames(false)).toBeLessThan(entranceFrames(false) / 2);
  });

  it("is the same every time: a pure function of the frame", () => {
    for (const f of [0, 7, 20, 40, 60]) expect(transitionFrame("enter", f, false)).toEqual(transitionFrame("enter", f, false));
  });

  it("buzzes first (a tiny shake), flashes twice, covers with bars, then parts to show the card", () => {
    const frames = Array.from({ length: entranceFrames(false) + 1 }, (_, f) => transitionFrame("enter", f, false));
    expect(frames.some((t) => t.shake.x !== 0)).toBe(true);
    for (const t of frames) expect(Math.abs(t.shake.x)).toBeLessThanOrEqual(E.shakePixels);
    // Two separate flashes.
    const flashes = frames.filter((t, i) => t.flash > 0 && (i === 0 || frames[i - 1].flash === 0)).length;
    expect(flashes).toBe(2);
    const fullyCovered = frames.findIndex((t) => t.cover >= 1);
    const firstCard = frames.findIndex((t) => t.card);
    expect(fullyCovered).toBeGreaterThan(E.shakeFrames - 1);
    expect(firstCard).toBeGreaterThan(fullyCovered);
    // The card is never shown with no bars over it until the very end.
    expect(frames.slice(0, fullyCovered).every((t) => !t.card)).toBe(true);
    expect(frames.at(-1)!.done).toBe(true);
    expect(frames.at(-2)!.done).toBe(false);
    expect(frames.at(-1)!.card).toBe(true);
    expect(barRects(frames.at(-1)!.cover, frames.at(-1)!.part, screen)).toEqual([]);
  });

  it("the exit shows the card under the bars, then the room as they part", () => {
    const n = exitFrames(false);
    const frames = Array.from({ length: n + 1 }, (_, f) => transitionFrame("exit", f, false));
    expect(frames[0].card).toBe(true);
    expect(frames[E.exitCoverFrames - 1].cover).toBe(1);
    expect(frames[E.exitCoverFrames].card).toBe(false);
    expect(frames[n - 1].done).toBe(false);
    expect(frames[n].done).toBe(true);
  });
});

describe("the bars", () => {
  const covered = (r: { w: number }[]) => r.every((b) => b.w === screen.width);
  it("alternate sides, cover the whole screen, and leave through the far side", () => {
    const mid = barRects(0.5, 0, screen);
    expect(mid).toHaveLength(E.bars);
    expect(mid[0].x).toBe(0);
    expect(mid[1].x + mid[1].w).toBe(screen.width);
    expect(covered(barRects(1, 0, screen))).toBe(true);
    // The bars tile the screen height exactly.
    const full = barRects(1, 0, screen);
    expect(full.reduce((a, b) => a + b.h, 0)).toBe(screen.height);
    const parting = barRects(1, 0.25, screen);
    expect(parting[0].x + parting[0].w).toBe(screen.width);
    expect(parting[1].x).toBe(0);
    expect(barRects(0, 0, screen)).toEqual([]);
  });
});

describe("reduced motion", () => {
  it("has no shake, flash or bars, only a fade in and a quicker fade out", () => {
    for (const phase of ["enter", "exit"] as const) {
      const n = phase === "enter" ? entranceFrames(true) : exitFrames(true);
      for (let f = 0; f <= n; f++) {
        const t = transitionFrame(phase, f, true);
        expect(t.shake).toEqual({ x: 0, y: 0 });
        expect(t.flash).toBe(0);
        expect(barRects(t.cover, t.part, screen)).toEqual([]);
      }
    }
    expect(entranceFrames(true)).toBeLessThan(entranceFrames(false) / 2);
    const fade = [0, 6, 12].map((f) => transitionFrame("enter", f, true).cardAlpha);
    expect(fade[0]).toBe(0);
    expect(fade[1]).toBeGreaterThan(0);
    expect(fade[2]).toBe(1);
    expect(transitionFrame("exit", 4, true).cardAlpha).toBeLessThan(1);
  });
});

describe("drawing", () => {
  it("fills bars and a flash with palette colours, and shakes by copying the canvas, using no real canvas", () => {
    const calls: string[] = [];
    const ctx = {
      canvas: {},
      set fillStyle(v: string) {
        calls.push(`style:${v}`);
      },
      fillRect: (x: number, y: number, w: number, h: number) => calls.push(`rect:${x},${y},${w},${h}`),
      drawImage: (_c: unknown, x: number, y: number) => calls.push(`shift:${x},${y}`),
    } as unknown as CanvasRenderingContext2D;
    drawTransition(ctx, transitionFrame("enter", 6, false), screen);
    expect(calls.some((c) => c.startsWith("shift:"))).toBe(true);
    expect(calls.filter((c) => c.startsWith("rect:0,0,320,192"))).toHaveLength(1);
    calls.length = 0;
    drawTransition(ctx, transitionFrame("enter", 40, false), screen);
    expect(calls.filter((c) => c.startsWith("rect:")).length).toBe(E.bars);
  });
});
