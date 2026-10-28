import type { Rect } from "../input/tap";
import { COLOR } from "./colors";
import { GLYPH_H, drawText } from "./font";

// A touch button: an ink border, a slate face and a centred label. `border` is the outline's colour
// (butter marks the one picked). Used by the pause screen and the flashcards screens (issue 093).
export function drawButton(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
  options: { color?: string; border?: string } = {},
): void {
  ctx.fillStyle = options.border ?? COLOR.ink;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = COLOR.slate;
  ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + (rect.h - GLYPH_H) / 2, {
    color: options.color ?? COLOR.paper,
    shadow: null,
    align: "center",
  });
}
