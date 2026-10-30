import { describe, expect, it, vi } from "vitest";
import { FULL_VIEW } from "../game/view-zoom";
import { composedView, composedViewSprites } from "./composed-views";
import { spriteNames } from "./sprite-names";
import { APARTMENT } from "../game/apartment";
import { sideProjectRoom } from "../game/side-project-room-config";
import { FRAME_SPRITE, LOOK, LOOKS, SIDE_PROJECT_VIEW_NAME, SideProjectView, TALL_FRAME_SPRITE, TALL_LAYOUT, TALL_MIN_HEIGHT, WIDE_LAYOUT, layoutFor, type DrawOp } from "./side-project-view";
import type { SpriteDrawer } from "./sprites";
import { Sprites } from "./sprites";
import tallFrameSource from "../../art/src/view-side-project-frame-tall.sprite?raw";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// A recording canvas: every call and property set, in order.
function fakeCanvas(w: number, h: number) {
  const log: string[] = [];
  const ctx = new Proxy({}, {
    get: (_t, k) => (k === "canvas" ? c : k === "getImageData" ? () => ({ data: new Uint8ClampedArray(8) }) : (...a: unknown[]) => log.push(`${String(k)}(${a.map((x) => (typeof x === "object" && x ? "canvas" : x)).join(",")})`)),
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
  const v = new SideProjectView({ source: () => ops, look: LOOKS.dark, makeCanvas: (w, h) => (made.push(fakeCanvas(w, h)), made.at(-1)! as unknown as HTMLCanvasElement), ...extra });
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
    for (const name of [FRAME_SPRITE, SIDE_PROJECT_VIEW_NAME, ...sideProjectRoom().map((o) => o.sprite)]) {
      expect(`/public/sprites/${name}.png` in spriteFiles, name).toBe(true);
    }
  });

  it("starts with the floor and walls, and lists every piece after them in bottom-edge order", () => {
    const list = sideProjectRoom();
    const firstPiece = list.findIndex((o) => o.layer === "thing");
    expect(firstPiece).toBeGreaterThan(20);
    expect(list.at(-1)?.sprite).toBe("front-door");
    expect(list.slice(0, 5).every((o) => o.layer === "floor")).toBe(true);
  });
});

