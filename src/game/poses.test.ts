import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import type { Direction } from "./direction";
import { OUTFITS, outfitPrefix } from "./outfits";
import { HELD_ITEMS, POSES } from "./poses";
import { TASKS } from "./tasks";
import { TILE } from "./config";

const dt = 1 / 60;
const press = { ...NO_INPUT, interactPressed: true };

class Recorder implements SpriteDrawer {
  drawn: { name: string; x: number; y: number }[] = [];
  constructor(private readonly available: (name: string) => boolean = () => true) {}
  has(name: string): boolean {
    return this.available(name);
  }
  draw(_ctx: unknown, name: string, x: number, y: number): void {
    this.drawn.push({ name, x, y });
  }
  names(): string[] {
    return this.drawn.map((d) => d.name);
  }
  at(name: string) {
    return this.drawn.filter((d) => d.name === name).map((d) => [d.x, d.y]);
  }
}

const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;

function setup(sprites: SpriteDrawer, state: Record<string, number> = {}) {
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites });
  game.state.applyEffects(Object.entries(state).map(([v, n]) => ({ var: v, set: n })));
  return game;
}

// Puts the player on a tile facing a direction, then starts the task there.
function start(game: Game, col: number, row: number, facing: Direction, id: string) {
  const p = game.player;
  p.col = col;
  p.row = row;
  p.x = p.prevX = col * TILE;
  p.y = p.prevY = row * TILE;
  p.facing = facing;
  game.update(dt, press);
  expect(game.interaction.active?.item.id).toBe(id);
}

function frame(game: Game, sprites: Recorder) {
  sprites.drawn = [];
  game.render(ctx, 1);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const plain = (names: string[]) => names.filter((n) => /^player-(idle|walk)/.test(n));

describe("doing poses", () => {
  // [task, start tile, facing, state to make it startable, the pose, where it goes]
  const cases: [string, number, number, Direction, Record<string, number>, string, number, number][] = [
    ["doomscroll", 5, 4, "down", {}, "player-sit-sofa", 80, 80],
    ["work", 6, 3, "up", {}, "player-type-desk", 128, 32],
    ["drink-coffee", 2, 3, "up", { mug: 1 }, "player-eat-table", 40, 32],
    ["guitar", 1, 4, "down", {}, "player-guitar", 16, 64],
    ["sleep", 11, 4, "right", { bedMade: 1, energy: 10 }, "player-sleep-bed", 192, 32],
  ];

  it.each(cases)("%s draws its pose in place of the plain player", (id, col, row, facing, state, pose, x, y) => {
    const sprites = new Recorder();
    const game = setup(sprites, state);
    frame(game, sprites);
    expect(plain(sprites.names())).toHaveLength(1);
    start(game, col, row, facing, id);
    frame(game, sprites);
    expect(sprites.at(pose)).toEqual([[x, y]]);
    expect(plain(sprites.names())).toEqual([]);
  });

  it("draws the pose after the furniture it overlaps (the desk chair, the bed)", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    start(game, 6, 3, "up", "work");
    frame(game, sprites);
    expect(sprites.names().indexOf("desk-chair")).toBeLessThan(sprites.names().indexOf("player-type-desk"));
    expect(sprites.names().indexOf("desk")).toBeLessThan(sprites.names().indexOf("player-type-desk"));
  });

  it("swaps the hanging guitar for the pose while it plays, and back afterwards", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    frame(game, sprites);
    expect(sprites.names()).toContain("guitar");
    start(game, 1, 4, "down", "guitar");
    frame(game, sprites);
    expect(sprites.names()).not.toContain("guitar");
    expect(sprites.names()).toContain("player-guitar");
    // Backing out puts the plain player and the guitar back.
    game.update(dt, { ...NO_INPUT, keys: ["Escape"] });
    frame(game, sprites);
    expect(game.interaction.active).toBeNull();
    expect(sprites.names()).toContain("guitar");
    expect(sprites.names()).not.toContain("player-guitar");
    expect(plain(sprites.names())).toHaveLength(1);
  });

  it("goes back to the plain player when the task finishes", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    start(game, 6, 3, "up", "work");
    for (let i = 0; i < 60 * 60 && game.interaction.active; i++) game.update(dt, NO_INPUT);
    // The typing game wants keys; back out of it instead.
    game.update(dt, { ...NO_INPUT, keys: ["Escape"] });
    frame(game, sprites);
    expect(sprites.names()).not.toContain("player-type-desk");
    expect(plain(sprites.names())).toHaveLength(1);
  });

  it("falls back to the plain player, logging once, when the pose art is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sprites = new Recorder((n) => n !== "player-sit-sofa");
    const game = setup(sprites);
    start(game, 5, 4, "down", "doomscroll");
    for (let i = 0; i < 5; i++) frame(game, sprites);
    expect(plain(sprites.names())).toHaveLength(1);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"player-sit-sofa"'))).toHaveLength(1);
  });

  it("does not play a pose at a piece it does not belong to", () => {
    const sprites = new Recorder();
    // Working in bed has no pose (the bed pose is for sleeping).
    const game = setup(sprites, { bedMade: 1 });
    start(game, 11, 4, "right", "work-bed");
    frame(game, sprites);
    expect(sprites.names().filter((n) => n.startsWith("player-") && !/idle|walk/.test(n))).toEqual([]);
    expect(plain(sprites.names())).toHaveLength(1);
  });
});

