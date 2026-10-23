import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { VIEW } from "./config";
import type { GameEvents } from "./events";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const jump: Controls = { ...NO_INPUT, jumpPressed: true, jumpHeld: true };
const hold: Controls = { ...NO_INPUT, jumpHeld: true };

const sink: Interactable = {
  id: "sink",
  name: "Do the dishes",
  prompt: "Do the dishes",
  duration: 1,
  points: 20,
  zone: { x: 40, y: 80, w: 40, h: 20 },
};

function level(item: Interactable = sink): Level {
  return {
    size: { width: 300, height: 120 },
    solids: [{ x: 0, y: 100, w: 300, h: 20 }],
    interactables: [item],
    spawn: { x: 50, y: 86 },
  };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

// Subscribes to every event and returns what was announced, in order.
function listen(game: Game) {
  const log: { name: keyof GameEvents; payload: unknown }[] = [];
  for (const name of ["jump", "land", "taskStart", "taskComplete", "taskBlocked"] as const) {
    game.events.on(name, (payload) => log.push({ name, payload }));
  }
  return log;
}
const names = (log: { name: string }[]) => log.map((e) => e.name);

afterEach(() => vi.restoreAllMocks());

describe("Game events", () => {
  it("announces nothing on ordinary frames, including settling at the spawn", () => {
    const game = new Game(level());
    const log = listen(game);
    run(game, 1);
    run(game, 1, { ...NO_INPUT, moveX: 1 });
    run(game, 1, { ...NO_INPUT, moveX: -1 });
    expect(log).toEqual([]);
  });

  it("announces a jump once, on the frame it starts", () => {
    const game = new Game(level());
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, jump);
    expect(names(log)).toEqual(["jump"]);
    run(game, 0.2, hold);
    expect(names(log)).toEqual(["jump"]);
  });

  it("doesn't announce a second jump for a press in mid-air", () => {
    const game = new Game(level());
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, jump);
    run(game, 0.1, hold);
    game.update(dt, jump);
    expect(names(log).filter((n) => n === "jump")).toHaveLength(1);
  });

  it("announces the landing once, with how hard it was", () => {
    const game = new Game(level());
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, jump);
    run(game, 1.5, hold);
    expect(names(log)).toEqual(["jump", "land"]);
    const land = log[1].payload as GameEvents["land"];
    expect(land.speed).toBeGreaterThan(200);
  });

  it("announces a task starting and finishing, with the task and its award", () => {
    const game = new Game(level());
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, press);
    expect(names(log)).toEqual(["taskStart"]);
    expect((log[0].payload as GameEvents["taskStart"]).item.id).toBe("sink");

    run(game, 1.2);
    expect(names(log)).toEqual(["taskStart", "taskComplete"]);
    const done = log[1].payload as GameEvents["taskComplete"];
    expect(done.item.id).toBe("sink");
    expect(done.award).toMatchObject({ points: 20, chain: 1, multiplier: 1 });
  });

  it("announces a refused press while the task is cooling down, once per press", () => {
    const game = new Game(level());
    run(game, 0.5);
    game.update(dt, press);
    run(game, 1.2);
    const log = listen(game);

    game.update(dt, press);
    expect(names(log)).toEqual(["taskBlocked"]);
    expect(log[0].payload).toMatchObject({ reason: "cooldown" });
    expect((log[0].payload as GameEvents["taskBlocked"]).item.id).toBe("sink");

    run(game, 0.5); // no press, no event
    expect(names(log)).toEqual(["taskBlocked"]);
    game.update(dt, press);
    expect(names(log)).toEqual(["taskBlocked", "taskBlocked"]);
  });

  it("doesn't announce a refused press with nothing in reach", () => {
    const game = new Game(level({ ...sink, zone: { x: 200, y: 80, w: 40, h: 20 } }));
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, press);
    expect(log).toEqual([]);
  });

  it("announces a zero-length task as a start followed by a completion", () => {
    const game = new Game(level({ ...sink, duration: 0 }));
    run(game, 0.5);
    const log = listen(game);
    game.update(dt, press);
    expect(names(log)).toEqual(["taskStart", "taskComplete"]);
  });

  it("keeps the game running when a listener throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const game = new Game(level());
    game.events.on("jump", () => {
      throw new Error("broken feature");
    });
    const seen: string[] = [];
    game.events.on("jump", () => seen.push("jump"));
    run(game, 0.5);
    expect(() => game.update(dt, jump)).not.toThrow();
    expect(seen).toEqual(["jump"]);
  });
});

