import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { TILE, WALK } from "./config";
import { Game } from "./game";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const hold = (dir: Controls["dir"]): Controls => ({ ...NO_INPUT, dir });

const sinkTask = {
  id: "sink",
  name: "Do the dishes",
  prompt: "Do the dishes",
  duration: 1,
  points: 20,
};

// The player starts at @ facing right, with the sink (S) on the next tile.
const level: Level = {
  ...parseTileMap(
    ["##########", "#........#", "#..@S....#", "#........#", "##########"],
    { S: { color: "mist", task: sinkTask } },
  ),
  facing: "right",
};

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

describe("Game", () => {
  it("starts on the spawn tile facing the level's direction", () => {
    const game = new Game(level);
    expect(game.player.col).toBe(3);
    expect(game.player.row).toBe(2);
    expect(game.player.facing).toBe("right");
  });

  it("walks one tile per step with input, and stops on a tile when it is let go", () => {
    const game = new Game(level);
    run(game, WALK.stepTime * 2 + 0.01, hold("left"));
    run(game, 0.5, NO_INPUT);
    expect(game.player.col).toBe(1); // turned left, then two steps (the turn costs a moment)
    expect(game.player.x % TILE).toBe(0);
  });

  it("runs a task: locks the player, then awards points", () => {
    const game = new Game(level);
    run(game, 0.1);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);

    // Held input is ignored while the task runs.
    const { col, row } = game.player;
    run(game, 0.5, hold("left"));
    expect([game.player.col, game.player.row]).toEqual([col, row]);
    expect(game.interaction.busy).toBe(true);

    run(game, 0.6);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(20);
  });

  it("can only use what it is facing", () => {
    const game = new Game({ ...level, facing: "down" });
    run(game, 0.1);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(false);
  });

  it("doesn't need a browser to run its logic", () => {
    // update() never touches the canvas; constructing and stepping is enough.
    expect(() => run(new Game(level), 2)).not.toThrow();
  });
});

// A flat room of the given width, the player near the left wall.
function wideLevel(cols: number, spawnCol = 2): Level {
  const wall = "#".repeat(cols);
  const floor = "#" + ".".repeat(cols - 2) + "#";
  const rows = [wall, floor, floor, floor, floor, floor, floor, floor, floor, floor, floor, wall];
  const open = [...floor];
  open[spawnCol] = "@";
  rows[6] = open.join("");
  return { ...parseTileMap(rows, {}), facing: "right" };
}

describe("Game camera", () => {
  it("holds still in a room that fits the view", () => {
    const game = new Game(wideLevel(20));
    run(game, 3, hold("right"));
    expect(game.camera.x).toBe(0);
  });

  it("starts centred on the player, clamped to the left edge", () => {
    expect(new Game(wideLevel(40)).camera.x).toBe(0);
  });

  it("scrolls with the player and stops at the right edge of the room", () => {
    const game = new Game(wideLevel(40));
    run(game, 1, hold("right"));
    expect(game.camera.x).toBe(0); // still inside the dead zone around the middle
    run(game, 4, hold("right"));
    expect(game.camera.x).toBeGreaterThan(0);
    run(game, 10, hold("right"));
    expect(game.player.col).toBe(38);
    expect(game.camera.x).toBeLessThanOrEqual(40 * TILE - 20 * TILE);
    expect(game.camera.x).toBeGreaterThan(300 - 20);
  });

  it("keeps the player on screen while scrolling", () => {
    const game = new Game(wideLevel(40));
    for (let i = 0; i < 60 * 14; i++) {
      game.update(dt, hold("right"));
      const { x } = game.camera.position(1);
      expect(game.player.x - x).toBeGreaterThanOrEqual(0);
      expect(game.player.x + game.player.w - x).toBeLessThanOrEqual(20 * TILE);
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
    const game = new Game(wideLevel(40, 30));
    const { ctx, calls } = fakeContext();
    game.render(ctx, 1);

    const cam = game.camera.position(1);
    expect(cam.x).toBeGreaterThan(0);
    const save = calls.indexOf("save()");
    const translate = calls.indexOf(`translate(${-cam.x},${-cam.y})`);
    const restore = calls.indexOf("restore()");
    expect(translate).toBeGreaterThan(save);
    expect(restore).toBeGreaterThan(translate);

    // A wall tile is drawn inside the camera transform, in world coordinates.
    const wall = calls.indexOf("fillRect(0,0,16,16)");
    expect(wall).toBeGreaterThan(translate);
    expect(wall).toBeLessThan(restore);

    // Everything after the restore (the HUD) is drawn in screen space.
    expect(calls.slice(restore).some((c) => c.startsWith("fillRect"))).toBe(true);
    expect(calls.slice(restore).some((c) => c.startsWith("translate"))).toBe(false);
    vi.unstubAllGlobals();
  });

  it("draws things nearer the viewer in front: a wall below the player covers them", () => {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
    const game = new Game(level);
    const { ctx, calls } = fakeContext();
    game.render(ctx, 1);
    // Player at col 3 row 2 is drawn at (48,32). The bottom wall row (row 4) is
    // lower on screen, so it comes after the player; the top wall row comes before.
    const player = calls.indexOf("fillRect(48,32,16,16)");
    const topWall = calls.indexOf("fillRect(0,0,16,16)");
    const bottomWall = calls.indexOf("fillRect(0,64,16,16)");
    expect(player).toBeGreaterThan(-1);
    expect(topWall).toBeLessThan(player);
    expect(bottomWall).toBeGreaterThan(player);
    vi.unstubAllGlobals();
  });
});
