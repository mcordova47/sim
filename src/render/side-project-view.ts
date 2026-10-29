import PALETTE from "../../art/palette.json";
import { FULL_VIEW, type ViewRect } from "../game/view-zoom";
import { configDim, sideProjectRoom } from "../game/side-project-room-config";
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
  // "thing" marks a piece or prop (the look's `wobble` moves only these); floor and walls stay put.
  layer?: "floor" | "wall" | "thing" | "figure";
}

export const SIDE_PROJECT_VIEW_NAME = "view-side-project";
export const FRAME_SPRITE = "view-side-project-frame";

// The frame's room window, in picture pixels (the part of `view-side-project-frame` left clear).
const WINDOW = { x: 79, y: 24, w: 162, h: 87 };
// The real main room is 304 x 160; the little room is half that, centred in the window.
const ROOM = { w: 304, h: 160 };
const HALF = { w: ROOM.w / 2, h: ROOM.h / 2 };
const AT = { x: WINDOW.x + Math.floor((WINDOW.w - HALF.w) / 2), y: WINDOW.y + Math.floor((WINDOW.h - HALF.h) / 2) };

// How the little room is degraded and tuned; every value Marc may want to change is here.
export interface Look {
  backdrop: "ink" | "night" | "slate"; // what shows outside the walls, darkest to lightest
  dim: number; // ink laid over the room, 0 to 0.6
  lift: number; // light added to every colour, 0 to 60 (out of 255): a brighter, cartoonier picture
  smooth: boolean; // true: half scale averages neighbours (soft); false: picks pixels (chunky)
  snap: boolean; // after the downscale, move every colour to the nearest palette colour
  wobble: number; // pieces are nudged by up to this many real-room pixels, the same every time
  scanline: number; // opacity of the dark line on every other row
  speckles: number; // how many noise dots
  speckle: number; // opacity of a noise dot
}

// Looks between the old hand-drawn picture and a straight dark copy (issue 111c, for Marc to pick).
export const LOOKS = {
  // The first version: the dark soft copy.
  dark: { backdrop: "ink", dim: 0.3, lift: 0, smooth: true, snap: false, wobble: 0, scanline: 0.07, speckles: 140, speckle: 0.1 },
  // Lighter and warmer, still soft.
  bright: { backdrop: "night", dim: 0.12, lift: 16, smooth: true, snap: false, wobble: 0, scanline: 0.04, speckles: 90, speckle: 0.07 },
  // Pixels picked, not averaged: crisp and chunky.
  chunky: { backdrop: "night", dim: 0.14, lift: 14, smooth: false, snap: false, wobble: 0, scanline: 0.05, speckles: 90, speckle: 0.07 },
  // Softened, then snapped back to the palette, a bright flat look, with pieces a little off (Marc's pick).
  cartoon: { backdrop: "slate", dim: 0.08, lift: 22, smooth: true, snap: true, wobble: 2, scanline: 0.04, speckles: 70, speckle: 0.06 },
} satisfies Record<string, Look>;

// The look in the game.
export const LOOK: Look = LOOKS.cartoon;

type Canvas = HTMLCanvasElement;

export interface SideProjectViewOptions {
  // The pieces to draw. Called only when the cache is empty or `key` changed.
  source: () => DrawOp[];
  // Anything that changes the picture (state, config). The picture is redrawn only when it changes.
  key?: () => string;
  // How it is degraded. Default: `LOOK`.
  look?: Look;
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
    const look = this.options.look ?? LOOK;
    ops.forEach((op, i) => {
      // A deterministic nudge, 0 for floor and walls.
      const w = op.layer === "thing" ? look.wobble : 0;
      const dx = w ? ((i * 7) % (2 * w + 1)) - w : 0;
      const dy = w ? ((i * 5 + 2) % (2 * w + 1)) - w : 0;
      sprites.draw(rctx, op.sprite, op.x + dx, op.y + dy);
    });

    const out = make(FULL_VIEW.w, FULL_VIEW.h);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = COLOR[look.backdrop];
    ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    // Half scale, smoothed: averaging neighbours is the soft, slightly degraded copy.
    ctx.imageSmoothingEnabled = look.smooth;
    if (look.smooth) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(room, 0, 0, ROOM.w, ROOM.h, AT.x, AT.y, HALF.w, HALF.h);
    if (look.snap) snapToPalette(ctx, AT.x, AT.y, HALF.w, HALF.h);
    // Dim, then scanlines and speckles, only inside the window.
    ctx.save();
    ctx.beginPath();
    ctx.rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    ctx.clip();
    if (look.lift > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = look.lift / 240; // paper is about 240, so this adds about `lift` to each colour
      ctx.fillStyle = COLOR.paper;
      ctx.fillRect(AT.x, AT.y, HALF.w, HALF.h);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = look.dim;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h);
    ctx.globalAlpha = look.scanline;
    for (let y = WINDOW.y; y < WINDOW.y + WINDOW.h; y += 2) ctx.fillRect(WINDOW.x, y, WINDOW.w, 1);
    // A seeded generator: the same picture every time, and in tests.
    let seed = 0x2f6e2b1;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    ctx.globalAlpha = look.speckle;
    for (let i = 0; i < look.speckles; i++) {
      ctx.fillStyle = i % 2 === 0 ? COLOR.paper : COLOR.ink;
      ctx.fillRect(WINDOW.x + Math.floor(next() * WINDOW.w), WINDOW.y + Math.floor(next() * WINDOW.h), 1, 1);
    }
    ctx.restore();
    // The monitor on top, so nothing spills past the screen.
    sprites.draw(ctx, FRAME_SPRITE, 0, 0);
    return out;
  }
}

// Moves every pixel of a rectangle to the nearest colour of the house palette.
function snapToPalette(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const palette = Object.values(PALETTE.colors as Record<string, { hex: string }>).map(({ hex }) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const image = ctx.getImageData(x, y, w, h);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    let best = palette[0];
    let bestDist = Infinity;
    for (const c of palette) {
      const dist = (c[0] - d[i]) ** 2 + (c[1] - d[i + 1]) ** 2 + (c[2] - d[i + 2]) ** 2;
      if (dist < bestDist) { bestDist = dist; best = c; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  ctx.putImageData(image, x, y);
}

// The little room comes from the shipped config file (src/game/side-project-room.txt, issue 111d).
registerComposedView(
  SIDE_PROJECT_VIEW_NAME,
  new SideProjectView({ source: () => sideProjectRoom(), look: { ...LOOK, dim: configDim() ?? LOOK.dim } }),
);