describe("held items", () => {
  it("shows the running task's item over the player when there is no pose", () => {
    const sprites = new Recorder();
    const game = setup(sprites, { bedMade: 1 });
    start(game, 11, 4, "right", "work-bed");
    frame(game, sprites);
    expect(sprites.at("held-laptop-right")).toEqual([[176, 64]]);
    expect(sprites.at("player-idle-right")).toEqual([[176, 64]]);
  });

  it("is the fallback when a task's pose art is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const sprites = new Recorder((n) => n !== "player-guitar");
    const game = setup(sprites);
    start(game, 1, 4, "down", "guitar");
    frame(game, sprites);
    expect(sprites.names()).toContain("held-guitar-down");
    expect(sprites.names()).toContain("guitar");
  });

  it("is not drawn on top of a pose", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    start(game, 6, 3, "up", "work");
    frame(game, sprites);
    expect(sprites.names().filter((n) => n.startsWith("held-"))).toEqual([]);
  });

  it("carries the mug from making the coffee until drinking it", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    frame(game, sprites);
    expect(sprites.names().filter((n) => n.startsWith("held-"))).toEqual([]);
    game.state.applyEffects([{ var: "mug", set: 1 }]);
    frame(game, sprites);
    expect(sprites.names()).toContain("held-mug-down");
    game.state.applyEffects([{ var: "mug", set: 0 }]);
    frame(game, sprites);
    expect(sprites.names().filter((n) => n.startsWith("held-"))).toEqual([]);
  });

  it("follows the way the player faces, and a missing overlay just is not drawn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sprites = new Recorder((n) => n !== "held-mug-left");
    const game = setup(sprites, { mug: 1 });
    game.player.facing = "left";
    for (let i = 0; i < 3; i++) frame(game, sprites);
    expect(plain(sprites.names())).toHaveLength(1);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"held-mug-left"'))).toHaveLength(1);
  });
});

describe("outfits", () => {
  it("draws the everyday clothes by default and the chosen outfit's frames otherwise", () => {
    const sprites = new Recorder();
    const game = setup(sprites);
    frame(game, sprites);
    expect(sprites.names()).toContain("player-idle-down");
    game.state.applyEffects([{ var: "outfit", set: 3 }]);
    frame(game, sprites);
    expect(sprites.names()).toContain("player-pajamas-idle-down");
    expect(sprites.names()).not.toContain("player-idle-down");
    game.update(0.12, { ...NO_INPUT, dir: "right" });
    frame(game, sprites);
    expect(sprites.names().find((n) => n.startsWith("player-"))).toMatch(/^player-pajamas-(idle|walk)-right/);
  });

  it("falls back to the everyday clothes, logging once, when an outfit has no art", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sprites = new Recorder((n) => !n.startsWith("player-out-"));
    const game = setup(sprites, { outfit: 2 });
    for (let i = 0; i < 4; i++) frame(game, sprites);
    expect(sprites.names()).toContain("player-idle-down");
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"player-out-idle-down"'))).toHaveLength(1);
  });

  it("knows its outfits, and an unknown number is the everyday clothes", () => {
    expect(OUTFITS.map((o) => o.id)).toEqual(["home", "casual", "out", "pajamas"]);
    expect(outfitPrefix(1)).toBe("player-casual");
    expect(outfitPrefix(99)).toBe("player");
    expect(outfitPrefix(-1)).toBe("player");
  });
});

describe("the pose data", () => {
  const pieces = Object.values(APARTMENT.rooms).flatMap((l) => l.pieces);

  it("only names poses and held items that exist", () => {
    for (const t of TASKS) {
      if (t.pose) expect(POSES, t.id).toHaveProperty(t.pose);
      if (t.held) expect(HELD_ITEMS, t.id).toContain(t.held);
    }
  });

  it("puts every pose on a piece that exists in a room", () => {
    for (const [name, def] of Object.entries(POSES)) {
      expect(
        pieces.some((p) => p.sprite === def.on),
        name,
      ).toBe(true);
    }
  });

  it("gives each task with a pose a place where that pose plays", () => {
    const rooms = Object.values(APARTMENT.rooms);
    for (const t of TASKS.filter((t) => t.pose)) {
      const def = POSES[t.pose!];
      const there = rooms.some((l) =>
        l.interactables.some(
          (i) => i.id === t.id && l.pieces.some((p) => p.sprite === def.on && p.tiles.some((tile) => i.zones.some((z) => z.x === tile.col * TILE && z.y === tile.row * TILE))),
        ),
      );
      expect(there, t.id).toBe(true);
    }
  });
});
