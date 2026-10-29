import { COLOR } from "../../render/colors";
import { drawButton } from "../../render/button";
import { drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { Rect } from "../../input/tap";
import { VIEW } from "../config";
import { wrapText } from "../dialog";
import type { ReelPic } from "../reel/reel-store";
import { REEL_PALETTE } from "../reel/palette";
import { DEFAULT_LOOK_ID, REEL_LOOKS, lookById } from "../reel/looks";
import { PAUSE_TOUCH } from "./draw";
import { PAGE_SIZE, cellsOnPage, closeupScale, gridLayout, manageGallery, pageCount, pageLabel, pictureAt, type CloseupLayout, type Gallery, type GridLayout } from "../reel/gallery";
import { drawCloseup, drawGrid } from "./gallery-draw";

// The PHOTOS page (issue 113c, docs/photo-reel-design.md section 5; manage mode, issue 117c: the pictures are
// a 3 x 2 gallery from `reel/gallery.ts`, newest first, with a close-up that can delete one). The buttons, the thumbnails and the
// lines are laid out by one function, `photosLayout`, and both the picture and the taps read it, so a tap
// and the picture cannot disagree. It reads the picture's size live (320 x 192 or the phone's 224 x 208).

const PANEL = COLOR.night;
const MARGIN = 6;
const TOP = 17;
const LINE = 9;
const THUMB_CELL = 48;
const THUMB_GAP = 2;

export const PHOTOS_INTRO = "Pick some pictures. They will be kept on this device. The originals are not kept. Nothing leaves this device.";
export const PHOTOS_NONE = "No pictures yet. The sofa has nothing to scroll.";
export const PHOTOS_NO_STORAGE = "This browser will not keep pictures.";
export const PHOTOS_REMOVED = "The pictures are gone. The originals were never here.";
export const PHOTOS_REMOVE = "REMOVE ALL";
export const PHOTOS_REMOVE_SURE = "SURE? REMOVE ALL";

export const PHOTOS_DELETED = "Picture deleted. The original was never here.";
export const PHOTOS_NOT_DELETED = "This browser could not remove it.";
export const PHOTOS_DELETE = "DELETE";
export const PHOTOS_DELETE_SURE = "SURE? DELETE";

// The LOOK switch (issue 117d): the line that says it is for new pictures only. The short one is for the
// grid, where a row is one line; the long one is for the empty page, which wraps.
export const PHOTOS_LOOK_NOTE = "New pictures only. The ones you have keep their look.";
export const PHOTOS_LOOK_NOTE_SHORT = "New pictures only.";
export const PHOTOS_LOOK_NOT_KEPT = "This browser will not remember the look.";
export const lookLabel = (id: string): string => `LOOK: ${lookById(id).name.toUpperCase()}`;
// Wide enough for every look's label, so the keys line and the buttons do not shift when it changes.
const LOOK_LONGEST = REEL_LOOKS.map((l) => lookLabel(l.id)).reduce((a, b) => (b.length > a.length ? b : a));

// "back" leaves the page from the grid and the close-up to the grid from the close-up.
export type PhotosButtonId = "add" | "look" | "open" | "remove" | "back" | "delete" | "prev" | "next" | "pagePrev" | "pageNext";

export interface PhotosView {
  touch: boolean;
  // Null until the list has been read.
  pics: readonly ReelPic[] | null;
  // False when this browser cannot keep pictures: there is nothing to add to.
  persistent: boolean;
  // Making a picture: which one of how many, or null.
  progress: { done: number; total: number } | null;
  // What just happened, as lines.
  message: readonly string[];
  // The first REMOVE ALL tap was made.
  confirmRemove: boolean;
  // The gallery over `pics` (newest first). Left out, a fresh one is made from `pics`.
  gallery?: Gallery<ReelPic> | null;
  // DELETE was pressed once in the close-up and SURE? DELETE is showing.
  confirmDelete?: boolean;
  // The look new pictures are made in (a preset id). Left out, the default look.
  look?: string;
}

export interface PhotosButton {
  id: PhotosButtonId;
  label: string;
  key: string;
  rect: Rect;
}

export interface PhotosLayout {
  intro: string[];
  // The status line and what just happened, wrapped to the picture's width, each with its y.
  status: Array<{ text: string; y: number }>;
  message: Array<{ text: string; y: number }>;
  buttons: PhotosButton[];
  thumbs: Array<{ index: number; rect: Rect }>;
  // "list": no pictures (the intro and the buttons); "grid"; "closeup".
  mode: "list" | "grid" | "closeup";
  gallery: Gallery<ReelPic> | null;
  grid: GridLayout | null;
  closeup: CloseupLayout | null;
  // Close-up: a tap here goes back to the grid.
  back: Rect | null;
  // "PAGE 2 OF 10" in the title row (grid, more than one page).
  pageLabel: { text: string; x: number; y: number } | null;
  // The "new pictures only" line, when there is a place for it (never in the close-up).
  note: Array<{ text: string; x: number; y: number }>;
  // Close-up on the keyboard: the line along the foot.
  foot: { text: string; color: string } | null;
}

export function statusText(view: PhotosView): string {
  if (view.progress) return `Making picture ${view.progress.done} of ${view.progress.total}`;
  if (!view.persistent) return PHOTOS_NO_STORAGE;
  if (!view.pics) return "";
  if (view.pics.length === 0) return PHOTOS_NONE;
  return `${view.pics.length} ${view.pics.length === 1 ? "picture" : "pictures"} on this device`;
}

// What can be pressed. While a picture is being made only BACK is offered; with nothing stored there is
// nothing to remove; with no storage there is nothing to add to.
function buttonList(view: PhotosView, grid = false): Array<{ id: PhotosButtonId; label: string; key: string }> {
  const out: Array<{ id: PhotosButtonId; label: string; key: string }> = [];
  const busy = !!view.progress;
  if (!busy && view.persistent) out.push({ id: "add", label: "ADD PHOTOS", key: "A" });
  if (!busy && view.persistent) out.push({ id: "look", label: lookLabel(view.look ?? DEFAULT_LOOK_ID), key: "S" });
  if (!busy && grid) out.push({ id: "open", label: "OPEN", key: "E" });
  if (!busy && view.persistent && view.pics && view.pics.length > 0) out.push({ id: "remove", label: view.confirmRemove ? PHOTOS_REMOVE_SURE : PHOTOS_REMOVE, key: "R" });
  out.push({ id: "back", label: "BACK", key: "ESC" });
  return out;
}

// The buttons come right under the intro, so they never move; the status, the message and then the
// thumbnails follow, taking what room they need (the thumbnails get the rest).
export function photosLayout(view: PhotosView): PhotosLayout {
  const g = view.gallery !== undefined ? view.gallery : view.pics && view.pics.length > 0 ? manageGallery(view.pics) : null;
  if (g && g.pics.length > 0) return g.view === "closeup" && pictureAt(g) ? closeupPage(view, g) : gridPage(view, g);
  return listLayout(view);
}

const NO_GALLERY = { mode: "list", gallery: null, grid: null, closeup: null, back: null, pageLabel: null, foot: null } as const;

// The look is only offered where pictures can be added.
const showNote = (view: PhotosView): boolean => !view.progress && view.persistent;

function listLayout(view: PhotosView): PhotosLayout {
  const width = VIEW.width - 2 * MARGIN;
  const intro = wrapText(PHOTOS_INTRO, width);
  const buttonsTop = TOP + LINE * intro.length + 3;
  const T = PAUSE_TOUCH;
  const list = buttonList(view);
  const w = Math.floor((VIEW.width - 2 * T.margin - T.buttonGap) / 2);
  const buttons: PhotosButton[] = list.map((b, i) =>
    view.touch
      ? { ...b, rect: { x: T.margin + (i % 2) * (w + T.buttonGap), y: buttonsTop + Math.floor(i / 2) * (T.buttonH + T.buttonGap), w, h: T.buttonH } }
      : { ...b, rect: { x: MARGIN - 3, y: buttonsTop + 10 * i - 1, w: textWidth(hintLine([{ key: b.key, text: b.label }])) + 6, h: 10 } },
  );
  let y = (view.touch ? buttonsTop + Math.ceil(list.length / 2) * (T.buttonH + T.buttonGap) : buttonsTop + 10 * list.length) + 3;
  const flow = (text: string): Array<{ text: string; y: number }> => {
    if (!text) return [];
    return wrapText(text, width).map((t) => {
      const line = { text: t, y };
      y += LINE;
      return line;
    });
  };
  const status = flow(statusText(view));
  const message = view.message.flatMap(flow);
  const noteLines = showNote(view) ? flow(PHOTOS_LOOK_NOTE) : [];
  const thumbsTop = y + 3;
  const cols = Math.max(1, Math.floor((VIEW.width - 2 * MARGIN + THUMB_GAP) / (THUMB_CELL + THUMB_GAP)));
  const rows = Math.max(0, Math.floor((VIEW.height - 12 - thumbsTop + THUMB_GAP) / (THUMB_CELL + THUMB_GAP)));
  const thumbs: Array<{ index: number; rect: Rect }> = [];
  const n = Math.min(view.pics?.length ?? 0, cols * rows);
  // Newest first (the store lists oldest first), so a picture just added is the first one shown. `index` is
  // the picture's place in `view.pics`.
  const last = (view.pics?.length ?? 0) - 1;
  for (let i = 0; i < n; i++) {
    thumbs.push({
      index: last - i,
      rect: { x: MARGIN + (i % cols) * (THUMB_CELL + THUMB_GAP), y: thumbsTop + Math.floor(i / cols) * (THUMB_CELL + THUMB_GAP), w: THUMB_CELL, h: THUMB_CELL },
    });
  }
  const note = noteLines.map((l) => ({ text: l.text, x: MARGIN, y: l.y }));
  return { intro, status, message, buttons, thumbs, ...NO_GALLERY, note };
}

const TOUCH_BUTTON_H = PAUSE_TOUCH.buttonH;
const PAGER_W = 24;

// The grid: the title row holds the page number and, on touch, the page buttons; the cells; then the
// status (or what just happened) and the buttons. The buttons sit at fixed places so they never move when
// a message comes and goes.
function gridPage(view: PhotosView, g: Gallery<ReelPic>): PhotosLayout {
  const screen = { width: VIEW.width, height: VIEW.height };
  const grid = gridLayout({ mode: "manage", screen });
  const wide = grid.kind === "wide";
  const list = buttonList(view, true);
  const buttons: PhotosButton[] = [];
  const T = PAUSE_TOUCH;
  const pages = pageCount(g.pics.length);
  let labelRight = VIEW.width - MARGIN;
  if (view.touch && pages > 1) {
    const prev: PhotosButton = { id: "pagePrev", label: "<", key: "", rect: { x: VIEW.width - MARGIN - 2 * PAGER_W - 2, y: 0, w: PAGER_W, h: TOUCH_BUTTON_H } };
    const next: PhotosButton = { id: "pageNext", label: ">", key: "", rect: { x: VIEW.width - MARGIN - PAGER_W, y: 0, w: PAGER_W, h: TOUCH_BUTTON_H } };
    buttons.push(prev, next);
    labelRight = prev.rect.x - 4;
  }
  const pageText = pages > 1 ? pageLabel(g) : "";
  let rows: number[];
  if (view.touch && wide) {
    // One row of four, wide enough for the longest label each button ever shows.
    const longest: Record<string, string> = { add: "ADD PHOTOS", open: "OPEN", remove: PHOTOS_REMOVE_SURE, back: "BACK" };
    let x = MARGIN;
    // There is no room for LOOK in the row, so it sits in the title row beside the title.
    const look = list.find((b) => b.id === "look");
    if (look) buttons.push({ ...look, rect: { x: MARGIN + textWidth("PHOTOS") + 10, y: 0, w: textWidth(LOOK_LONGEST) + 12, h: TOUCH_BUTTON_H } });
    for (const b of list.filter((b) => b.id !== "look")) {
      const w = textWidth(longest[b.id]) + 12;
      buttons.push({ ...b, rect: { x, y: VIEW.height - TOUCH_BUTTON_H - 1, w, h: TOUCH_BUTTON_H } });
      x += w + T.buttonGap;
    }
    rows = [grid.bottom + 3];
  } else if (view.touch) {
    const w = Math.floor((VIEW.width - 2 * T.margin - T.buttonGap) / 2);
    const top = grid.bottom + 33;
    list.forEach((b, i) => buttons.push({ ...b, rect: { x: T.margin + (i % 2) * (w + T.buttonGap), y: top + Math.floor(i / 2) * (T.buttonH + T.buttonGap), w, h: T.buttonH } }));
    rows = [grid.bottom + 3, grid.bottom + 12, grid.bottom + 21];
  } else if (wide) {
    // The keys on one line under the status, as the other pause pages do; when the question makes them too
    // wide for one line the rest go on the line below, which then is not a message row.
    let x = MARGIN;
    let row = 0;
    for (const b of list) {
      const w = textWidth(hintLine([{ key: b.key, text: b.id === "look" ? LOOK_LONGEST : b.label }])) + 6;
      if (x > MARGIN && x + w - 3 > VIEW.width - MARGIN) {
        x = MARGIN;
        row = 1;
      }
      buttons.push({ ...b, rect: { x: x - 3, y: grid.bottom + 10 + 9 * row, w, h: 9 } });
      x += w + 6;
    }
    rows = row ? [grid.bottom + 3] : [grid.bottom + 3, grid.bottom + 21];
  } else {
    const top = grid.bottom + 33;
    list.forEach((b, i) => buttons.push({ ...b, rect: { x: MARGIN - 3, y: top + 10 * i - 1, w: textWidth(hintLine([{ key: b.key, text: b.id === "look" ? LOOK_LONGEST : b.label }])) + 6, h: 10 } }));
    rows = [grid.bottom + 3, grid.bottom + 12, grid.bottom + 21];
  }
  // On the narrow view the last text row is the look note and a message gets the rows above it.
  const noteRow = !wide ? rows[2] : null;
  if (!wide) rows = rows.slice(0, 2);
  const width = VIEW.width - 2 * MARGIN;
  const flow = (text: string): Array<{ text: string; y: number }> => (text ? wrapText(text, width).slice(0, rows.length).map((t, i) => ({ text: t, y: rows[i] })) : []);
  const message = flow(view.message.join(" "));
  const status = message.length ? [] : flow(statusText(view));
  // The wide view has one text row for both: the note sits at its right end when the text leaves room.
  let note: PhotosLayout["note"] = [];
  if (showNote(view)) {
    if (noteRow !== null) note = [{ text: PHOTOS_LOOK_NOTE_SHORT, x: MARGIN, y: noteRow }];
    else {
      const x = VIEW.width - MARGIN - textWidth(PHOTOS_LOOK_NOTE_SHORT);
      const used = Math.max(0, ...[...message, ...status].map((l) => MARGIN + textWidth(l.text)));
      if (used + 8 <= x) note = [{ text: PHOTOS_LOOK_NOTE_SHORT, x, y: rows[0] }];
    }
  }
  const first = (g.page) * PAGE_SIZE;
  const thumbs: Array<{ index: number; rect: Rect }> = [];
  const n = view.pics?.length ?? g.pics.length;
  for (let i = 0; i < cellsOnPage(g.pics.length, g.page); i++) thumbs.push({ index: n - 1 - (first + i), rect: grid.cells[i] });
  return {
    intro: [], status, message, buttons, thumbs, mode: "grid", gallery: g, grid, closeup: null, back: null, foot: null, note,
    pageLabel: pageText ? { text: pageText, x: labelRight, y: 5 } : null,
  };
}

// The close-up: the whole picture at the largest whole scale that fits above the foot (a row of buttons on
// touch, a hint line on the keyboard), so a picture as tall as the view drops a scale step rather than
// run under it. Touch: < DELETE BACK > ; a tap on the picture goes back.
function closeupPage(view: PhotosView, g: Gallery<ReelPic>): PhotosLayout {
  const pic = pictureAt(g)!;
  const foot = view.touch ? TOUCH_BUTTON_H + 2 : 10;
  const box = { x: 0, y: 0, w: VIEW.width, h: VIEW.height - foot };
  const scale = closeupScale(pic, box);
  const w = pic.w * scale;
  const h = pic.h * scale;
  const closeup: CloseupLayout = {
    kind: VIEW.width < 280 ? "narrow" : "wide",
    box,
    pic: { x: Math.floor((box.w - w) / 2), y: Math.floor((box.h - h) / 2), w, h },
    scale,
    bezel: null,
    band: null,
    caption: [],
    hint: { x: VIEW.width / 2, y: VIEW.height - 9, align: "center", stack: false },
  };
  const buttons: PhotosButton[] = [];
  const armed = !!view.confirmDelete;
  if (view.touch) {
    const y = VIEW.height - TOUCH_BUTTON_H - 1;
    const several = g.pics.length > 1;
    const left = MARGIN + (several ? PAGER_W + 2 : 0);
    const right = VIEW.width - MARGIN - (several ? PAGER_W + 2 : 0);
    const bw = Math.floor((right - left - 2) / 2);
    if (several) buttons.push({ id: "prev", label: "<", key: "", rect: { x: MARGIN, y, w: PAGER_W, h: TOUCH_BUTTON_H } });
    buttons.push({ id: "delete", label: armed ? PHOTOS_DELETE_SURE : PHOTOS_DELETE, key: "DEL", rect: { x: left, y, w: bw, h: TOUCH_BUTTON_H } });
    buttons.push({ id: "back", label: "BACK", key: "ESC", rect: { x: left + bw + 2, y, w: bw, h: TOUCH_BUTTON_H } });
    if (several) buttons.push({ id: "next", label: ">", key: "", rect: { x: VIEW.width - MARGIN - PAGER_W, y, w: PAGER_W, h: TOUCH_BUTTON_H } });
  }
  const keys = armed
    ? `${hintLine([{ key: "DEL", text: PHOTOS_DELETE_SURE }, { key: "OTHER KEY", text: "CANCEL" }], "  ")}`
    : hintLine([{ key: "DEL", text: PHOTOS_DELETE }, { key: "< >", text: "OTHERS" }, { key: "ESC", text: "BACK" }], "  ");
  return {
    intro: [], status: [], message: [], buttons, thumbs: [], mode: "closeup", gallery: g, grid: null, closeup, back: box, pageLabel: null, note: [],
    foot: view.touch ? null : { text: keys, color: armed ? COLOR.tangerine : COLOR.mist },
  };
}

// A stored picture as an image, made once and kept (about 1,700 rectangles a frame would be too many).
const colours = REEL_PALETTE.map(([r, g, b]) => `rgb(${r},${g},${b})`);
const cache = new WeakMap<ReelPic, HTMLCanvasElement | null>();

function picCanvas(pic: ReelPic): HTMLCanvasElement | null {
  if (cache.has(pic)) return cache.get(pic) ?? null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas");
      c.width = pic.w;
      c.height = pic.h;
      const cx = c.getContext("2d");
      if (cx) {
        const data = cx.createImageData(pic.w, pic.h);
        for (let i = 0; i < pic.px.length; i++) {
          const [r, g, b] = REEL_PALETTE[pic.px[i]] ?? REEL_PALETTE[0];
          data.data.set([r, g, b, 255], i * 4);
        }
        cx.putImageData(data, 0, 0);
        canvas = c;
      }
    }
  } catch {
    canvas = null;
  }
  cache.set(pic, canvas);
  return canvas;
}

