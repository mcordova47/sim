import type { Interactable } from "../game/interactable";
import { COLOR, withAlpha } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";
import { keyLabel } from "./hints";
import { HUD_BOX, placeLabel, type Box } from "./layout";
import type { SpriteDrawer } from "./sprites";

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

// An unmet requirement's reason replaces the verb ("NO DIRTY DISHES").
function promptLabel(item: Interactable, cooldownRemaining: number, unavailable: string | null): string {
  if (unavailable) return unavailable;
  return cooldownRemaining > 0
    ? `${item.prompt} (${Math.ceil(cooldownRemaining)} SEC)`
    : item.prompt;
}

// Size of the prompt box, so layout (and tests over the real task data) can
// measure it without drawing.
// A task at its best hour (issue 009d) has `GOOD_HOUR_HINT` after the verb.
// With the icon sprite loaded it is a small clock; without it, the words.
export const GOOD_HOUR_HINT = "GOOD HOUR";
export const GOOD_HOUR_ICON = "icon-good-hour";
export const GOOD_HOUR_ICON_SIZE = 9;
const HINT_GAP = 5;

// Where the player is among the tasks offered at an object (issue 039), shown
// after the verb as "<1/3>" when there is more than one.
export interface Choice {
  index: number;
  count: number;
}
const choiceLabel = (c: Choice) => `<${c.index + 1}/${c.count}>`;
const choiceWidth = (c?: Choice | null) => (c && c.count > 1 ? HINT_GAP + textWidth(choiceLabel(c)) : 0);

export function promptSize(
  item: Interactable,
  cooldownRemaining: number,
  unavailable: string | null = null,
  goodTime = false,
  iconReady = false,
  choice: Choice | null = null,
) {
  const keyW = cooldownRemaining > 0 || unavailable ? 0 : KEY_WIDTH;
  const hintW = goodTime ? HINT_GAP + (iconReady ? GOOD_HOUR_ICON_SIZE : textWidth(GOOD_HOUR_HINT)) : 0;
  return { w: 3 + keyW + textWidth(promptLabel(item, cooldownRemaining, unavailable)) + choiceWidth(choice) + hintW + 3, h: 13 };
}

export function progressSize(item: Interactable) {
  return { w: Math.max(textWidth(item.name) + 6, 44), h: GLYPH_H + 11 };
}

// "[E] Make coffee", or the name greyed out with a countdown while the task
// is cooling down, or the reason greyed out when it can't be done now. `actor` is in screen coordinates. `avoid` lists other boxes
// (such as live popups) the label should stay clear of, besides the HUD.
export function drawPrompt(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  item: Interactable,
  cooldownRemaining: number,
  view: View,
  avoid: Box[] = [],
  unavailable: string | null = null,
  goodTime = false,
  sprites?: SpriteDrawer,
  choice: Choice | null = null,
): void {
  const cooling = cooldownRemaining > 0 || unavailable !== null;
  const label = promptLabel(item, cooldownRemaining, unavailable);
  const icon = !!sprites?.has(GOOD_HOUR_ICON);
  const size = promptSize(item, cooldownRemaining, unavailable, goodTime, icon, choice);

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
    drawText(ctx, keyLabel("E"), box.x + 4, box.y + 3, { color: KEY_FG, shadow: null });
    textX += KEY_WIDTH;
  }
  drawText(ctx, label, textX, box.y + 3, { color: cooling ? DIM : TEXT, shadow: null });
  let afterX = textX + textWidth(label);
  if (choice && choice.count > 1 && !cooling) {
    drawText(ctx, choiceLabel(choice), afterX + HINT_GAP, box.y + 3, { color: DIM, shadow: null });
    afterX += choiceWidth(choice);
  }
  if (goodTime && !cooling) {
    const hintX = afterX + HINT_GAP;
    if (icon) sprites!.draw(ctx, GOOD_HOUR_ICON, hintX, box.y + 2);
    else drawText(ctx, GOOD_HOUR_HINT, hintX, box.y + 3, { color: ACCENT, shadow: null });
  }
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
