import { describe, expect, it, vi } from "vitest";
import { FULL_VIEW } from "../game/view-zoom";
import { composedView, composedViewSprites } from "./composed-views";
import { spriteNames } from "./sprite-names";
import { APARTMENT } from "../game/apartment";
import { defaultRoomOps, FRAME_SPRITE, SIDE_PROJECT_VIEW_NAME, SideProjectView, type DrawOp } from "./side-project-view";
import type { SpriteDrawer } from "./sprites";
import { Sprites } from "./sprites";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// A recording canvas: every call and property set, in order.
function fakeCanvas(w: number, h: number) {
  const log: string[] = [];
  const ctx = new Proxy({}, {
    get: (_t, k) => (k === "canvas" ? c : (...a: unknown[]) => log.push(`${String(k)}(${a.map((x) => (typeof x === "object" && x ? "canvas" : x)).join(",")})`)),
    set: (_t, k, v) => (log.push(`${String(k)}=${v}`), true),
  });
  const c = { width: w, height: h, log, getContext: () => ctx } as unknown as HTMLCanvasElement & { log: string[] };
  return c;
}

function sprites(has: (n: string) => boolean = () => true) {
  const drawn: string[] = [];
  const s: SpriteDrawer = {
    has,
    draw: (_c, name, x, y) => void drawn.push(`${name}@${x},${y}`),
  };
  return { s, drawn };
}

const ctx = () => fakeCanvas(320, 192).getContext("2d") as unknown as CanvasRenderingContext2D;
const ops: DrawOp[] = [{ sprite: "floor-wood", x: 16, y: 16 }, { sprite: "desk", x: 96, y: 16 }];

function view(extra: { key?: () => string } = {}) {
  const made: ReturnType<typeof fakeCanvas>[] = [];
  const v = new SideProjectView({ source: () => ops, makeCanvas: (w, h) => (made.push(fakeCanvas(w, h)), made.at(-1)! as unknown as HTMLCanvasElement), ...extra });
  return { v, made };
}

describe("SideProjectView", () => {
  it("draws the ops at 1x into a room canvas, then the frame on top of the half-scale copy", () => {
    const { v, made } = view();
    const { s, drawn } = sprites();
    expect(v.draw(ctx(), s, FULL_VIEW)).toBe(true);
    expect(drawn).toEqual(["floor-wood@16,16", "desk@96,16", `${FRAME_SPRITE}@0,0`]);
    expect([made[0].width, made[0].height]).toEqual([304, 160]);
    expect([made[1].width, made[1].height]).toEqual([320, 192]);
    // Half scale, smoothed, into the centre of the window.
    expect(made[1].log).toContain("imageSmoothingEnabled=true");
    expect(made[1].log.filter((l) => l.startsWith("drawImage"))).toEqual(["drawImage(canvas,0,0,304,160,84,27,152,80)"]);
  });

  it("caches: a second draw does not render again, a changed key does", () => {
    let k = "a";
    const { v } = view({ key: () => k });
    const { s } = sprites();
    v.draw(ctx(), s, FULL_VIEW);
    v.draw(ctx(), s, FULL_VIEW);
    expect(v.renders).toBe(1);
    k = "b";
    v.draw(ctx(), s, FULL_VIEW);
    expect(v.renders).toBe(2);
  });

  it("returns false and draws nothing when a sprite is missing, so the cutscene shows the old picture", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { v } = view();
    const c = fakeCanvas(320, 192);
    expect(v.draw(c.getContext("2d") as never, sprites((n) => n !== "desk").s, FULL_VIEW)).toBe(false);
    expect(c.log).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    v.draw(c.getContext("2d") as never, sprites((n) => n !== "desk").s, FULL_VIEW);
    expect(warn).toHaveBeenCalledTimes(1); // once
    warn.mockRestore();
  });

  it("returns false when the source throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const v = new SideProjectView({ source: () => { throw new Error("bad config"); } });
    expect(v.draw(ctx(), sprites().s, FULL_VIEW)).toBe(false);
    warn.mockRestore();
  });

  it("draws a zoom window with smoothing off, filling 320 x 192", () => {
    const { v } = view();
    const c = fakeCanvas(320, 192);
    v.draw(c.getContext("2d") as never, sprites().s, { x: 80, y: 48, w: 160, h: 96 });
    expect(c.log).toContain("imageSmoothingEnabled=false");
    expect(c.log).toContain("drawImage(canvas,80,48,160,96,0,0,320,192)");
  });

  it("the noise is the same every time", () => {
    const a = view();
    const b = view();
    a.v.draw(ctx(), sprites().s, FULL_VIEW);
    b.v.draw(ctx(), sprites().s, FULL_VIEW);
    expect(a.made[1].log).toEqual(b.made[1].log);
  });
});

describe("the registered side project view", () => {
  it("is registered under the cutscene's view name and needs the frame", () => {
    expect(composedView(SIDE_PROJECT_VIEW_NAME)).toBeDefined();
    expect(composedViewSprites()).toContain(FRAME_SPRITE);
    expect(spriteNames(Object.values(APARTMENT.rooms))).toContain(FRAME_SPRITE);
  });

  it("only uses sprites that have files, and the frame is the same size as the old picture", () => {
    for (const name of [FRAME_SPRITE, SIDE_PROJECT_VIEW_NAME, ...defaultRoomOps().map((o) => o.sprite)]) {
      expect(`/public/sprites/${name}.png` in spriteFiles, name).toBe(true);
    }
  });

  it("starts with the floor and walls, and lists every piece after them in bottom-edge order", () => {
    const list = defaultRoomOps();
    const firstPiece = list.findIndex((o) => o.sprite === "painting");
    expect(firstPiece).toBeGreaterThan(100);
    expect(list.at(-1)?.sprite).toBe("front-door");
  });
});

describe("Sprites.drawScaled", () => {
  it("is optional on the drawer and does nothing for a sprite that is not loaded", () => {
    const calls: string[] = [];
    const c = { save: () => calls.push("save"), restore: () => calls.push("restore"), drawImage: () => calls.push("drawImage") } as unknown as CanvasRenderingContext2D;
    new Sprites().drawScaled(c, "nothing", 0, 0, 0.5, true);
    expect(calls).toEqual([]);
  });
});