describe("the looks", () => {
  it("stay inside the design's limits, and the game's look is one of them", () => {
    expect(Object.values(LOOKS)).toContain(LOOK);
    for (const l of Object.values(LOOKS)) {
      expect(l.dim).toBeGreaterThanOrEqual(0);
      expect(l.dim).toBeLessThanOrEqual(0.6);
      expect(l.lift).toBeGreaterThanOrEqual(0);
      expect(l.lift).toBeLessThanOrEqual(60);
      expect(l.wobble).toBeGreaterThanOrEqual(0);
    }
  });

  it("wobble nudges pieces the same way every time and never the floor or walls", () => {
    const where = () => {
      const drawn: string[] = [];
      const s: SpriteDrawer = { has: () => true, draw: (_c, name, x, y) => void drawn.push(`${name}@${x},${y}`) };
      const list: DrawOp[] = [{ sprite: "floor-wood", x: 16, y: 16, layer: "floor" }, { sprite: "desk", x: 96, y: 16, layer: "thing" }, { sprite: "sofa-td", x: 32, y: 80, layer: "thing" }];
      const w = new SideProjectView({ source: () => list, look: { ...LOOKS.dark, wobble: 2 }, makeCanvas: (a, b) => fakeCanvas(a, b) as never });
      w.draw(ctx(), s, FULL_VIEW);
      return drawn;
    };
    const a = where();
    expect(a).toEqual(where());
    expect(a[0]).toBe("floor-wood@16,16");
    expect(a[2]).not.toBe("sofa-td@32,80");
    const [x, y] = a[2].split("@")[1].split(",").map(Number);
    expect(Math.abs(x - 32)).toBeLessThanOrEqual(2);
    expect(Math.abs(y - 80)).toBeLessThanOrEqual(2);
  });

  it("the little room's desk is the front-on desk with the tiny person on it", () => {
    expect(sideProjectRoom().some((o) => o.sprite === "sp-desk-front-figure")).toBe(true);
    expect(sideProjectRoom().some((o) => o.sprite === "desk")).toBe(false);
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

describe("the tall layout (issue 125)", () => {
  it("is chosen only for a 320-wide view at least the minimum high; every other size keeps the wide one", () => {
    expect(layoutFor()).toBe(WIDE_LAYOUT);
    expect(layoutFor({ width: 320, height: 192 })).toBe(WIDE_LAYOUT);
    expect(layoutFor({ width: 224, height: 208 })).toBe(WIDE_LAYOUT);
    expect(layoutFor({ width: 320, height: TALL_MIN_HEIGHT - 1 })).toBe(WIDE_LAYOUT);
    expect(layoutFor({ width: 320, height: TALL_MIN_HEIGHT })).toBe(TALL_LAYOUT);
    expect(layoutFor({ width: 320, height: 288 })).toBe(TALL_LAYOUT);
  });

  it("asks for a 320-wide view between the minimum and the frame's height", () => {
    const { v } = view();
    expect(v.preferredView).toEqual({ width: 320, minHeight: TALL_MIN_HEIGHT, maxHeight: 288 });
    expect(composedView(SIDE_PROJECT_VIEW_NAME)?.preferredView).toEqual(v.preferredView);
    expect(v.sprites()).toContain(TALL_FRAME_SPRITE);
  });

  it("draws the room larger in a bigger window, the tall frame on top, and the bottom of the picture", () => {
    const { v, made } = view();
    const { s, drawn } = sprites();
    const c = fakeCanvas(320, 270);
    expect(v.draw(c.getContext("2d") as never, s, FULL_VIEW, { width: 320, height: 270 })).toBe(true);
    expect(drawn.at(-1)).toBe(`${TALL_FRAME_SPRITE}@0,0`);
    expect(drawn).not.toContain(`${FRAME_SPRITE}@0,0`);
    expect([made[1].width, made[1].height]).toEqual([320, 288]);
    // 7/8 size (266 x 140), centred in the 274 x 148 window.
    expect(made[1].log.filter((l) => l.startsWith("drawImage"))).toEqual(["drawImage(canvas,0,0,304,160,27,78,266,140)"]);
    // A 270-high view shows the bottom 270 rows of the 288-high picture.
    expect(c.log.filter((l) => l.startsWith("drawImage"))).toEqual(["drawImage(canvas,0,18,320,270,0,0,320,270)"]);
  });

  it("the room is at least 1.5 times larger than the wide layout's, and fits its window", () => {
    expect(TALL_LAYOUT.half.w / WIDE_LAYOUT.half.w).toBeGreaterThanOrEqual(1.5);
    expect(TALL_LAYOUT.half.w).toBeLessThanOrEqual(TALL_LAYOUT.window.w);
    expect(TALL_LAYOUT.half.h).toBeLessThanOrEqual(TALL_LAYOUT.window.h);
  });

  it("keeps a picture per layout: the wide one is not redrawn for the tall one, nor the reverse", () => {
    const { v } = view();
    const { s } = sprites();
    v.draw(ctx(), s, FULL_VIEW);
    v.draw(ctx(), s, FULL_VIEW, { width: 320, height: 288 });
    v.draw(ctx(), s, FULL_VIEW);
    v.draw(ctx(), s, FULL_VIEW, { width: 320, height: 288 });
    expect(v.renders).toBe(2);
  });

  it("the wide picture is the same whether or not the size is passed (landscape and desktop do not change)", () => {
    const a = view();
    const b = view();
    const sa = sprites();
    const sb = sprites();
    const ca = fakeCanvas(320, 192);
    const cb = fakeCanvas(320, 192);
    a.v.draw(ca.getContext("2d") as never, sa.s, FULL_VIEW);
    b.v.draw(cb.getContext("2d") as never, sb.s, FULL_VIEW, { width: 320, height: 192 });
    expect(cb.log).toEqual(ca.log);
    expect(b.made[1].log).toEqual(a.made[1].log);
    expect(sb.drawn).toEqual(sa.drawn);
  });
});

describe("the frame sprites", () => {
  it("the tall frame is 320 x 288 and its window is clear", () => {
    const text = tallFrameSource.split("\n");
    expect(text[0]).toBe("size: 320x288");
    const rows: string[] = text.slice(1, 289);
    expect(rows.every((r) => r.length === 320)).toBe(true);
    const w = TALL_LAYOUT.window;
    for (let y = w.y; y < w.y + w.h; y++) expect(rows[y].slice(w.x, w.x + w.w)).toBe(".".repeat(w.w));
    // ... and walled in: the pixel just outside the window on each side is not clear.
    expect(rows[w.y][w.x - 1]).not.toBe(".");
    expect(rows[w.y][w.x + w.w]).not.toBe(".");
    expect(rows[w.y - 1][w.x]).not.toBe(".");
    expect(rows[w.y + w.h][w.x]).not.toBe(".");
  });
});
