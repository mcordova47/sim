import { afterEach, describe, expect, it, vi } from "vitest";
import { reducedMotionAsked } from "./reduced-motion";

describe("reducedMotionAsked", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("is false with no matchMedia, and follows the prefers-reduced-motion query", () => {
    expect(reducedMotionAsked()).toBe(false);
    const asked: string[] = [];
    vi.stubGlobal("matchMedia", (q: string) => (asked.push(q), { matches: true }));
    expect(reducedMotionAsked()).toBe(true);
    expect(asked).toEqual(["(prefers-reduced-motion: reduce)"]);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(reducedMotionAsked()).toBe(false);
  });
});
