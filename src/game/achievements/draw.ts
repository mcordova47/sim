import { COLOR } from "../../render/colors";
import { drawText, textWidth } from "../../render/font";
import type { SpriteDrawer } from "../../render/sprites";
import { GOOD_HOUR_ICON, GOOD_HOUR_ICON_SIZE } from "../../render/world-ui";
import { VIEW } from "../config";
import type { Achievement } from "./data";
import type { ToastView } from "./toasts";

const PANEL = COLOR.night;

export function drawToasts(ctx: CanvasRenderingContext2D, toasts: ToastView[]): void {
  for (const t of toasts) {
    const { x, y, w, h } = t.box;
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.butter;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    drawText(ctx, t.title, x + 4, y + 4, { color: COLOR.butter });
    t.lines.forEach((line, i) => drawText(ctx, line, x + 4, y + 4 + 9 * (i + 1), { color: COLOR.paper }));
  }
  ctx.globalAlpha = 1;
}

export const LIST_LAYOUT = {
  top: 18,
  rowHeight: 10,
  columns: 2,
  // Where the description of the picked achievement goes.
  footerTop: VIEW.height - 28,
};

// How many achievements fit in the list (so a test can say when it is full).
export const LIST_CAPACITY =
  LIST_LAYOUT.columns * Math.floor((LIST_LAYOUT.footerTop - 2 - LIST_LAYOUT.top) / LIST_LAYOUT.rowHeight);

export interface ListView {
  achievements: readonly Achievement[];
  unlocked: (id: string) => boolean;
  cursor: number;
  // A line to show instead of the usual hint, for example the reset question.
  message: string | null;
  // The dialog voice setting ("DIALOG VOICE: BEEP"); without it there is no D key to show.
  voice?: string | null;
  // The ad blocker switch (issue 043 stage B): true for on. Without it there is no B key to show.
  adBlocker?: boolean | null;
  // Where the legend's icon comes from; without it (or the sprite) there is no legend.
  sprites?: SpriteDrawer;
}

// The line at the foot of the list. With the sound feature on, D switches the
// dialog voice (its state is drawn at the right of the picked name's row).
export const LIST_HINT = "ARROWS: LOOK   L: CLOSE   SHIFT+R: RESET";
export const LIST_HINT_VOICE = "ARROWS: LOOK   D: VOICE   L: CLOSE   SHIFT+R: RESET";

// The hint with the ad blocker switch (issue 043 stage B): B first, in the place of `ARROWS: LOOK`
// (the arrows are obvious in a list). With the voice key as well the line is too long for the screen
// at full wording, so it uses the shorter name and tighter gaps; the first one that fits is used.
export function listHint(voice: boolean, adBlocker: boolean): string {
  const state = adBlocker ? "ON" : "OFF";
  const tail = voice ? ["D: VOICE", "L: CLOSE", "SHIFT+R: RESET"] : ["L: CLOSE", "SHIFT+R: RESET"];
  const candidates = [
    [`B: AD BLOCKER ${state}`, ...tail].join("   "),
    [`B: AD BLOCK ${state}`, ...tail].join("  "),
  ];
  return candidates.find((c) => textWidth(c) <= VIEW.width - 12) ?? candidates[candidates.length - 1];
}

export const LEGEND_TEXT = "GOOD HOUR: 1.5X POINTS";

// The list of achievements: a full-screen panel, locked ones as "???".
export function drawList(ctx: CanvasRenderingContext2D, view: ListView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const done = view.achievements.filter((a) => view.unlocked(a.id)).length;
  drawText(ctx, `ACHIEVEMENTS ${done}/${view.achievements.length}`, 6, 5, { color: COLOR.butter });

  // Legend for the clock icon the prompt and the award popup use.
  if (view.sprites?.has(GOOD_HOUR_ICON)) {
    const x = VIEW.width - 6 - textWidth(LEGEND_TEXT);
    view.sprites.draw(ctx, GOOD_HOUR_ICON, x - GOOD_HOUR_ICON_SIZE - 3, 4);
    drawText(ctx, LEGEND_TEXT, x, 5, { color: COLOR.mist, shadow: null });
  }

  const perColumn = Math.ceil(view.achievements.length / LIST_LAYOUT.columns);
  const columnWidth = Math.floor((VIEW.width - 12) / LIST_LAYOUT.columns);
  view.achievements.forEach((a, i) => {
    const col = Math.floor(i / perColumn);
    const x = 6 + col * columnWidth;
    const y = LIST_LAYOUT.top + (i % perColumn) * LIST_LAYOUT.rowHeight;
    const has = view.unlocked(a.id);
    if (i === view.cursor) {
      ctx.fillStyle = COLOR.slate;
      ctx.fillRect(x - 3, y - 1, columnWidth - 2, LIST_LAYOUT.rowHeight - 1);
    }
    drawText(ctx, has ? a.name : "???", x, y, { color: has ? COLOR.paper : COLOR.mist, shadow: null });
  });

  const picked = view.achievements[view.cursor];
  if (picked) {
    const has = view.unlocked(picked.id);
    drawText(ctx, has ? picked.name : "???", 6, LIST_LAYOUT.footerTop, { color: COLOR.butter });
    if (view.voice) drawText(ctx, view.voice, VIEW.width - 6, LIST_LAYOUT.footerTop, { color: COLOR.mist, shadow: null, align: "right" });
    drawText(ctx, has ? picked.description : "???", 6, LIST_LAYOUT.footerTop + 10, { color: COLOR.paper });
  }
  const plain = view.voice ? LIST_HINT_VOICE : LIST_HINT;
  const hint = view.message ?? (typeof view.adBlocker === "boolean" ? listHint(!!view.voice, view.adBlocker) : plain);
  drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, {
    color: view.message ? COLOR.tangerine : COLOR.mist,
    align: "center",
  });
}
