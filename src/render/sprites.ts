import { TILE } from "../game/config";
import { COLOR } from "./colors";

const SPRITE_DIR = "sprites";

export interface SpriteSize {
  width: number;
  height: number;
}

// Sprites are loaded by name (the filename without ".png"). A missing file
// yields a labeled rectangle instead of an error, so the game stays playable
// while art is still being made.
// What the game needs to draw a sprite; tests substitute a recorder.
export interface SpriteDrawer {
  // True once the sprite has loaded (false for one that failed or was never asked for).
  has(name: string): boolean;
  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    size?: SpriteSize,
    flip?: boolean,
  ): void;
  // Draws one window of a picture, scaled to fill `into` (a whole-number scale, so
  // the pixels stay sharp). Optional; without it a zoom shows the whole picture.
  drawRegion?(
    ctx: CanvasRenderingContext2D,
    name: string,
    from: { x: number; y: number; w: number; h: number },
    into: SpriteSize,
  ): void;
}

export class Sprites implements SpriteDrawer {
  private images = new Map<string, HTMLImageElement | null>();
  private placeholders = new Map<string, HTMLCanvasElement>();

  // Resolves once every named sprite has either loaded or failed.
  load(names: string[]): Promise<void> {
    return Promise.all(names.map((name) => this.loadOne(name))).then(() => undefined);
  }

  has(name: string): boolean {
    return !!this.images.get(name);
  }

  drawRegion(
    ctx: CanvasRenderingContext2D,
    name: string,
    from: { x: number; y: number; w: number; h: number },
    into: SpriteSize,
  ): void {
    const image = this.images.get(name);
    if (!image) return this.draw(ctx, name, 0, 0, into);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, from.x, from.y, from.w, from.h, 0, 0, into.width, into.height);
    ctx.restore();
  }

  // `size` is only used for the fallback rectangle; real sprites use their own dimensions.
  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    size: SpriteSize = { width: TILE, height: TILE },
    flip = false,
  ): void {
    const image = this.images.get(name) ?? this.placeholder(name, size);
    const left = Math.round(x);
    if (flip) {
      // Mirror inside the sprite's own cell, so the position doesn't change.
      ctx.save();
      ctx.translate(left + image.width, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(image, left, Math.round(y));
    }
  }

  private loadOne(name: string): Promise<void> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        this.images.set(name, image);
        resolve();
      };
      image.onerror = () => {
        console.warn(`Sprite "${name}" not found; using placeholder`);
        this.images.set(name, null);
        resolve();
      };
      image.src = `${import.meta.env.BASE_URL}${SPRITE_DIR}/${name}.png`;
    });
  }

  private placeholder(name: string, { width, height }: SpriteSize): HTMLCanvasElement {
    const key = `${name}:${width}x${height}`;
    let canvas = this.placeholders.get(key);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = COLOR.brick;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = COLOR.ink;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      ctx.fillStyle = COLOR.paper;
      ctx.font = "6px monospace";
      ctx.textBaseline = "top";
      ctx.fillText(name.slice(0, Math.floor(width / 4)), 2, 2);
      this.placeholders.set(key, canvas);
    }
    return canvas;
  }
}
