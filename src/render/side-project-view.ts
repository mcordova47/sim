import { TILE } from "../game/config";
import { FULL_VIEW, type ViewRect } from "../game/view-zoom";
import { APARTMENT } from "../game/apartment";
import { COLOR } from "./colors";
import { registerComposedView, type ComposedView } from "./composed-views";
import type { SpriteDrawer } from "./sprites";

// The side project's picture (issues 101, 111): the little room on the character's screen,
// composed at run time from the real room's sprites, drawn at half size, softened, dimmed and
// with a little noise, inside a monitor frame. See docs/side-project-config-design.md.

// One sprite to draw, in the real room's pixels (1x), in drawing order.
export interface DrawOp {
  sprite: string;
  x: number;
  y: number;
}

export const SIDE_PROJECT_VIEW_NAME = "view-side-project";
export const FRAME_SPRITE = "view-side-project-frame";

// The frame's room window, in picture pixels (the part of `view-side-project-frame` left clear).
const WINDOW = { x: 79, y: 24, w: 162, h: 87 };
// The real main room is 304 x 160; the little room is half that, centred in the window.
const ROOM = { w: 304, h: 160 };
const HALF = { w: ROOM.w / 2, h: ROOM.h / 2 };
const AT = { x: WINDOW.x + Math.floor((WINDOW.w - HALF.w) / 2), y: WINDOW.y + Math.floor((WINDOW.h - HALF.h) / 2) };

// Tuning (the design note: dim 0.3 within 0 to 0.6, light noise).
export const LOOK = { dim: 0.3, scanline: 0.07, speckles: 140, speckle: 0.1 };

// The pieces of the main room, as a small hard-coded list, until the composer (111b) and the
// config (111a, 111d) feed the view. `h` is the footprint's bottom edge offset, for draw order.
// Positions are the real room's (src/game/apartment.ts, MAIN_MAP).
const PIECES: (DrawOp & { h: number })[] = [
  { sprite: "painting", x: 32, y: 0, h: 16 },
  { sprite: "painting-desk", x: 112, y: 0, h: 16 },
  { sprite: "painting-wide", x: 224, y: 0, h: 16 },
  { sprite: "table", x: 16, y: 16, h: 32 },
  { sprite: "mic-stand", x: 80, y: 16, h: 32 },
  { sprite: "desk", x: 96, y: 16, h: 32 },
  { sprite: "bookshelf", x: 160, y: 16, h: 64 },
  { sprite: "plant-0", x: 160, y: 52, h: 16 },
  { sprite: "nightstand", x: 224, y: 16, h: 16 },
  { sprite: "radiator", x: 272, y: 16, h: 48 },
  { sprite: "bed-made", x: 192, y: 32, h: 96 },
  { sprite: "desk-chair", x: 128, y: 48, h: 16 },
  { sprite: "window-blinds-open", x: 288, y: 48, h: 32 },
  { sprite: "sofa-td", x: 32, y: 80, h: 32 },
  { sprite: "guitar", x: 16, y: 96, h: 16 },
  { sprite: "lamp-table", x: 128, y: 96, h: 16 },
  { sprite: "window-blinds-open", x: 288, y: 96, h: 32 },
  { sprite: "record-stand", x: 144, y: 112, h: 16 },
  { sprite: "front-door", x: 160, y: 144, h: 16 },
];

// Floor and walls of the main room from its level data (a lazy read, so import order is free),
// then the hard-coded pieces sorted by bottom edge (stable, as the real room sorts them).
export function defaultRoomOps(): DrawOp[] {
  const main = APARTMENT.rooms.main;
  const ops: DrawOp[] = [];
  for (const t of main.floor?.tiles ?? []) ops.push({ sprite: main.floor!.sprite, x: t.col * TILE, y: t.row * TILE });
  for (const w of main.walls ?? []) {
    ops.push({ sprite: w.sprite, x: w.col * TILE, y: w.row * TILE });
    if (w.doorSprite) ops.push({ sprite: w.doorSprite, x: w.col * TILE, y: w.row * TILE });
  }
  const pieces = PIECES.map((p, i) => ({ p, i })).sort((a, b) => a.p.y + a.p.h - (b.p.y + b.p.h) || a.i - b.i);
  for (const { p } of pieces) ops.push({ sprite: p.sprite, x: p.x, y: p.y });
  return ops;
}

