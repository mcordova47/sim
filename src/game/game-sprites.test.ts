import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { Game } from "./game";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;

// A sprite source that only records what it is asked to draw.
class Recorder implements SpriteDrawer {
  drawn: { name: string; x: number; y: number; flip: boolean }[] = [];
  constructor(private readonly available: (name: string) => boolean = () => true) {}
  has(name: string): boolean {
    return this.available(name);
  }
  draw(_ctx: unknown, name: string, x: number, y: number, _size?: unknown, flip = false): void {
    this.drawn.push({ name, x, y, flip });
  }
  names(): string[] {
    return this.drawn.map((d) => d.name);
  }
}

function fakeContext() {
  const fills: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "fillRect" ? (...args: number[]) => fills.push(args.join(",")) : () => {},
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, fills };
}

const MAP = [
  "#######",
  "1.AA..#",
  "#.....#",
  "#..@..#",
  "#.BB..#",
  "#######",
];

function room(): Level {
  return parseTileMap(
    MAP,
    {
      A: { sprite: "thing-above", color: "butter" },
      B: {
        sprite: "thing-below",
        color: "brick",
        variants: [
          { sprite: "b-full", when: [{ var: "dishes", min: 2 }], color: "tangerine" },
          { sprite: "b-empty", color: "leaf" },
        ],
      },
      "1": { door: { to: "elsewhere", arrive: { col: 1, row: 1, facing: "right" } } },
    },
    { id: "main", floor: "floor-wood", wallPieces: "1" },
  );
}

function setup(sprites: SpriteDrawer) {
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
  });
  return new Game(room(), { sprites });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("drawing the room with sprites", () => {
  it("draws floor and wall tiles, a doorway over its wall, and pieces at the top-left of their bounds", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    game.render(fakeContext().ctx, 1);
    const at = (name: string) => sprites.drawn.filter((d) => d.name === name).map((d) => [d.x, d.y]);
    expect(at("floor-wood")).toContainEqual([16, 16]);
    expect(at("floor-wood")).not.toContainEqual([0, 0]); // no floor under walls
    expect(at("wall-back")).toContainEqual([16, 0]);
    expect(at("wall-front")).toContainEqual([16, 80]);
    expect(at("wall-side-right")).toContainEqual([96, 32]);
    // The door tile: its wall, then the doorway over it.
    expect(at("wall-side-left")).toContainEqual([0, 16]);
    expect(at("doorway")).toEqual([[0, 16]]);
    const order = sprites.names();
    expect(order.indexOf("wall-side-left")).toBeLessThan(order.indexOf("doorway"));
    expect(at("thing-above")).toEqual([[32, 16]]);
    expect(at("b-empty")).toEqual([[32, 64]]);
  });

  it("draws whatever is lower on screen in front: the player is behind a piece below and in front of one above", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    game.render(fakeContext().ctx, 1);
    const order = sprites.names();
    const player = order.indexOf("player-idle-down");
    expect(order.indexOf("thing-above")).toBeLessThan(player);
    expect(player).toBeLessThan(order.indexOf("b-empty"));
    // Floors and walls come before every piece and the player.
    expect(order.lastIndexOf("wall-back")).toBeLessThan(order.indexOf("thing-above"));
  });

  it("draws the variant that matches the state, every frame", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    const { ctx } = fakeContext();
    game.state.applyEffects([{ var: "dishes", set: 3 }]);
    game.render(ctx, 1);
    expect(sprites.names()).toContain("b-full");
    expect(sprites.names()).not.toContain("b-empty");
    sprites.drawn = [];
    game.state.applyEffects([{ var: "dishes", set: 0 }]);
    game.render(ctx, 1);
    expect(sprites.names()).toContain("b-empty");
    expect(sprites.names()).not.toContain("b-full");
  });

  it("draws the player from the idle frame for the way they face, and a walk frame while stepping that alternates feet", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    const { ctx } = fakeContext();
    const right = { ...NO_INPUT, dir: "right" as const };
    game.render(ctx, 1);
    expect(sprites.names()).toContain("player-idle-down");

    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      sprites.drawn = [];
      game.update(dt, right);
      game.render(ctx, 1);
      const frame = sprites.names().find((n) => n.startsWith("player-"))!;
      if (seen[seen.length - 1] !== frame) seen.push(frame);
    }
    expect(seen.slice(0, 3)).toEqual(["player-idle-right", "player-walk-right-1", "player-walk-right-2"]);
    sprites.drawn = [];
    game.update(dt, NO_INPUT);
    game.render(ctx, 1);
    expect(sprites.names().filter((n) => n.startsWith("player-"))).toHaveLength(1);
  });

  it("mirrors the right-facing frame when the left one is not drawn", () => {
    const sprites = new Recorder((n) => !(n.startsWith("player-") && n.includes("-left")));
    const game = setup(sprites);
    const { ctx } = fakeContext();
    game.update(0.12, { ...NO_INPUT, dir: "left" });
    game.render(ctx, 1);
    const player = sprites.drawn.find((d) => d.name.startsWith("player-"))!;
    expect(player.name).toBe("player-walk-right-1"); // 0.12s is long enough to turn and start a step
    expect(player.flip).toBe(true);
  });
});

describe("a missing sprite", () => {
  it("falls back to the coloured rectangle and logs once, not every frame", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sprites = new Recorder((n) => n !== "thing-above" && n !== "wall-back");
    const game = setup(sprites);
    const first = fakeContext();
    game.render(first.ctx, 1);
    for (let i = 0; i < 5; i++) game.render(fakeContext().ctx, 1);
    expect(sprites.names()).not.toContain("thing-above");
    // Butter (#f7d154) rectangle for each of the piece's two tiles, and the wall.
    expect(first.fills.filter((f) => f === "32,16,16,16" || f === "48,16,16,16")).toHaveLength(2);
    const missing = warn.mock.calls.map((c) => String(c[0]));
    expect(missing.filter((m) => m.includes('"thing-above"'))).toHaveLength(1);
    expect(missing.filter((m) => m.includes('"wall-back"'))).toHaveLength(1);
    expect(missing).toHaveLength(2);
  });

  it("draws everything as rectangles without a sprite source, and says nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
    const game = new Game(room());
    const { ctx, fills } = fakeContext();
    game.render(ctx, 1);
    expect(fills.length).toBeGreaterThan(20);
    expect(warn).not.toHaveBeenCalled();
  });
});
