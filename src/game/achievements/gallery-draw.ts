import { COLOR } from "../../render/colors";
import { drawButton } from "../../render/button";
import { drawText } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { Rect } from "../../input/tap";
import type { ReelPic } from "../reel/reel-store";
import { PAGE_SIZE, thumbWindow, type CloseupLayout, type Gallery, type GalleryMode, type GridLayout } from "../reel/gallery";
import { drawPic } from "./photos-draw";

// Drawing for the gallery core (issue 117b, docs/photo-gallery-design.md section 3): the grid, the close-up
// and the phone chrome. Every rectangle comes from `reel/gallery.ts`; nothing here decides a position.
// Not called by the game yet (stages C and E wire it in). Pictures are drawn only through `drawPic`.

const HIGHLIGHT = 2;

function frame(ctx: CanvasRenderingContext2D, r: Rect, t: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, t);
  ctx.fillRect(r.x, r.y + r.h - t, r.w, t);
  ctx.fillRect(r.x, r.y + t, t, r.h - 2 * t);
  ctx.fillRect(r.x + r.w - t, r.y + t, t, r.h - 2 * t);
}

// One thumbnail in its cell: the whole picture at the largest whole scale that fits, or (a portrait that
// would only fit at 1x) its middle square at 2x, cut to the cell.
function drawThumb(ctx: CanvasRenderingContext2D, pic: ReelPic, cell: Rect): void {
  const win = thumbWindow(pic, cell);
  if (!win.slice) return drawPic(ctx, pic, cell, win.scale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.w, cell.h);
  ctx.clip();
  drawPic(ctx, pic, cell, win.scale);
  ctx.restore();
}

// The cells of the current page, then the highlight. Empty cells (a short page) are plain and are never
// highlighted. `empty` is the colour of an empty cell: the page's ink on the pause screen's dark panel, a
// slightly lighter one inside the phone's ink screen.
export function drawGrid(ctx: CanvasRenderingContext2D, g: Gallery<ReelPic>, layout: GridLayout, mode: GalleryMode): void {
  layout.cells.forEach((cell, i) => {
    const pic = g.pics[g.page * PAGE_SIZE + i];
    ctx.fillStyle = !pic && mode === "scene" ? COLOR.night : COLOR.ink;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    if (pic) drawThumb(ctx, pic, cell);
  });
  const here = g.pics[g.page * PAGE_SIZE + g.cursor] ? layout.cells[g.cursor] : null;
  if (here) frame(ctx, here, HIGHLIGHT, COLOR.butter);
}

// The phone round the scene's grid: a paper bezel, an ink screen, a status strip with a dot and a title,
// the fixed line under the grid and, on the narrow view, the CONTINUE and LEAVE touch buttons (the wide
// view, which is keyboard, gets a hint in the strip instead).
export function drawPhone(ctx: CanvasRenderingContext2D, layout: GridLayout, title = "PHOTOS"): void {
  const phone = layout.phone;
  if (!phone) return;
  ctx.fillStyle = COLOR.paper;
  ctx.fillRect(phone.panel.x, phone.panel.y, phone.panel.w, phone.panel.h);
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(phone.screen.x, phone.screen.y, phone.screen.w, phone.screen.h);
  ctx.fillStyle = COLOR.mist;
  ctx.fillRect(phone.strip.x + 3, phone.strip.y + 3, 3, 3);
  drawText(ctx, title, phone.strip.x + 10, phone.strip.y + 1, { color: COLOR.butter, shadow: null });
  if (phone.buttons.length === 0) {
    drawText(ctx, hintLine([{ key: "E", text: "CONTINUE" }, { key: "ESC", text: "LEAVE" }]), phone.strip.x + phone.strip.w - 3, phone.strip.y + 1, { color: COLOR.mist, shadow: null, align: "right" });
  }
}

// Under the grid, over the phone's screen: the fixed line and the touch buttons. Drawn after the cells.
export function drawPhoneFoot(ctx: CanvasRenderingContext2D, layout: GridLayout): void {
  const phone = layout.phone;
  if (!phone) return;
  for (const l of phone.line) drawText(ctx, l.text, l.x, l.y, { color: COLOR.mist, shadow: null });
  for (const b of phone.buttons) drawButton(ctx, b.rect, b.label);
}

// `foot` is manage mode's line along the foot of the view (its keys, or the DELETE question) and its
// colour; scene mode's key hint is `hint`, at the right end of the caption band.
export interface CloseupText {
  foot?: { text: string; color?: string };
  hint?: string;
}

export function drawCloseup(ctx: CanvasRenderingContext2D, layout: CloseupLayout, pic: ReelPic, text: CloseupText = {}): void {
  const { box } = layout;
  const full = layout.band ? { x: 0, y: 0, w: box.w, h: box.h + layout.band.h } : box;
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(full.x, full.y, full.w, full.h);
  drawPic(ctx, pic, layout.pic, layout.scale);
  if (layout.bezel) frame(ctx, layout.bezel, 3, COLOR.paper);
  for (const l of layout.caption) drawText(ctx, l.text, l.x, l.y, { color: COLOR.paper, shadow: null });
  if (layout.band && text.hint) drawText(ctx, text.hint, layout.hint.x, layout.hint.y, { color: COLOR.mist, shadow: null, align: layout.hint.align });
  if (!layout.band && text.foot) {
    const color = text.foot.color ?? COLOR.mist;
    // Stacked: the parts (split at the hint line's three-space gap) one above the other, the last on the foot.
    const parts = layout.hint.stack ? text.foot.text.split("   ") : [text.foot.text];
    parts.forEach((part, i) => drawText(ctx, part, layout.hint.x, layout.hint.y - 9 * (parts.length - 1 - i), { color, align: layout.hint.align }));
  }
}