type Canvas = HTMLCanvasElement;

export interface SideProjectViewOptions {
  // The pieces to draw. Called only when the cache is empty or `key` changed.
  source: () => DrawOp[];
  // Anything that changes the picture (state, config). The picture is redrawn only when it changes.
  key?: () => string;
  // Test seam: how to get an offscreen canvas.
  makeCanvas?: (w: number, h: number) => Canvas;
}

const defaultCanvas = (w: number, h: number): Canvas => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export class SideProjectView implements ComposedView {
  private cache: Canvas | null = null;
  private cacheKey: string | null = null;
  private warned = false;
  renders = 0;

  constructor(private readonly options: SideProjectViewOptions) {}

  sprites(): string[] {
    return [FRAME_SPRITE, ...new Set(this.options.source().map((o) => o.sprite))];
  }

  draw(ctx: CanvasRenderingContext2D, sprites: SpriteDrawer, from: ViewRect): boolean {
    const picture = this.picture(sprites);
    if (!picture) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (from.w === FULL_VIEW.w && from.h === FULL_VIEW.h && from.x === 0 && from.y === 0) ctx.drawImage(picture, 0, 0);
    else ctx.drawImage(picture, from.x, from.y, from.w, from.h, 0, 0, FULL_VIEW.w, FULL_VIEW.h);
    ctx.restore();
    return true;
  }

  // The finished 320 x 192 picture, from the cache, or null if it cannot be made.
  private picture(sprites: SpriteDrawer): Canvas | null {
    const key = this.options.key?.() ?? "";
    if (this.cache && key === this.cacheKey) return this.cache;
    try {
      const ops = this.options.source();
      for (const name of [FRAME_SPRITE, ...ops.map((o) => o.sprite)]) {
        if (!sprites.has(name)) throw new Error(`sprite "${name}" is not loaded`);
      }
      this.cache = this.render(sprites, ops);
      this.cacheKey = key;
      this.renders++;
      return this.cache;
    } catch (error) {
      if (!this.warned) console.warn("Side project picture: drawing the old picture instead:", error);
      this.warned = true;
      return null;
    }
  }

  private render(sprites: SpriteDrawer, ops: DrawOp[]): Canvas {
    const make = this.options.makeCanvas ?? defaultCanvas;
    // The room at 1x, drawn the normal way.
    const room = make(ROOM.w, ROOM.h);
    const rctx = room.getContext("2d")!;
    rctx.imageSmoothingEnabled = false;
    for (const op of ops) sprites.draw(rctx, op.sprite, op.x, op.y);

    const out = make(FULL_VIEW.w, FULL_VIEW.h);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    // Half scale, smoothed: averaging neighbours is the soft, slightly degraded copy.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(room, 0, 0, ROOM.w, ROOM.h, AT.x, AT.y, HALF.w, HALF.h);
    // Dim, then scanlines and speckles, only inside the window.
    ctx.save();
    ctx.beginPath();
    ctx.rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    ctx.clip();
    ctx.globalAlpha = LOOK.dim;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    ctx.globalAlpha = LOOK.scanline;
    for (let y = WINDOW.y; y < WINDOW.y + WINDOW.h; y += 2) ctx.fillRect(WINDOW.x, y, WINDOW.w, 1);
    // A seeded generator: the same picture every time, and in tests.
    let seed = 0x2f6e2b1;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    ctx.globalAlpha = LOOK.speckle;
    for (let i = 0; i < LOOK.speckles; i++) {
      ctx.fillStyle = i % 2 === 0 ? COLOR.paper : COLOR.ink;
      ctx.fillRect(WINDOW.x + Math.floor(next() * WINDOW.w), WINDOW.y + Math.floor(next() * WINDOW.h), 1, 1);
    }
    ctx.restore();
    // The monitor on top, so nothing spills past the screen.
    sprites.draw(ctx, FRAME_SPRITE, 0, 0);
    return out;
  }
}

registerComposedView(SIDE_PROJECT_VIEW_NAME, new SideProjectView({ source: defaultRoomOps }));
