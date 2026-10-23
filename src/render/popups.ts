import { GLYPH_H, drawText } from "./font";

export interface PopupLine {
  text: string;
  color: string;
  scale?: number;
}

interface Popup {
  x: number;
  y: number;
  lines: PopupLine[];
  age: number;
}

const LIFETIME = 1.6;
const RISE = 18;
const FADE_TIME = 0.4;
const LINE_GAP = 2;

// Short-lived floating text, such as the "+N" when a task completes. Ages in
// game time, so it pauses with the game.
export class Popups {
  private items: Popup[] = [];

  add(x: number, y: number, lines: PopupLine[]): void {
    this.items.push({ x, y, lines, age: 0 });
  }

  update(dt: number): void {
    for (const p of this.items) p.age += dt;
    this.items = this.items.filter((p) => p.age < LIFETIME);
  }

  get count(): number {
    return this.items.length;
  }

  draw(ctx: CanvasRenderingContext2D, viewWidth: number): void {
    for (const p of this.items) {
      // Ease out: fast at first, settling at the top.
      const t = p.age / LIFETIME;
      const rise = RISE * (1 - (1 - t) * (1 - t));
      const alpha = Math.min(1, (LIFETIME - p.age) / FADE_TIME);
      const x = Math.min(Math.max(p.x, 20), viewWidth - 20);

      ctx.globalAlpha = alpha;
      let y = p.y - rise;
      for (const line of p.lines) {
        const scale = line.scale ?? 1;
        drawText(ctx, line.text, x, y, { color: line.color, align: "center", scale });
        y += GLYPH_H * scale + LINE_GAP;
      }
      ctx.globalAlpha = 1;
    }
  }
}
