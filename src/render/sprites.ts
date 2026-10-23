import { TILE } from "../game/config";

const SPRITE_DIR = "sprites";

export interface SpriteSize {
  width: number;
  height: number;
}

// Sprites are loaded by name (the filename without ".png"). A missing file
// yields a labeled rectangle instead of an error, so the game stays playable
// while art is still being made.
export class Sprites {
  private images = new Map<string, HTMLImageElement | null>();
  private placeholders = new Map<string, HTMLCanvasElement>();

  // Resolves once every named sprite has either loaded or failed.
  load(names: string[]): Promise<void> {
    return Promise.all(names.map((name) => this.loadOne(name))).then(() => undefined);
  }

  has(name: string): boolean {
    return !!this.images.get(name);
  }

  // `size` is only used for the fallback rectangle; real sprites use their own dimensions.
  draw(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    size: SpriteSize = { width: TILE, height: TILE },
  ): void {
    const image = this.images.get(name);
    ctx.drawImage(image ?? this.placeholder(name, size), Math.round(x), Math.round(y));
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
      ctx.fillStyle = "#d64550";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#1a1a2e";
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      ctx.fillStyle = "#edf2f4";
      ctx.font = "6px monospace";
      ctx.textBaseline = "top";
      ctx.fillText(name.slice(0, Math.floor(width / 4)), 2, 2);
      this.placeholders.set(key, canvas);
    }
    return canvas;
  }
}
