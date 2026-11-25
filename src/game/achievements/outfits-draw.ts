import type { Rect } from "../../input/tap";
import { drawButton } from "../../render/button";
import { COLOR } from "../../render/colors";
import { fitLabel } from "../../render/dialog-box";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { SpriteDrawer } from "../../render/sprites";
import { VIEW } from "../config";
import { wrapText } from "../dialog";
import type { DecorItem } from "../decor-data";
import { OUTFIT_SLOTS, outfitByItem } from "../outfits";
import { FACINGS, type OutfitsFocus } from "./outfits-page";

// The OUTFITS pause page (issue 181, docs/outfit-equip-screen-design.md): the four slots on the left, the owned
// outfits the picked slot takes, a top bar with only the highlighted outfit's own note, and the character at 4x
// (crisp pixels) with the four facings small beside it. It is laid out for the 320 x 192 view and the phone's
// 224 x 208 one, reading the picture's size live, and the same rectangles are drawn and tapped. There is no count,
// total or progress anywhere on it (docs/decor.md, collecting) and no help text beyond the keys line.

const PANEL = COLOR.night;
const MARGIN = 6;
const TITLE = "OUTFITS";
const WORN = "WORN";
const EMPTY = "-";
const LIST_ROWS = 5;
const CHAR = 16;
const SCALE = 4;
export const PREVIEW_PX = CHAR * SCALE;

export interface OutfitsSlotView {
  name: string;
  // The outfit equipped in the slot, if any.
  outfit?: DecorItem;
  worn: boolean;
}

export interface OutfitsView {
  focus: OutfitsFocus;
  slot: number;
  row: number;
  facing: number;
  slots: readonly OutfitsSlotView[];
  choices: readonly DecorItem[];
  // The id of the outfit equipped in the picked slot (the list marks it).
  equippedId?: string;
  note?: string;
  // The item id drawn on the character.
  previewId: string;
  touch: boolean;
  sprites?: SpriteDrawer;
}

export interface OutfitsLayout {
  narrow: boolean;
  back: Rect;
  bar: Rect;
  barLines: number;
  slots: Rect[];
  list: Rect;
  rowH: number;
  preview: Rect;
  char: Rect;
  // The four small facings (desktop: pictures; phone: squares).
  facings: Rect[];
  keysY: number;
}

export function outfitsLayout(): OutfitsLayout {
  const narrow = VIEW.width < 300;
  const w = VIEW.width - 2 * MARGIN;
  const back = { x: VIEW.width - MARGIN - (textWidth("BACK") + 12), y: 1, w: textWidth("BACK") + 12, h: 14 };
  const keysY = VIEW.height - 9;
  if (!narrow) {
    const bar = { x: MARGIN, y: 16, w, h: 14 };
    const slots = OUTFIT_SLOTS.map((_, i) => ({ x: MARGIN, y: 34 + i * 36, w: 130, h: 32 }));
    const x = MARGIN + 130 + 4;
    const list = { x, y: 34, w: VIEW.width - MARGIN - x, h: LIST_ROWS * 10 + 4 };
    const top = list.y + list.h + 4;
    const preview = { x, y: top, w: list.w, h: 174 - top };
    const char = { x: preview.x + 8, y: preview.y + 9, w: PREVIEW_PX, h: PREVIEW_PX };
    const fx = preview.x + 84;
    const facings = FACINGS.map((_, i) => ({ x: fx + (i % 2) * 38, y: preview.y + 5 + Math.floor(i / 2) * 38, w: 34, h: 34 }));
    return { narrow, back, bar, barLines: 1, slots, list, rowH: 10, preview, char, facings, keysY };
  }
  const bar = { x: MARGIN, y: 16, w, h: 22 };
  const slots = OUTFIT_SLOTS.map((_, i) => ({ x: MARGIN, y: 42 + i * 16, w, h: 14 }));
  const pw = 70;
  const list = { x: MARGIN, y: 108, w: w - pw - 4, h: LIST_ROWS * 14 + 4 };
  const preview = { x: list.x + list.w + 4, y: list.y, w: pw, h: list.h };
  const char = { x: preview.x + Math.floor((pw - PREVIEW_PX) / 2), y: preview.y + 1, w: PREVIEW_PX, h: PREVIEW_PX };
  const sx = preview.x + Math.floor((pw - (4 * 5 + 3 * 3)) / 2);
  const facings = FACINGS.map((_, i) => ({ x: sx + i * 8, y: preview.y + 69, w: 5, h: 5 }));
  return { narrow, back, bar, barLines: 2, slots, list, rowH: 14, preview, char, facings, keysY };
}

