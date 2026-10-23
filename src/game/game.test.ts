import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { Game } from "./game";
import type { Level } from "./level";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

// A flat floor with one task right where the player spawns.
const level: Level = {
  size: { width: 300, height: 120 },
  solids: [{ x: 0, y: 100, w: 300, h: 20 }],
  interactables: [
    {
      id: "sink",
      name: "Do the dishes",
      prompt: "Do the dishes",
      duration: 1,
      points: 20,
      zone: { x: 40, y: 80, w: 40, h: 20 },
    },
  ],
  spawn: { x: 50, y: 86 },
};

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

describe("Game", () => {
  it("settles the player onto the floor", () => {
    const game = new Game(level);
    run(game, 1);
    expect(game.player.grounded).toBe(true);
    expect(game.player.y + game.player.h).toBe(100);
  });

  it("moves the player with input", () => {
    const game = new Game(level);
    run(game, 0.5);
    const x = game.player.x;
    run(game, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(game.player.x).toBeGreaterThan(x);
  });

  it("runs a task: locks the player, then awards points", () => {
    const game = new Game(level);
    run(game, 0.5);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);

    // Held-right input is ignored while the task runs.
    const x = game.player.x;
    run(game, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(game.player.x).toBeLessThan(x + 1);
    expect(game.interaction.busy).toBe(true);

    run(game, 0.6);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(20);
  });

  it("doesn't need a browser to run its logic", () => {
    // update() never touches the canvas; constructing and stepping is enough.
    expect(() => run(new Game(level), 2)).not.toThrow();
  });
});

describe("Game camera", () => {
  // A flat room twice as wide as the view.
  const wide: Level = {
    size: { width: 640, height: 192 },
    solids: [
      { x: 0, y: 176, w: 640, h: 16 },
      { x: -16, y: 0, w: 16, h: 192 },
      { x: 640, y: 0, w: 16, h: 192 },
    ],
    interactables: [],
    spawn: { x: 40, y: 162 },
  };

  it("starts centred on the player, clamped to the left edge", () => {
    expect(new Game(wide).camera.x).toBe(0);
  });

  it("scrolls with the player and stops at the right edge of the room", () => {
    const game = new Game(wide);
    // Inside the dead zone around the middle of the view, nothing scrolls yet.
    run(game, 1, { ...NO_INPUT, moveX: 1 });
    expect(game.camera.x).toBe(0);
    run(game, 2, { ...NO_INPUT, moveX: 1 });
    expect(game.camera.x).toBeGreaterThan(0);
    run(game, 12, { ...NO_INPUT, moveX: 1 });
    expect(game.player.x).toBeGreaterThan(600);
    expect(game.camera.x).toBeLessThanOrEqual(640 - 320);
    expect(game.camera.x).toBeGreaterThan(300);
  });

  it("keeps the player on screen while scrolling", () => {
    const game = new Game(wide);
    for (let i = 0; i < 60 * 12; i++) {
      game.update(dt, { ...NO_INPUT, moveX: 1 });
      const { x } = game.camera.position(1);
      expect(game.player.x - x).toBeGreaterThanOrEqual(0);
      expect(game.player.x + game.player.w - x).toBeLessThanOrEqual(320);
    }
  });
});

describe("Game rendering", () => {
  // A recording stand-in for the canvas, so draw order can be checked without
  // a browser.
  function fakeContext() {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, name: string) => (...args: unknown[]) => {
          calls.push(`${name}(${args.join(",")})`);
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it("draws the world through the camera and the HUD without it", () => {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
    const wideLevel: Level = {
      size: { width: 640, height: 192 },
      solids: [{ x: 0, y: 176, w: 640, h: 16 }],
      interactables: [],
      spawn: { x: 400, y: 162 },
    };
    const game = new Game(wideLevel);
    const { ctx, calls } = fakeContext();
    game.render(ctx, 1);

    const cam = game.camera.position(1);
    expect(cam.x).toBeGreaterThan(0);
    const save = calls.indexOf("save()");
    const translate = calls.indexOf(`translate(${-cam.x},${-cam.y})`);
    const restore = calls.indexOf("restore()");
    expect(save).toBeGreaterThanOrEqual(0);
    expect(translate).toBeGreaterThan(save);
    expect(restore).toBeGreaterThan(translate);

    // The floor is drawn inside the camera transform, in world coordinates.
    const floor = calls.indexOf("fillRect(0,176,640,16)");
    expect(floor).toBeGreaterThan(translate);
    expect(floor).toBeLessThan(restore);

    // Everything after the restore (the HUD) is drawn in screen space.
    expect(calls.slice(restore).some((c) => c.startsWith("fillRect"))).toBe(true);
    expect(calls.slice(restore).some((c) => c.startsWith("translate"))).toBe(false);
    vi.unstubAllGlobals();
  });
});
