import { GLYPH_H, drawText, textWidth } from "./font";
import { fitBox, type Box } from "./layout";

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

interface View {
  width: number;
  height: number;
}

interface Placed {
  popup: Popup;
  box: Box;
  alpha: number;
}

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

  // Where each popup is drawn right now, in screen coordinates. Other UI uses
  // these to keep clear of them.
  boxes(view: View, origin: { x: number; y: number } = { x: 0, y: 0 }): Box[] {
    return this.place(view, origin).map((p) => p.box);
  }

  // Popups live at world positions; `origin` is the world position of the
  // top-left of the view, so they are drawn where the camera sees them.
  draw(
    ctx: CanvasRenderingContext2D,
    view: View,
    origin: { x: number; y: number } = { x: 0, y: 0 },
  ): void {
    for (const { popup, box, alpha } of this.place(view, origin)) {
      ctx.globalAlpha = alpha;
      let y = box.y;
      for (const line of popup.lines) {
        const scale = line.scale ?? 1;
        drawText(ctx, line.text, box.x + box.w / 2, y, {
          color: line.color,
          align: "center",
          scale,
        });
        y += GLYPH_H * scale + LINE_GAP;
      }
      ctx.globalAlpha = 1;
    }
  }

  private place(view: View, origin: { x: number; y: number }): Placed[] {
    return this.items.map((popup) => {
      // Ease out: fast at first, settling at the top.
      const t = popup.age / LIFETIME;
      const rise = RISE * (1 - (1 - t) * (1 - t));
      const alpha = Math.min(1, (LIFETIME - popup.age) / FADE_TIME);

      // Size from the real text, so wide popups aren't clipped by the screen
      // edge, then kept on screen and out of the HUD.
      const w = Math.max(...popup.lines.map((l) => textWidth(l.text, l.scale ?? 1)));
      const h =
        popup.lines.reduce((sum, l) => sum + GLYPH_H * (l.scale ?? 1), 0) +
        LINE_GAP * (popup.lines.length - 1);
      const box = fitBox(
        {
          x: Math.round(popup.x - origin.x - w / 2),
          y: Math.round(popup.y - origin.y - rise),
          w,
          h,
        },
        view,
      );
      return { popup, box, alpha };
    });
  }
}