// The first list row shown: the highlighted one stays in view (centred when it can be).
export function listStart(row: number, count: number): number {
  return Math.min(Math.max(0, row - 2), Math.max(0, count - LIST_ROWS));
}

// The rows of the list that show, with their rectangles.
export function outfitsRows(view: Pick<OutfitsView, "choices" | "row">): Array<{ index: number; rect: Rect }> {
  const l = outfitsLayout();
  const start = listStart(view.row, view.choices.length);
  const out: Array<{ index: number; rect: Rect }> = [];
  for (let i = start; i < Math.min(view.choices.length, start + LIST_ROWS); i++) out.push({ index: i, rect: { x: l.list.x + 1, y: l.list.y + 2 + (i - start) * l.rowH, w: l.list.w - 2, h: l.rowH } });
  return out;
}

export function outfitsButtons(touch: boolean): Array<{ id: "back"; label: string; rect: Rect }> {
  return touch ? [{ id: "back", label: "BACK", rect: outfitsLayout().back }] : [];
}

// The keys line. On touch it names the pad and the buttons; BACK is dropped when the line would not fit (BACK is a button there).
export function outfitsHint(): string {
  const parts = [
    { key: "ARROWS", text: "PICK" },
    { key: "E", text: "EQUIP" },
    { key: "TAB", text: "TURN" },
    { key: "ESC", text: "BACK" },
  ];
  const full = hintLine(parts);
  return textWidth(full) <= VIEW.width - 12 ? full : hintLine(parts.slice(0, 3));
}

function box(ctx: CanvasRenderingContext2D, r: Rect, border: string, fill: string): void {
  ctx.fillStyle = border;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = fill;
  ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
}

// The bookshelf list's 3 x 5 triangle.
function pointer(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 5);
  ctx.fillRect(x + 1, y + 1, 1, 3);
  ctx.fillRect(x + 2, y + 2, 1, 1);
}

// The sprite of an outfit item facing a way: `<prefix>-idle-<dir>`.
export function outfitSprite(itemId: string, facing: number): string | undefined {
  const o = outfitByItem(itemId);
  return o ? `${o.prefix}-idle-${FACINGS[((facing % 4) + 4) % 4]}` : undefined;
}

// A 16x16 sprite drawn at `px` x `px` with crisp pixels. The real drawer's `draw` ignores the size (it is only the
// placeholder's), so this uses `drawRegion`, the whole-number scaling the THINGS page uses.
function drawSprite(ctx: CanvasRenderingContext2D, sprites: SpriteDrawer | undefined, name: string | undefined, x: number, y: number, px: number): void {
  if (!sprites || !name) return;
  if (!sprites.drawRegion) return sprites.draw(ctx, name, x, y, { width: px, height: px });
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  sprites.drawRegion(ctx, name, { x: 0, y: 0, w: CHAR, h: CHAR }, { width: px, height: px });
  ctx.restore();
}

