import type { Interactable } from "../game/interactable";
import { GLYPH_H, drawText, textWidth } from "./font";
import { placeLabel } from "./layout";

const BG = "rgba(0, 0, 0, 0.7)";
const TEXT = "#edf2f4";
const DIM = "#8d99ae";
const ACCENT = "#06d6a0";
const KEY_BG = "#edf2f4";
const KEY_FG = "#2b2d42";

interface Actor {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface View {
  width: number;
  height: number;
}

// "[E] Make coffee", or the name greyed out with a countdown while the task
// is cooling down. `actor` is in screen coordinates.
export function drawPrompt(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  item: Interactable,
  cooldownRemaining: number,
  view: View,
): void {
  const cooling = cooldownRemaining > 0;
  const label = cooling ? `${item.prompt} (${Math.ceil(cooldownRemaining)} SEC)` : item.prompt;
  const keyW = cooling ? 0 : 11;
  const w = 3 + keyW + textWidth(label) + 3;
  const h = 13;

  const box = placeLabel(
    { x: actor.x + actor.w / 2, top: actor.y, bottom: actor.y + actor.h },
    { w, h },
    view,
  );

  ctx.fillStyle = BG;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  let textX = box.x + 3;
  if (!cooling) {
    ctx.fillStyle = KEY_BG;
    ctx.fillRect(box.x + 2, box.y + 2, 9, 9);
    drawText(ctx, "E", box.x + 4, box.y + 3, { color: KEY_FG, shadow: null });
    textX += keyW;
  }
  drawText(ctx, label, textX, box.y + 3, { color: cooling ? DIM : TEXT, shadow: null });
}

// Task name with a progress bar underneath, while a task runs.
export function drawProgress(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  item: Interactable,
  progress: number,
  view: View,
): void {
  const label = item.name;
  const w = Math.max(textWidth(label) + 6, 44);
  const h = GLYPH_H + 11;

  const box = placeLabel(
    { x: actor.x + actor.w / 2, top: actor.y, bottom: actor.y + actor.h },
    { w, h },
    view,
  );

  ctx.fillStyle = BG;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  drawText(ctx, label, box.x + box.w / 2, box.y + 3, {
    color: TEXT,
    align: "center",
    shadow: null,
  });

  const barX = box.x + 3;
  const barY = box.y + GLYPH_H + 5;
  const barW = box.w - 6;
  ctx.fillStyle = "#000000";
  ctx.fillRect(barX, barY, barW, 3);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(barX, barY, Math.round(barW * progress), 3);
}
