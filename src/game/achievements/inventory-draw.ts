import { COLOR } from "../../render/colors";
import { drawButton } from "../../render/button";
import { drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { Rect } from "../../input/tap";
import type { SpriteDrawer } from "../../render/sprites";
import { VIEW } from "../config";
import { wrapText } from "../dialog";
import type { InventoryEntry } from "../decor";

// The THINGS page (issue 109b, docs/inventory-design.md): a grid of what you own, one sprite each, in the
// order you got them, and a box under it for the picked one. It reads the picture's size live, so it is
// laid out for the 320 x 192 view and for the phone's 224 x 208 one. The same rectangles are drawn and
// tapped. There is no count, total or progress anywhere on it (docs/decor.md, collecting).

const PANEL = COLOR.night;
const MARGIN = 6;
const GRID_TOP = 16;
export const THINGS_CELL_H = 24;
export const THINGS_ROWS = 4;
// The pantry is 32 tall at its own size: its cell shows the top of it, the entry box all of it.
const PAD = 4;
const SPRITE_SCALE = 2;
// The silhouette of something seen in an ad and not taken, and the two lines of its entry.
const SHAPE = COLOR.ink;
export const SILHOUETTE_NAME = "???";
export const SILHOUETTE_LINE = "YOU HAVE SEEN ONE OF THESE.";
const LINE = 9;

export interface ThingsView {
  entries: readonly InventoryEntry[];
  cursor: number;
  touch: boolean;
  sprites?: SpriteDrawer;
}

// Five columns on the 320 view, four on the narrow one: cells are whole pixels wide and 24 tall.
export function thingsGrid(): { cols: number; rows: number; perPage: number; cellW: number } {
  const cols = VIEW.width >= 300 ? 5 : 4;
  return { cols, rows: THINGS_ROWS, perPage: cols * THINGS_ROWS, cellW: Math.floor((VIEW.width - 2 * MARGIN) / cols) };
}

export function thingsPage(view: Pick<ThingsView, "cursor">): number {
  return Math.floor(view.cursor / thingsGrid().perPage);
}

export function thingsPages(count: number): number {
  return Math.max(1, Math.ceil(count / thingsGrid().perPage));
}

// The cells of the page the cursor is on.
export function thingsCells(view: Pick<ThingsView, "entries" | "cursor">): Array<{ index: number; rect: Rect }> {
  const g = thingsGrid();
  const start = thingsPage(view) * g.perPage;
  const out: Array<{ index: number; rect: Rect }> = [];
  for (let i = start; i < Math.min(view.entries.length, start + g.perPage); i++) {
    const k = i - start;
    out.push({ index: i, rect: { x: MARGIN + (k % g.cols) * g.cellW, y: GRID_TOP + Math.floor(k / g.cols) * THINGS_CELL_H, w: g.cellW, h: THINGS_CELL_H } });
  }
  return out;
}

// The cursor after an arrow. Left and right go one entry and wrap through the whole list; up and down go a
// row and wrap within their column, so every entry on every page can be reached from the keys.
export function moveThingsCursor(cursor: number, count: number, dir: "left" | "right" | "up" | "down"): number {
  if (count <= 0) return 0;
  const { cols } = thingsGrid();
  const at = Math.min(Math.max(cursor, 0), count - 1);
  if (dir === "left") return (at - 1 + count) % count;
  if (dir === "right") return (at + 1) % count;
  const col = at % cols;
  if (dir === "down") {
    const next = at + cols;
    return next < count ? next : col;
  }
  const prev = at - cols;
  if (prev >= 0) return prev;
  let last = col + Math.floor((count - 1 - col) / cols) * cols;
  if (last >= count) last = count - 1;
  return last;
}

export type ThingsButtonId = "back" | "page";

// BACK and PAGE sit in the title row on touch; PAGE only when there is more than one page.
export function thingsButtons(view: Pick<ThingsView, "entries" | "cursor" | "touch">): Array<{ id: ThingsButtonId; label: string; rect: Rect }> {
  if (!view.touch) return [];
  const out: Array<{ id: ThingsButtonId; label: string; rect: Rect }> = [];
  const back = "BACK";
  const bw = textWidth(back) + 12;
  const backRect = { x: VIEW.width - MARGIN - bw, y: 1, w: bw, h: 14 };
  out.push({ id: "back", label: back, rect: backRect });
  const pages = thingsPages(view.entries.length);
  if (pages > 1) {
    const label = `PAGE ${thingsPage(view) + 1}/${pages}`;
    const pw = textWidth(label) + 12;
    out.push({ id: "page", label, rect: { x: backRect.x - 3 - pw, y: 1, w: pw, h: 14 } });
  }
  return out;
}

// The box under the grid.
export function thingsBox(): Rect {
  const top = GRID_TOP + THINGS_ROWS * THINGS_CELL_H + 2;
  return { x: MARGIN, y: top, w: VIEW.width - 2 * MARGIN, h: VIEW.height - 11 - top };
}

export interface EntryLine {
  text: string;
  x: number;
  y: number;
  color: string;
}

// The entry for one thing: the sprite at 2x in the box's top right, and the text to its left, wrapping
// under it once the sprite is passed. Name, the deadpan line (when there is one), where it came from,
// where it is now and, when something in the room can change it, where to go.
export function entryLayout(entry: InventoryEntry): { sprite: Rect; lines: EntryLine[]; bottom: number } {
  const box = thingsBox();
  const { w, h } = entry.item;
  const sprite: Rect = { x: box.x + box.w - PAD - w * SPRITE_SCALE, y: box.y + 2, w: w * SPRITE_SCALE, h: h * SPRITE_SCALE };
  const left = box.x + PAD + 1;
  const beside = sprite.x - 6 - left;
  const full = box.x + box.w - PAD - left;
  const lines: EntryLine[] = [];
  let y = box.y + PAD;
  const add = (text: string | undefined, color: string, gapBefore = 0) => {
    if (!text) return;
    y += gapBefore;
    let rest = text;
    while (rest.length > 0) {
      const width = y < sprite.y + sprite.h ? beside : full;
      const first = wrapText(rest, width)[0];
      lines.push({ text: first, x: left, y, color });
      y += LINE;
      rest = rest.slice(first.length).trimStart();
    }
  };
  if (entry.silhouette) {
    // Nothing about it: not its name, where it came from or how to get one.
    add(SILHOUETTE_NAME, COLOR.butter);
    add(SILHOUETTE_LINE, COLOR.paper, 2);
    return { sprite, lines, bottom: y };
  }
  add(entry.item.name, COLOR.butter);
  add(entry.item.note, COLOR.paper, 2);
  add(entry.from, COLOR.mist, 3);
  add(entry.where, COLOR.paper);
  add(entry.changeAt, COLOR.mist, 3);
  return { sprite, lines, bottom: y };
}

export function thingsHint(): string {
  return hintLine([
    { key: "ARROWS", text: "LOOK" },
    { key: "ESC", text: "BACK" },
    { key: "L", text: "CLOSE" },
  ]);
}

// A sprite drawn at a whole-number scale and position, cropped to `h` rows when it is taller than its room.
function drawSprite(ctx: CanvasRenderingContext2D, sprites: SpriteDrawer | undefined, name: string, at: { x: number; y: number }, size: { w: number; h: number }, scale: number, rows = size.h, flat = false): void {
  if (flat) {
    // A flat dark shape; without a drawer that can cut one out, a plain dark box of the same size.
    if (sprites?.drawFlat && sprites.has(name)) return sprites.drawFlat(ctx, name, at.x, at.y, scale, SHAPE, rows);
    ctx.fillStyle = SHAPE;
    ctx.fillRect(Math.round(at.x), Math.round(at.y), size.w * scale, rows * scale);
    return;
  }
  if (!sprites) return;
  if (!sprites.drawRegion) return sprites.draw(ctx, name, at.x, at.y, { width: size.w, height: size.h });
  ctx.save();
  ctx.translate(Math.round(at.x), Math.round(at.y));
  sprites.drawRegion(ctx, name, { x: 0, y: 0, w: size.w, h: rows }, { width: size.w * scale, height: rows * scale });
  ctx.restore();
}

export function drawThings(ctx: CanvasRenderingContext2D, view: ThingsView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawText(ctx, "THINGS", MARGIN, 5, { color: COLOR.butter });
  const pages = thingsPages(view.entries.length);
  if (view.touch) {
    for (const b of thingsButtons(view)) drawButton(ctx, b.rect, b.label, { color: b.id === "page" ? COLOR.butter : COLOR.paper });
  } else if (pages > 1) {
    drawText(ctx, `PAGE ${thingsPage(view) + 1}/${pages}`, VIEW.width - MARGIN, 5, { color: COLOR.mist, shadow: null, align: "right" });
  }

  for (const { index, rect } of thingsCells(view)) {
    const picked = index === view.cursor;
    ctx.fillStyle = picked ? COLOR.butter : COLOR.ink;
    ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
    ctx.fillStyle = COLOR.slate;
    ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    const entry = view.entries[index];
    const item = entry.item;
    const rows = Math.min(item.h, rect.h - 4);
    const x = rect.x + Math.floor((rect.w - item.w) / 2);
    const y = rect.y + 2 + Math.floor((rect.h - 4 - rows) / 2);
    drawSprite(ctx, view.sprites, item.sprite, { x, y }, item, 1, rows, entry.silhouette);
  }

  const box = thingsBox();
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = COLOR.slate;
  ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
  const entry = view.entries[Math.min(Math.max(view.cursor, 0), view.entries.length - 1)];
  if (entry) {
    const layout = entryLayout(entry);
    drawSprite(ctx, view.sprites, entry.item.sprite, layout.sprite, entry.item, SPRITE_SCALE, entry.item.h, entry.silhouette);
    for (const l of layout.lines) drawText(ctx, l.text, l.x, l.y, { color: l.color, shadow: null });
  }
  drawText(ctx, thingsHint(), VIEW.width / 2, VIEW.height - 9, { color: COLOR.mist, align: "center" });
}
