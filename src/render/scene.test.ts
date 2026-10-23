import { beforeAll, describe, expect, it, vi } from "vitest";
import { APARTMENT_LEVEL } from "../game/apartment";
import { Game } from "../game/game";
import type { Level } from "../game/level";
import { NO_INPUT } from "../input/controls";
import { PLAYER_FRAMES, PlayerAnimator, playerFrame } from "./player-sprite";
import { drawPlayer, drawScene, orderProps } from "./scene";
import type { SpriteDrawer } from "./sprites";

type Call = { name: string; x: number; y: number; flip: boolean };

function recorder() {
  const calls: Call[] = [];
  const sprites: SpriteDrawer = {
    draw: (_ctx, name, x, y, _size, flip = false) => void calls.push({ name, x, y, flip }),
  };
  return { calls, sprites };
}

// Records canvas calls, to check what else the game paints.
function recordingCtx() {
  const ops: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "globalAlpha") return 1;
        return (...args: unknown[]) => void ops.push(`${prop}(${args.join(",")})`);
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, ops };
}

const scene = APARTMENT_LEVEL.scene!;

// The HUD font caches glyphs on offscreen canvases; there is no DOM here.
beforeAll(() => {
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => recordingCtx().ctx }) });
});

// Names of the rendered sprites in public/sprites.
const onDisk = new Set(
  Object.keys(import.meta.glob("../../public/sprites/*.png")).map((f) =>
    f.replace(/^.*\//, "").replace(/\.png$/, ""),
  ),
);

describe("scene data", () => {
  it("has a prop for every piece and decor entry, at the right place", () => {
    const names = scene.props.map((p) => p.sprite);
    expect(names).toContain("bed");
    expect(names).toContain("window-blinds");
    const bed = scene.props.find((p) => p.sprite === "bed")!;
    // 4 tiles wide and 2 tall, standing on the floor (y = 12 tiles).
    expect(bed).toMatchObject({ x: 0, y: 10 * 16, w: 64, h: 32 });
    const blinds = scene.props.find((p) => p.sprite === "window-blinds")!;
    expect(blinds).toMatchObject({ x: 16, y: 4 * 16, w: 32, h: 64 });
  });

  it("only uses sprites that exist on disk", () => {
    for (const p of scene.props) {
      expect(onDisk.has(p.sprite), p.sprite).toBe(true);
    }
    for (const f of PLAYER_FRAMES) expect(onDisk.has(f), f).toBe(true);
  });
});

describe("draw order", () => {
  it("puts decor behind furniture and keeps data order within a layer", () => {
    const ordered = orderProps(scene.props);
    const firstFurniture = ordered.findIndex((p) => p.layer === "furniture");
    expect(ordered.slice(0, firstFurniture).every((p) => p.layer === "decor")).toBe(true);
    expect(ordered.slice(firstFurniture).every((p) => p.layer === "furniture")).toBe(true);
    const furniture = scene.props.filter((p) => p.layer === "furniture");
    expect(ordered.slice(firstFurniture)).toEqual(furniture);
  });

  it("draws the wall first, then decor, furniture", () => {
    const { ctx, ops } = recordingCtx();
    const { calls, sprites } = recorder();
    drawScene(ctx, scene, sprites);
    expect(ops[0]).toMatch(/^fillStyle|^fillRect/);
    const lastDecor = Math.max(...calls.map((c, i) => (c.name === "shower-curtain" ? i : -1)));
    const firstFurn = calls.findIndex((c) => c.name === "bed");
    expect(lastDecor).toBeLessThan(firstFurn);
    expect(calls).toHaveLength(scene.props.length);
  });

  it("draws the player after the scene and before the UI", () => {
    const { ctx, ops } = recordingCtx();
    const { calls, sprites } = recorder();
    const game = new Game(APARTMENT_LEVEL, sprites);
    game.render(ctx, 1);
    expect(calls.length).toBe(scene.props.length + 1);
    expect(calls[calls.length - 1].name).toMatch(/^player-/);
    expect(calls.slice(0, -1).every((c) => !c.name.startsWith("player-"))).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
  });
});

describe("player drawing", () => {
  it("anchors the 16px frame to the hitbox and mirrors for facing left", () => {
    const { ctx } = recordingCtx();
    const { calls, sprites } = recorder();
    drawPlayer(ctx, sprites, "player-idle", 100, 50, 1);
    drawPlayer(ctx, sprites, "player-idle", 100, 50, -1);
    expect(calls[0]).toEqual({ name: "player-idle", x: 97, y: 48, flip: false });
    expect(calls[1]).toEqual({ name: "player-idle", x: 97, y: 48, flip: true });
  });
});

describe("playerFrame", () => {
  const ground = { grounded: true, vx: 0, vy: 0, busy: false };

  it("picks idle, jump, fall and task", () => {
    expect(playerFrame(ground, 0)).toBe("player-idle");
    expect(playerFrame({ ...ground, grounded: false, vy: -100 }, 0)).toBe("player-jump");
    expect(playerFrame({ ...ground, grounded: false, vy: 50 }, 0)).toBe("player-fall");
    expect(playerFrame({ ...ground, busy: true }, 0)).toBe("player-task");
  });

  it("task wins over everything, even in the air", () => {
    expect(playerFrame({ grounded: false, vx: 90, vy: -50, busy: true }, 0)).toBe("player-task");
  });

  it("cycles through four walk frames by distance, in either direction", () => {
    const walking = { ...ground, vx: 90 };
    const seen = [0, 5, 10, 15, 20].map((d) => playerFrame(walking, d));
    expect(seen).toEqual([
      "player-walk-1",
      "player-walk-2",
      "player-walk-3",
      "player-walk-4",
      "player-walk-1",
    ]);
    expect(playerFrame({ ...ground, vx: -90 }, 5)).toBe("player-walk-2");
  });

  it("treats a crawl as standing still", () => {
    expect(playerFrame({ ...ground, vx: 2 }, 50)).toBe("player-idle");
  });

  it("only advances the cycle while walking and restarts it after a stop", () => {
    const a = new PlayerAnimator();
    const walking = { ...ground, vx: 90 };
    a.update(0.1, walking);
    a.update(0.1, walking);
    expect(a.frame(walking)).not.toBe("player-walk-1");
    a.update(0.1, { ...ground, busy: true });
    a.update(0.1, ground);
    expect(a.frame(walking)).toBe("player-walk-1");
  });
});

describe("Game rendering", () => {
  it("does not draw translucent zone rectangles", () => {
    const { ctx, ops } = recordingCtx();
    new Game(APARTMENT_LEVEL, recorder().sprites).render(ctx, 1);
    expect(ops.some((o) => o.startsWith("strokeRect"))).toBe(false);
    expect(ops.some((o) => o.startsWith("globalAlpha"))).toBe(false);
  });

  it("still renders a level with no art or sprites", () => {
    const level: Level = { ...APARTMENT_LEVEL, scene: undefined };
    const { ctx } = recordingCtx();
    const game = new Game(level);
    game.update(1 / 60, NO_INPUT);
    expect(() => game.render(ctx, 0.5)).not.toThrow();
  });
});
