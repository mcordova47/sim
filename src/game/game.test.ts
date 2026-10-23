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
    { S: { color: "mist", tasks: ["sink"] } },
    { tasks: [sinkTask] },
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

describe("Game rooms", () => {
  const door = (to: string, col: number, row: number, facing: "left" | "right") => ({
    to,
    arrive: { col, row, facing },
  });
  // Two rooms side by side: a door in A's east wall to B's west wall, and back.
  const a = parseTileMap(
    ["######", "#..S.#", "#@...1", "######"],
    { S: { tasks: ["sink"] }, "1": { door: door("b", 1, 1, "right") } },
    { id: "a", tasks: [sinkTask] },
  );
  const b = parseTileMap(
    ["#######", "0.@...#", "#######"],
    { "0": { door: door("a", 4, 2, "left") } },
    { id: "b" },
  );

  it("walks through a doorway into the other room, facing away from it", () => {
    const game = new Game({ ...a, facing: "right" }, { a, b });
    const rooms: string[] = [];
    game.events.on("room", (e) => rooms.push(e.id));
    run(game, 1.5, hold("right"));
    expect(rooms).toEqual(["b", ]);
    expect(game.player.facing).toBe("right");
    expect(game.camera.x).toBeLessThan(0); // the small room is centred in the view
  });

  it("goes back the way it came", () => {
    const game = new Game({ ...a, facing: "right" }, { a, b });
    const rooms: string[] = [];
    game.events.on("room", (e) => rooms.push(e.id));
    run(game, 1.5, hold("right"));
    run(game, 1, hold("left"));
    expect(rooms).toEqual(["b", "a"]);
    expect(game.player.facing).toBe("left");
  });

  it("keeps score, cooldowns and listeners across rooms", () => {
    const game = new Game(a, { a, b });
    const done: string[] = [];
    game.events.on("taskComplete", (e) => done.push(e.item.id));
    game.loadLevel(a, 3, 2, "up");
    game.update(dt, press);
    run(game, 1.2);
    expect(done).toEqual(["sink"]);
    const score = game.interaction.scoreboard.score;
    game.loadLevel(b, 2, 1, "left");
    expect(game.interaction.scoreboard.score).toBe(score);
    expect(game.interaction.cooldownRemaining(a.interactables[0])).toBeGreaterThan(0);
    expect(game.player.col).toBe(2);
    expect(game.player.facing).toBe("left");
  });

  it("uses the new room's tasks and walls", () => {
    const game = new Game(a, { a, b });
    game.loadLevel(b, 2, 1, "left");
    expect(game.interaction.nearby).toBeNull();
    run(game, 2, hold("right"));
    expect(game.player.col).toBe(5); // stopped by room b's east wall
  });

  it("refuses to enter a blocked tile or an unknown room", () => {
    const game = new Game({ ...a, facing: "right" }, { a });
    expect(() => game.loadLevel(b, 0, 0, "down")).toThrow("blocked");
    expect(() => run(game, 1.5, hold("right"))).toThrow('"b"');
  });
});

describe("L-shaped objects", () => {
  // The counter (C) is an L: the corner tile at row 2, col 3 is floor.
  const l = parseTileMap(
    ["#######", "#@....#", "#..CC.#", "#..C..#", "#.....#", "#######"],
    { C: { tasks: ["sink"] } },
    { tasks: [sinkTask] },
  );

  it("starts the task when facing a tile of the counter", () => {
    const game = new Game(l);
    game.loadLevel(l, 3, 1, "down"); // above (3,2), a counter tile
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
  });

  it("does nothing when facing the empty corner inside the L's bounding box", () => {
    const game = new Game(l);
    game.loadLevel(l, 5, 3, "left"); // facing (4,3): floor inside the L
    game.update(dt, press);
    expect(game.interaction.nearby).toBeNull();
    expect(game.interaction.busy).toBe(false);
  });
});