export function drawOutfits(ctx: CanvasRenderingContext2D, view: OutfitsView): void {
  const L = outfitsLayout();
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawText(ctx, TITLE, MARGIN, 5, { color: COLOR.butter });
  for (const b of outfitsButtons(view.touch)) drawButton(ctx, b.rect, b.label);

  // The top bar: the highlighted outfit's own note, and nothing else.
  box(ctx, L.bar, COLOR.ink, COLOR.slate);
  if (view.note) wrapText(view.note, L.bar.w - 8).slice(0, L.barLines).forEach((line, i) => drawText(ctx, line, L.bar.x + 4, L.bar.y + (L.narrow ? 3 : 4) + i * 9, { color: COLOR.paper, shadow: null }));

  // The slots. The picked one has a butter border while the focus is on the slots, a dusk one while it is in the list.
  view.slots.forEach((s, i) => {
    const r = L.slots[i];
    const picked = i === view.slot;
    const inSlots = view.focus === "slots";
    box(ctx, r, picked ? (inSlots ? COLOR.butter : COLOR.dusk) : COLOR.ink, picked && inSlots ? COLOR.night : COLOR.slate);
    const nameColor = picked ? (inSlots ? COLOR.butter : COLOR.paper) : COLOR.mist;
    if (picked) pointer(ctx, r.x + 4, r.y + (L.narrow ? 4 : 5), inSlots ? COLOR.butter : COLOR.mist);
    drawText(ctx, s.name, r.x + 10, r.y + (L.narrow ? 4 : 5), { color: nameColor, shadow: null });
    const worn = s.worn ? textWidth(WORN) : 0;
    if (s.worn) drawText(ctx, WORN, r.x + r.w - 4, r.y + (L.narrow ? 4 : 5), { color: COLOR.butter, shadow: null, align: "right" });
    const name = s.outfit?.name ?? EMPTY;
    const color = s.outfit ? COLOR.paper : COLOR.mist;
    if (L.narrow) {
      const col = r.x + 10 + Math.max(...OUTFIT_SLOTS.map((d) => textWidth(d.name))) + 6;
      drawText(ctx, fitLabel(name, r.x + r.w - 4 - worn - 4 - col), col, r.y + 4, { color, shadow: null });
    } else drawText(ctx, fitLabel(name, r.w - 8), r.x + 4, r.y + 5 + GLYPH_H + 5, { color, shadow: null });
  });

  // The list of outfits the picked slot takes.
  box(ctx, L.list, view.focus === "list" ? COLOR.butter : COLOR.ink, COLOR.slate);
  const start = listStart(view.row, view.choices.length);
  for (const { index, rect } of outfitsRows(view)) {
    const item = view.choices[index];
    const here = index === view.row;
    const inList = view.focus === "list";
    if (here && inList) {
      ctx.fillStyle = COLOR.night;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    const ty = rect.y + Math.floor((rect.h - GLYPH_H) / 2);
    if (here) pointer(ctx, rect.x + 3, ty, inList ? COLOR.butter : COLOR.mist);
    if (item.id === view.equippedId) {
      ctx.fillStyle = COLOR.butter;
      ctx.fillRect(rect.x + 8, ty + 2, 3, 3);
    }
    drawText(ctx, fitLabel(item.name, rect.w - 14), rect.x + 13, ty, { color: here && inList ? COLOR.butter : COLOR.paper, shadow: null });
  }
  // A small arrow at the foot (or the head) when there are more rows; no count.
  if (start + LIST_ROWS < view.choices.length) {
    ctx.fillStyle = COLOR.mist;
    const ax = L.list.x + L.list.w - 8;
    const ay = L.list.y + L.list.h - 5;
    ctx.fillRect(ax, ay, 5, 1);
    ctx.fillRect(ax + 1, ay + 1, 3, 1);
    ctx.fillRect(ax + 2, ay + 2, 1, 1);
  }
  if (start > 0) {
    ctx.fillStyle = COLOR.mist;
    const ax = L.list.x + L.list.w - 8;
    const ay = L.list.y + 3;
    ctx.fillRect(ax + 2, ay, 1, 1);
    ctx.fillRect(ax + 1, ay + 1, 3, 1);
    ctx.fillRect(ax, ay + 2, 5, 1);
  }

  // The preview: the character at 4x on a strip of floor, the four facings small beside it. It is a view only.
  box(ctx, L.preview, COLOR.ink, COLOR.slate);
  ctx.fillStyle = COLOR.night;
  ctx.fillRect(L.char.x - 2, L.char.y + L.char.h + 1, L.char.w + 4, 3);
  drawSprite(ctx, view.sprites, outfitSprite(view.previewId, view.facing), L.char.x, L.char.y, PREVIEW_PX);
  FACINGS.forEach((_, i) => {
    const r = L.facings[i];
    const on = i === view.facing;
    if (L.narrow) {
      ctx.fillStyle = on ? COLOR.butter : COLOR.dusk;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      return;
    }
    box(ctx, r, on ? COLOR.butter : COLOR.ink, COLOR.night);
    drawSprite(ctx, view.sprites, outfitSprite(view.previewId, i), r.x + 1, r.y + 1, 2 * CHAR);
  });

  drawText(ctx, outfitsHint(), VIEW.width / 2, L.keysY, { color: COLOR.mist, align: "center" });
}
