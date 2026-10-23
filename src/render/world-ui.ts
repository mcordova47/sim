import type { Interactable } from "../game/interactable";
import { COLOR, withAlpha } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";
import { HUD_BOX, placeLabel, type Box } from "./layout";

const BG = withAlpha(COLOR.ink, 0.75);
const TEXT = COLOR.paper;
const DIM = COLOR.mist;
const ACCENT = COLOR.leaf;
const KEY_BG = COLOR.paper;
const KEY_FG = COLOR.night;

const KEY_WIDTH = 11;

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

function promptLabel(item: Interactable, cooldownRemaining: number): string {
  return cooldownRemaining > 0
    ? `${item.prompt} (${Math.ceil(cooldownRemaining)} SEC)`
    : item.prompt;
}

// Size of the prompt box, so layout (and tests over the real task data) can
// measure it without drawing.
export function promptSize(item: Interactable, cooldownRemaining: number) {
  const keyW = cooldownRemaining > 0 ? 0 : KEY_WIDTH;
  return { w: 3 + keyW + textWidth(promptLabel(item, cooldownRemaining)) + 3, h: 13 };
}

export function progressSize(item: Interactable) {
  return { w: Math.max(textWidth(item.name) + 6, 44), h: GLYPH_H + 11 };
}

// "[E] Make coffee", or the name greyed out with a countdown while the task
// is cooling down. `actor` is in screen coordinates. `avoid` lists other boxes
// (such as live popups) the label should stay clear of, besides the HUD.
export function drawPrompt(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  item: Interactable,
  cooldownRemaining: number,
  view: View,
  avoid: Box[] = [],
): void {
  const cooling = cooldownRemaining > 0;
  const label = promptLabel(item, cooldownRemaining);
  const size = promptSize(item, cooldownRemaining);

  const box = placeLabel(
    { x: actor.x + actor.w / 2, top: actor.y, bottom: actor.y + actor.h },
    size,
    view,
    [HUD_BOX, ...avoid],
  );

  ctx.fillStyle = BG;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  let textX = box.x + 3;
  if (!cooling) {
    ctx.fillStyle = KEY_BG;
    ctx.fillRect(box.x + 2, box.y + 2, 9, 9);
    drawText(ctx, "E", box.x + 4, box.y + 3, { color: KEY_FG, shadow: null });
    textX += KEY_WIDTH;
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
  avoid: Box[] = [],
): void {
  const size = progressSize(item);

  const box = placeLabel(
    { x: actor.x + actor.w / 2, top: actor.y, bottom: actor.y + actor.h },
    size,
    view,
    [HUD_BOX, ...avoid],
  );

  ctx.fillStyle = BG;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  drawText(ctx, item.name, box.x + box.w / 2, box.y + 3, {
    color: TEXT,
    align: "center",
    shadow: null,
  });

  const barX = box.x + 3;
  const barY = box.y + GLYPH_H + 5;
  const barW = box.w - 6;
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(barX, barY, barW, 3);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(barX, barY, Math.round(barW * progress), 3);
}
