import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { VIEW } from "./config";
import type { GameEvents } from "./events";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const hold = (dir: Controls["dir"]): Controls => ({ ...NO_INPUT, dir });

const sink: Omit<Interactable, "zone"> = {
  id: "sink",
  name: "Do the dishes",
  prompt: "Do the dishes",
  duration: 1,
  points: 20,
};

// A small room. The player starts at @ facing right, with the sink (S) on the
// next tile and a wall to the left after two tiles.
function level(task: Omit<Interactable, "zone"> = sink): Level {
  const map = parseTileMap(
    [
      "##########",
      "#........#",
      "#..@S....#",
      "#........#",
      "##########",
    ],
    { S: { color: "mist", task } },
  );
  return { ...map, facing: "right" };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

// Subscribes to every event and returns what was announced, in order.
function listen(game: Game) {
  const log: { name: keyof GameEvents; payload: unknown }[] = [];
  for (const name of ["step", "bump", "taskStart", "taskComplete", "taskBlocked"] as const) {
    game.events.on(name, (payload) => log.push({ name, payload }));
  }
  return log;
}
const names = (log: { name: string }[]) => log.map((e) => e.name);

afterEach(() => vi.restoreAllMocks());

describe("Game events", () => {
  it("announces nothing while standing still", () => {
    const game = new Game(level());
    const log = listen(game);
    run(game, 2);
    expect(log).toEqual([]);
  });

  it("announces each step once, when the player arrives on the new tile", () => {
    const game = new Game(level());
    game.update(dt, NO_INPUT);
    const log = listen(game);
    // Walk left along the open row: three tiles take just under half a second.
    run(game, 0.2, hold("left")); // turn, then start the first step
    expect(names(log)).toEqual([]);
    run(game, 0.3, hold("left"));
    const steps = log.filter((e) => e.name === "step").map((e) => e.payload as GameEvents["step"]);
    expect(steps.map((s) => s.col)).toEqual([2, 1]);
    expect(steps.every((s) => s.direction === "left" && s.row === 2)).toBe(true);
  });

  it("announces a bump once per push into a wall, and again after letting go", () => {
    const game = new Game(level());
    const log = listen(game);
    run(game, 2, hold("left")); // walk to the wall (two steps), then keep pushing
    expect(names(log)).toEqual(["step", "step", "bump"]);
    expect(log[2].payload).toMatchObject({ col: 0, row: 2, direction: "left" });
    run(game, 0.1, NO_INPUT);
    run(game, 0.5, hold("left"));
    expect(names(log)).toEqual(["step", "step", "bump", "bump"]);
  });

  it("announces nothing for a quick tap that only turns the player", () => {
    const game = new Game(level());
    const log = listen(game);
    run(game, 0.05, hold("up"));
    run(game, 0.5, NO_INPUT);
    expect(game.player.facing).toBe("up");
    expect(game.player.row).toBe(2);
    expect(log).toEqual([]);
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

  it("doesn't announce a refused press when facing nothing", () => {
    const game = new Game({ ...level(), facing: "up" });
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
    game.events.on("step", () => {
      throw new Error("broken feature");
    });
    const seen: string[] = [];
    game.events.on("step", () => seen.push("step"));
    expect(() => run(game, 0.5, hold("left"))).not.toThrow();
    expect(seen.length).toBeGreaterThan(0);
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

  // A stand-in that really tracks globalAlpha through save and restore, to see
  // whether state leaks from one layer (or frame) into the next.
  function statefulContext() {
    let alpha = 1;
    const stack: number[] = [];
    const alphaAtFill: number[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, name: string) => {
          if (name === "globalAlpha") return alpha;
          if (name === "save") return () => stack.push(alpha);
          if (name === "restore") return () => void (alpha = stack.pop() ?? 1);
          if (name === "fillRect") return () => void alphaAtFill.push(alpha);
          return () => {};
        },
        set: (_t, name: string, value: unknown) => {
          if (name === "globalAlpha") alpha = value as number;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    return { ctx, stack, alphaAtFill, alpha: () => alpha };
  }

  function stubDocument() {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
  }
  const count = (calls: string[], what: string) => calls.filter((c) => c === what).length;

  it("updates layers in the order they were added, with the step size", () => {
    const game = new Game(level());
    const order: string[] = [];
    game.addLayer({ update: (d) => order.push(`a:${d.toFixed(4)}`) });
    game.addLayer({ update: (d) => order.push(`b:${d.toFixed(4)}`) });
    game.update(dt, NO_INPUT);
    expect(order).toEqual(["a:0.0167", "b:0.0167"]);
  });

  it("draws world layers inside the camera, after the player, and HUD layers outside it", () => {
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
    const translate = idx(`translate(${-cam.x},${-cam.y})`);
    const player = calls.findIndex(
      (c, i) => i > translate && c.startsWith("fillRect(") && c.includes(",16,16)"),
    );
    expect(translate).toBeGreaterThan(-1);
    expect(player).toBeGreaterThan(translate);
    expect(idx("fillText(world-a,0,0)")).toBeGreaterThan(player);
    expect(idx("fillText(world-b,0,0)")).toBeGreaterThan(idx("fillText(world-a,0,0)"));
    expect(idx("fillText(hud-a,0,0)")).toBeGreaterThan(idx("fillText(world-b,0,0)"));
    expect(idx("fillText(hud-b,0,0)")).toBeGreaterThan(idx("fillText(hud-a,0,0)"));

    // Just before the first HUD layer draws, exactly one save is still open:
    // that layer's own. So the camera transform has already been undone.
    const before = calls.slice(0, idx("fillText(hud-a,0,0)"));
    expect(count(before, "save()") - count(before, "restore()")).toBe(1);
    // The camera transform is applied once per frame and never again.
    expect(calls.filter((c) => c.startsWith("translate"))).toHaveLength(1);
    // And everything is balanced at the end.
    expect(count(calls, "save()")).toBe(count(calls, "restore()"));
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

  it("changes nothing about the screen when a layer has no hooks", () => {
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

  // A stand-in that tracks the translation, alpha and composite mode through
  // save, restore, translate and setTransform. Only translations are used here.
  function transformContext() {
    type State = { tx: number; ty: number; alpha: number; op: string };
    let cur: State = { tx: 0, ty: 0, alpha: 1, op: "source-over" };
    const stack: State[] = [];
    const fills: State[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, name: string) => {
          if (name === "globalAlpha") return cur.alpha;
          if (name === "globalCompositeOperation") return cur.op;
          if (name === "save") return () => void stack.push({ ...cur });
          if (name === "restore") return () => void (cur = stack.pop() ?? cur);
          if (name === "translate") {
            return (x: number, y: number) => void (cur = { ...cur, tx: cur.tx + x, ty: cur.ty + y });
          }
          if (name === "setTransform") {
            return (_a: number, _b: number, _c: number, _d: number, e: number, f: number) =>
              void (cur = { ...cur, tx: e, ty: f });
          }
          if (name === "fillRect" || name === "fillText") return () => void fills.push({ ...cur });
          return () => {};
        },
        set: (_t, name: string, value: unknown) => {
          if (name === "globalAlpha") cur.alpha = value as number;
          if (name === "globalCompositeOperation") cur.op = value as string;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    return { ctx, fills, state: () => cur };
  }

  describe("when layers misbehave", () => {
    it("doesn't skip the next layer when a layer removes itself", () => {
      const game = new Game(level());
      const calls: string[] = [];
      const removeA = game.addLayer({
        update: () => {
          calls.push("a");
          removeA();
        },
      });
      game.addLayer({ update: () => calls.push("b") });
      game.addLayer({ update: () => calls.push("c") });
      game.update(dt, NO_INPUT);
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["a", "b", "c", "b", "c"]);
    });

    it("doesn't call a layer that an earlier layer removed in the same frame", () => {
      const game = new Game(level());
      const calls: string[] = [];
      let removeB = () => {};
      game.addLayer({
        update: () => {
          calls.push("a");
          removeB();
        },
      });
      removeB = game.addLayer({ update: () => calls.push("b") });
      game.addLayer({ update: () => calls.push("c") });
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["a", "c"]);
    });

    it("runs a layer added during a frame from the next frame", () => {
      const game = new Game(level());
      const calls: string[] = [];
      let added = false;
      game.addLayer({
        update: () => {
          calls.push("a");
          if (!added) {
            added = true;
            game.addLayer({ update: () => calls.push("late") });
          }
        },
      });
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["a"]);
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["a", "a", "late"]);
    });

    it("keeps the game going when a layer throws in update, and removes that layer", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const game = new Game(level());
      const calls: string[] = [];
      game.addLayer({
        update: () => {
          calls.push("bad");
          throw new Error("broken feature");
        },
      });
      game.addLayer({ update: () => calls.push("good") });
      expect(() => game.update(dt, NO_INPUT)).not.toThrow();
      expect(() => game.update(dt, NO_INPUT)).not.toThrow();
      // Reported once, then gone; the other layer carried on both frames.
      expect(calls).toEqual(["bad", "good", "good"]);
      expect(error).toHaveBeenCalledTimes(1);
    });

    it("leaves the canvas balanced when a layer throws while drawing", () => {
      stubDocument();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const game = new Game(level());
      game.addLayer({
        drawWorld: (ctx) => {
          ctx.fillText("before-throw", 0, 0);
          throw new Error("broken feature");
        },
        drawHud: () => {
          throw new Error("broken feature");
        },
      });
      game.addLayer({
        drawWorld: (ctx) => ctx.fillText("world-ok", 0, 0),
        drawHud: (ctx) => ctx.fillText("hud-ok", 0, 0),
      });
      const { ctx, calls } = fakeContext();
      expect(() => game.render(ctx, 1)).not.toThrow();
      expect(count(calls, "save()")).toBe(count(calls, "restore()"));
      // The other layer still drew, in both passes.
      expect(calls).toContain("fillText(world-ok,0,0)");
      expect(calls).toContain("fillText(hud-ok,0,0)");
      // The broken layer was dropped, so the next frame doesn't repeat it.
      const next = fakeContext();
      game.render(next.ctx, 1);
      expect(next.calls).not.toContain("fillText(before-throw,0,0)");
      vi.unstubAllGlobals();
    });

    it("doesn't let one layer's globalAlpha leak into the next layer or frame", () => {
      stubDocument();
      const game = new Game(level());
      game.addLayer({
        drawWorld: (ctx) => {
          ctx.globalAlpha = 0.3; // never reset
        },
        drawHud: (ctx) => {
          ctx.globalAlpha = 0.2; // never reset
        },
      });
      let worldSeen = -1;
      let hudSeen = -1;
      game.addLayer({
        drawWorld: (ctx) => {
          worldSeen = ctx.globalAlpha;
        },
        drawHud: (ctx) => {
          hudSeen = ctx.globalAlpha;
        },
      });
      const first = statefulContext();
      game.render(first.ctx, 1);
      expect(worldSeen).toBe(1);
      expect(hudSeen).toBe(1);
      expect(first.alpha()).toBe(1);
      expect(first.stack).toHaveLength(0);

      // The next frame starts clean, background included.
      const second = statefulContext();
      game.render(second.ctx, 1);
      expect(second.alphaAtFill[0]).toBe(1);
      vi.unstubAllGlobals();
    });

    it("gives each layer its own copy of the camera position", () => {
      stubDocument();
      const game = new Game(level());
      const seen: number[] = [];
      game.addLayer({
        drawWorld: (_ctx, cam) => {
          cam.x = 9999;
          cam.y = 9999;
        },
      });
      game.addLayer({ drawWorld: (_ctx, cam) => seen.push(cam.x) });
      const { ctx } = fakeContext();
      game.render(ctx, 1);
      expect(seen).toEqual([game.camera.position(1).x]);
      vi.unstubAllGlobals();
    });

    // The ways a draw hook can mess up the canvas, each of them shifting,
    // fading and recompositing it.
    const misbehaviours: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
      "throws before its restore": (ctx) => {
        ctx.save();
        ctx.translate(40, 25);
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "lighter";
        throw new Error("broken feature");
      },
      "forgets its restore": (ctx) => {
        ctx.save();
        ctx.translate(40, 25);
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "lighter";
      },
      "restores too many times": (ctx) => {
        ctx.translate(40, 25);
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "lighter";
        ctx.restore();
        ctx.restore();
        ctx.restore();
      },
    };

    for (const [what, bad] of Object.entries(misbehaviours)) {
      for (const pass of ["drawWorld", "drawHud"] as const) {
        it(`keeps the canvas clean when a ${pass} layer ${what}`, () => {
          stubDocument();
          vi.spyOn(console, "error").mockImplementation(() => {});
          const game = new Game(level());
          const cam = game.camera.position(1);
          const { ctx, fills, state } = transformContext();
          const clean = { tx: 0, ty: 0, alpha: 1, op: "source-over" };
          // The first HUD layer marks the end of the popups, prompt and HUD;
          // the last world layer marks the end of the world pass.
          let hudStart = -1;
          let worldEnd = -1;
          let worldSeen: unknown;
          game.addLayer({ drawHud: () => (hudStart = fills.length) });
          game.addLayer({ [pass]: bad });
          game.addLayer({
            drawWorld: () => {
              worldEnd = fills.length;
              worldSeen = { ...state() };
            },
          });
          for (let frame = 0; frame < 3; frame++) {
            fills.length = 0;
            game.render(ctx, 1);
            // The background is drawn first, on a clean canvas, every frame.
            expect(fills[0]).toEqual(clean);
            // A later world layer still gets the camera transform.
            expect(worldSeen).toEqual({ tx: -cam.x, ty: -cam.y, alpha: 1, op: "source-over" });
            // Popups, prompt and HUD are drawn clean.
            expect(hudStart).toBeGreaterThan(worldEnd);
            for (const f of fills.slice(worldEnd, hudStart)) expect(f).toEqual(clean);
          }
          // And the frame ends clean.
          expect(state()).toEqual(clean);
        });
      }
    }

    it("shows a world layer the camera transform even after the layer before it broke it", () => {
      stubDocument();
      const game = new Game(level());
      const cam = game.camera.position(1);
      const { ctx, state } = transformContext();
      let seen: { tx: number; ty: number } | undefined;
      game.addLayer({ drawWorld: (c) => c.restore() });
      game.addLayer({ drawWorld: () => (seen = { ...state() }) });
      game.render(ctx, 1);
      expect(seen).toMatchObject({ tx: -cam.x, ty: -cam.y });
    });

    it("includes the layer's name in the log when it throws", () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const game = new Game(level());
      game.addLayer({
        name: "sparkles",
        update: () => {
          throw new Error("boom");
        },
      });
      game.update(dt, NO_INPUT);
      expect(error.mock.calls[0][0]).toContain("sparkles");
      error.mockClear();
      game.addLayer({
        update: () => {
          throw new Error("boom");
        },
      });
      game.update(dt, NO_INPUT);
      expect(error.mock.calls[0][0]).toBe("A layer threw and was removed");
    });

    it("ignores a layer that is added twice", () => {
      const game = new Game(level());
      const calls: string[] = [];
      const layer = { update: () => calls.push("tick") };
      const remove = game.addLayer(layer);
      game.addLayer(layer);
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["tick"]);
      remove();
      game.update(dt, NO_INPUT);
      expect(calls).toEqual(["tick"]);
    });

    it("makes the same draw calls when layers have no draw hooks", () => {
      stubDocument();
      const withLayer = new Game(level());
      withLayer.addLayer({ name: "silent", update: () => {} });
      const without = new Game(level());
      const a = fakeContext();
      const b = fakeContext();
      withLayer.render(a.ctx, 1);
      without.render(b.ctx, 1);
      expect(a.calls).toEqual(b.calls);
      vi.unstubAllGlobals();
    });
  });
});