// One stored picture at its own size (1x), centred in `box`.
// `scale` is a whole multiple (the reel shows it at 3x), so every source pixel stays a crisp block.
export function drawPic(ctx: CanvasRenderingContext2D, pic: ReelPic, box: Rect, scale = 1): void {
  const x = box.x + Math.floor((box.w - pic.w * scale) / 2);
  const y = box.y + Math.floor((box.h - pic.h * scale) / 2);
  const canvas = picCanvas(pic);
  if (canvas) {
    ctx.imageSmoothingEnabled = false;
    return void ctx.drawImage(canvas, x, y, pic.w * scale, pic.h * scale);
  }
  // No canvas to keep it in (a test, a software renderer): runs of one colour, row by row.
  for (let row = 0; row < pic.h; row++) {
    let start = 0;
    for (let col = 1; col <= pic.w; col++) {
      if (col < pic.w && pic.px[row * pic.w + col] === pic.px[row * pic.w + start]) continue;
      ctx.fillStyle = colours[pic.px[row * pic.w + start]] ?? colours[0];
      ctx.fillRect(x + start * scale, y + row * scale, (col - start) * scale, scale);
      start = col;
    }
  }
}

export function drawPhotos(ctx: CanvasRenderingContext2D, view: PhotosView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const layout = photosLayout(view);
  if (layout.mode === "closeup") return drawCloseupPage(ctx, view, layout);
  drawText(ctx, "PHOTOS", MARGIN, 5, { color: COLOR.butter });
  if (layout.pageLabel) drawText(ctx, layout.pageLabel.text, layout.pageLabel.x, layout.pageLabel.y, { color: COLOR.mist, shadow: null, align: "right" });
  if (layout.grid && layout.gallery) drawGrid(ctx, layout.gallery, layout.grid, "manage");
  layout.intro.forEach((line, i) => drawText(ctx, line, MARGIN, TOP + LINE * i, { color: COLOR.paper, shadow: null }));
  for (const l of layout.status) drawText(ctx, l.text, MARGIN, l.y, { color: COLOR.butter, shadow: null });
  for (const l of layout.message) drawText(ctx, l.text, MARGIN, l.y, { color: COLOR.mist, shadow: null });
  for (const l of layout.note) drawText(ctx, l.text, l.x, l.y, { color: COLOR.mist, shadow: null });
  for (const b of layout.buttons) {
    const color = b.id === "remove" && view.confirmRemove ? COLOR.tangerine : COLOR.paper;
    if (view.touch) drawButton(ctx, b.rect, b.label, { color });
    else drawText(ctx, hintLine([{ key: b.key, text: b.label }]), b.rect.x + 3, b.rect.y + 1, { color, shadow: null });
  }
  // The list (no pictures) keeps its own back hint line on touch; the grid has a BACK button.
  const hint = view.touch && layout.mode === "list" ? hintLine([{ key: "ESC", text: "BACK" }]) : null;
  if (hint) drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, { color: COLOR.mist, align: "center" });
}

function drawCloseupPage(ctx: CanvasRenderingContext2D, view: PhotosView, layout: PhotosLayout): void {
  const pic = pictureAt(layout.gallery!)!;
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawCloseup(ctx, layout.closeup!, pic, { foot: layout.foot ?? undefined });
  for (const b of layout.buttons) drawButton(ctx, b.rect, b.label, { color: b.id === "delete" && view.confirmDelete ? COLOR.tangerine : COLOR.paper });
}