describe("Game layers", () => {
  // A recording stand-in for the canvas.
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

  function stubDocument() {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
  }

  it("updates layers in the order they were added, with the step size", () => {
    const game = new Game(level());
    const order: string[] = [];
    game.addLayer({ update: (d) => order.push(`a:${d.toFixed(4)}`) });
    game.addLayer({ update: (d) => order.push(`b:${d.toFixed(4)}`) });
    game.update(dt, NO_INPUT);
    expect(order).toEqual(["a:0.0167", "b:0.0167"]);
  });

  it("draws world layers inside the camera, after the player, and HUD layers last", () => {
    stubDocument();
    const game = new Game(level());
    const worldCams: { x: number; y: number }[] = [];
    game.addLayer({
      drawWorld: (ctx, cam) => {
        worldCams.push(cam);
        ctx.fillText("world-a", 0, 0);
      },
      drawHud: (ctx) => ctx.fillText("hud-a", 0, 0),
    });
    game.addLayer({
      drawWorld: (ctx) => ctx.fillText("world-b", 0, 0),
      drawHud: (ctx) => ctx.fillText("hud-b", 0, 0),
    });

    const { ctx, calls } = fakeContext();
    game.render(ctx, 1);

    const idx = (c: string) => calls.indexOf(c);
    const cam = game.camera.position(1);
    const save = idx("save()");
    const translate = idx(`translate(${-cam.x},${-cam.y})`);
    const restore = idx("restore()");
    const player = calls.findIndex((c, i) => i > translate && c.startsWith("fillRect(") && c.includes(",10,14)"));

    expect(translate).toBeGreaterThan(save);
    expect(player).toBeGreaterThan(translate);
    expect(idx("fillText(world-a,0,0)")).toBeGreaterThan(player);
    expect(idx("fillText(world-b,0,0)")).toBeGreaterThan(idx("fillText(world-a,0,0)"));
    expect(idx("fillText(world-b,0,0)")).toBeLessThan(restore);
    // HUD layers come after the world is restored, in order, with no transform.
    expect(idx("fillText(hud-a,0,0)")).toBeGreaterThan(restore);
    expect(idx("fillText(hud-b,0,0)")).toBeGreaterThan(idx("fillText(hud-a,0,0)"));
    expect(calls.slice(restore).some((c) => c.startsWith("translate"))).toBe(false);
    // The layer is told where the camera is.
    expect(worldCams[0]).toEqual(cam);
    vi.unstubAllGlobals();
  });

  it("lets a layer have only some of the hooks", () => {
    stubDocument();
    const game = new Game(level());
    game.addLayer({ update: () => {} });
    game.addLayer({ drawHud: (ctx) => ctx.fillText("only-hud", 0, 0) });
    const { ctx, calls } = fakeContext();
    expect(() => {
      game.update(dt, NO_INPUT);
      game.render(ctx, 1);
    }).not.toThrow();
    expect(calls).toContain("fillText(only-hud,0,0)");
    vi.unstubAllGlobals();
  });

  it("stops updating and drawing a layer once it is removed", () => {
    stubDocument();
    const game = new Game(level());
    let updates = 0;
    const remove = game.addLayer({
      update: () => updates++,
      drawHud: (ctx) => ctx.fillText("gone", 0, 0),
    });
    game.update(dt, NO_INPUT);
    remove();
    remove(); // harmless the second time
    game.update(dt, NO_INPUT);
    const { ctx, calls } = fakeContext();
    game.render(ctx, 1);
    expect(updates).toBe(1);
    expect(calls).not.toContain("fillText(gone,0,0)");
    vi.unstubAllGlobals();
  });

  it("changes nothing about the screen when there are no layers", () => {
    stubDocument();
    const withLayer = new Game(level());
    withLayer.addLayer({});
    const without = new Game(level());
    const a = fakeContext();
    const b = fakeContext();
    for (let i = 0; i < 30; i++) {
      withLayer.update(dt, NO_INPUT);
      without.update(dt, NO_INPUT);
    }
    withLayer.render(a.ctx, 1);
    without.render(b.ctx, 1);
    expect(a.calls).toEqual(b.calls);
    expect(VIEW.width).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
