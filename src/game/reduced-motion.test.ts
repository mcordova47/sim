import { afterEach, describe, expect, it, vi } from "vitest";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { liveReducedMotion, reducedMotionAsked } from "./reduced-motion";
import { TimeOfDayFeature } from "./time-of-day/feature";

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

describe("the candle under reduced motion (issue 162b)", () => {
  afterEach(() => vi.unstubAllGlobals());
  function fakeMedia(initial: boolean) {
    const listeners: ((e: { matches: boolean }) => void)[] = [];
    const mql = {
      matches: initial,
      addEventListener: (_: string, f: (e: { matches: boolean }) => void) => void listeners.push(f),
      set(v: boolean) { mql.matches = v; listeners.forEach((f) => f({ matches: v })); },
    };
    vi.stubGlobal("matchMedia", () => mql);
    return mql;
  }
  // The radius of the candle's outer glow ring at this total of game hours, in the main room at night.
  function candleRadius(game: Game, feature: TimeOfDayFeature, hours: number) {
    game.deliveries.load({ hours, pending: [], waiting: [], fired: [] });
    const arcs: number[][] = [];
    const ctx = { fillStyle: "", fillRect() {}, beginPath() {}, fill() {}, arc: (...a: number[]) => arcs.push(a.slice(0, 3)) };
    feature.drawWorld(ctx as unknown as CanvasRenderingContext2D, { x: 0, y: 0 });
    return arcs.filter((a) => a[0] === 136 && a[1] === 104).map((a) => a[2]);
  }
  function setup(reducedMotion?: () => boolean) {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, reducedMotion });
    game.decor.own("lamp-candle");
    expect(game.decor.place("lamp-sofa", "lamp-candle")).toBe(true);
    game.state.applyEffects([{ var: "blinds", set: 1 }, { var: "clock", set: 23 }]);
    return { game, feature: new TimeOfDayFeature(game, {}) };
  }
  // Two times chosen so the flicker differs between them.
  const times = (game: Game, feature: TimeOfDayFeature) => [1, 1.3, 1.9, 2.4, 3.1].map((t) => candleRadius(game, feature, t).join());

  it("flickers by default (no matchMedia) and with the setting off", () => {
    const a = setup();
    expect(new Set(times(a.game, a.feature)).size).toBeGreaterThan(1);
    const m = fakeMedia(false);
    const b = setup(liveReducedMotion());
    expect(new Set(times(b.game, b.feature)).size).toBeGreaterThan(1);
    expect(m.matches).toBe(false);
  });
  it("is the same size every frame with the setting on, at the average strength", () => {
    fakeMedia(true);
    const { game, feature } = setup(liveReducedMotion());
    expect(new Set(times(game, feature)).size).toBe(1);
    expect(candleRadius(game, feature, 1)).toEqual([20, 20 * 0.66, 20 * 0.33]);
  });
  it("follows the setting changing while playing, without a reload", () => {
    const m = fakeMedia(false);
    const { game, feature } = setup(liveReducedMotion());
    expect(new Set(times(game, feature)).size).toBeGreaterThan(1);
    m.set(true);
    expect(new Set(times(game, feature)).size).toBe(1);
    m.set(false);
    expect(new Set(times(game, feature)).size).toBeGreaterThan(1);
  });
});
