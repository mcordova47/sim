import type { Rect } from "../../input/tap";
import { textWidth } from "../../render/font";
import { wrapText } from "../dialog";

// The gallery core (issue 117b, docs/photo-gallery-design.md sections 3 and 4.5). Pure: state, paging,
// the rectangles of every piece, the close-up scale and the thumbnail rule. No canvas, no game, no
// storage. Both entry points (the PHOTOS page in manage mode, the sofa scene in scene mode) hold one
// `Gallery` and ask this file where things go, so they cannot disagree. Nothing here knows what a
// picture shows: only its size and its pixels' count.

export const GRID_COLS = 3;
export const GRID_ROWS = 2;
export const PAGE_SIZE = GRID_COLS * GRID_ROWS;

export type GalleryMode = "manage" | "scene";
export type GalleryView = "grid" | "closeup";
export type Dir = "left" | "right" | "up" | "down";
export type ScreenKind = "wide" | "narrow";

// Only the size is read from a picture here, so a store picture and a test picture both fit.
export interface PicSize {
  w: number;
  h: number;
}

export interface Gallery<P extends PicSize = PicSize> {
  // In display order: manage mode newest first, scene mode the six picked.
  pics: readonly P[];
  page: number;
  // 0..PAGE_SIZE-1, a cell of the page. It always rests on a cell that holds a picture (or 0 when empty).
  cursor: number;
  view: GalleryView;
}

// ---------------------------------------------------------------- state

export const pageCount = (n: number): number => Math.max(1, Math.ceil(n / PAGE_SIZE));

// The picture's place in `pics`, or null when the highlight is on nothing.
export function indexAt(g: Gallery): number | null {
  const i = g.page * PAGE_SIZE + g.cursor;
  return i >= 0 && i < g.pics.length ? i : null;
}

export function pictureAt<P extends PicSize>(g: Gallery<P>): P | null {
  const i = indexAt(g);
  return i === null ? null : g.pics[i];
}

// How many cells of `page` hold a picture.
export const cellsOnPage = (n: number, page: number): number => Math.max(0, Math.min(PAGE_SIZE, n - page * PAGE_SIZE));

const atFlat = <P extends PicSize>(g: Gallery<P>, flat: number): Gallery<P> => ({ ...g, page: Math.floor(flat / PAGE_SIZE), cursor: flat % PAGE_SIZE });

// Manage mode: the store lists oldest first; the gallery shows newest first, all of them, paged.
export function manageGallery<P extends PicSize>(oldestFirst: readonly P[]): Gallery<P> {
  return { pics: [...oldestFirst].reverse(), page: 0, cursor: 0, view: "grid" };
}

// Scene mode: `count` pictures picked at random (a partial shuffle with `random()` in [0, 1)), shown on
// one screen with no paging, the highlight on a random one of them. Fewer pictures than `count` shows
// what there is.
export function sceneGallery<P extends PicSize>(all: readonly P[], random: () => number, count = PAGE_SIZE): Gallery<P> {
  const pool = [...all];
  const picks: P[] = [];
  for (let i = 0; i < Math.min(count, PAGE_SIZE, pool.length); i++) {
    const j = i + Math.min(pool.length - i - 1, Math.floor(random() * (pool.length - i)));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picks.push(pool[i]);
  }
  const cursor = picks.length ? Math.min(picks.length - 1, Math.floor(random() * picks.length)) : 0;
  return { pics: picks, page: 0, cursor, view: "grid" };
}

// Left and Right move one picture, Up and Down one row of three. Moving past the end of a page turns the
// page; at the ends of the reel nothing happens (no wrap). The highlight never lands on an empty cell:
// Down from a row above a short last row goes to the last picture. Scene mode has at most six pictures,
// so the same rule never leaves its one page.
export function move<P extends PicSize>(g: Gallery<P>, dir: Dir): Gallery<P> {
  const n = g.pics.length;
  const i = indexAt(g);
  if (n === 0 || i === null) return g;
  let to = i;
  if (dir === "left") to = i - 1;
  else if (dir === "right") to = i + 1;
  else if (dir === "up") to = i - GRID_COLS;
  else to = i + GRID_COLS;
  if (to < 0) return g;
  if (to > n - 1) {
    if (dir === "down" && Math.floor(i / GRID_COLS) < Math.floor((n - 1) / GRID_COLS)) to = n - 1;
    else return g;
  }
  return atFlat(g, to);
}

// Turn to the previous or next page, keeping the highlight on the same cell number (or on the last picture
// of a short page). At the ends nothing happens.
export function turnPage<P extends PicSize>(g: Gallery<P>, delta: 1 | -1): Gallery<P> {
  const page = g.page + delta;
  if (page < 0 || page > pageCount(g.pics.length) - 1) return g;
  return { ...g, page, cursor: Math.min(g.cursor, cellsOnPage(g.pics.length, page) - 1) };
}

export function open<P extends PicSize>(g: Gallery<P>): Gallery<P> {
  return indexAt(g) === null ? g : { ...g, view: "closeup" };
}

export const close = <P extends PicSize>(g: Gallery<P>): Gallery<P> => ({ ...g, view: "grid" });

// Manage mode's close-up: the previous or next picture in display order, staying in the close-up.
export function others<P extends PicSize>(g: Gallery<P>, delta: 1 | -1): Gallery<P> {
  const i = indexAt(g);
  if (i === null) return g;
  const to = i + delta;
  return to < 0 || to > g.pics.length - 1 ? g : atFlat(g, to);
}

// The list changed under the gallery (a picture was deleted): back to the grid, the highlight on the same
// cell number of the same page, or on the last picture when that cell is now empty or the page is gone.
export function withPics<P extends PicSize>(g: Gallery<P>, pics: readonly P[]): Gallery<P> {
  if (pics.length === 0) return { pics, page: 0, cursor: 0, view: "grid" };
  const flat = g.page * PAGE_SIZE + g.cursor;
  return atFlat({ pics, page: 0, cursor: 0, view: "grid" }, Math.min(flat, pics.length - 1));
}

// A tap on cell `index` (0..5 of the page): an empty cell does nothing; another cell takes the highlight;
// the highlighted one opens.
export function tapCell<P extends PicSize>(g: Gallery<P>, index: number): Gallery<P> {
  if (index < 0 || index >= cellsOnPage(g.pics.length, g.page)) return g;
  return index === g.cursor ? open(g) : { ...g, cursor: index };
}

export const hasPrevPage = (g: Gallery): boolean => g.page > 0;
export const hasNextPage = (g: Gallery): boolean => g.page < pageCount(g.pics.length) - 1;
// "PAGE 2 OF 10", for manage mode's status line only (scene mode shows no number).
export const pageLabel = (g: Gallery): string => `PAGE ${g.page + 1} OF ${pageCount(g.pics.length)}`;

// ---------------------------------------------------------------- scales

// The largest whole-number scale at which the whole picture fits `box` (at least 1).
export function closeupScale(pic: PicSize, box: { w: number; h: number }): number {
  return Math.max(1, Math.min(Math.floor(box.w / pic.w), Math.floor(box.h / pic.h)));
}

// Thumbnail fill rule: below this share of the cell the picture is enlarged and cut; it must keep this share in view.
export const THUMB_FILL_BELOW = 0.7;
export const THUMB_MIN_SEEN = 0.5;

export interface ThumbWindow {
  scale: number;
  // True: a portrait picture too tall for its cell at a useful scale is drawn at 2x and cut to the cell,
  // which keeps its middle square (the draw code clips to the cell). False: the whole picture.
  slice: boolean;
}

// A grid thumbnail: the whole picture at the largest whole scale that fits the cell (two exceptions, below), except a portrait
// that would only fit at 1x: where its middle square at 2x fits the cell (the wide view's 96 x 72) that is
// shown instead, so it is not tiny. The close-up always shows the whole picture.
export function thumbWindow(pic: PicSize, cell: { w: number; h: number }): ThumbWindow {
  const scale = closeupScale(pic, cell);
  const fits = pic.w * scale <= cell.w && pic.h * scale <= cell.h;
  if (pic.h > pic.w && scale < 2 && 2 * pic.w <= cell.w && 2 * pic.w <= cell.h) return { scale: 2, slice: true };
  // Too big even at 1x (a Crisp portrait, 48 x 64, in the narrow 64 x 48 cell): its middle, cut to the cell.
  // A picture that at its best whole scale leaves most of the cell empty (a Crisp 64 x 48 or 48 x 64 in the wide
  // 96 x 72 cell: 44 percent) is drawn at the next whole scale and cut to the cell's middle, as the portrait rule
  // above does, when that covers the cell and keeps at least half the picture in view. Pixels stay whole blocks
  // (no half-pixel seam); the close-up always shows the whole picture.
  if (fits && (pic.w * scale * pic.h * scale) / (cell.w * cell.h) < THUMB_FILL_BELOW) {
    const next = scale + 1;
    const covers = pic.w * next >= cell.w && pic.h * next >= cell.h;
    const seen = (cell.w * cell.h) / (pic.w * next * pic.h * next);
    if (covers && seen >= THUMB_MIN_SEEN) return { scale: next, slice: true };
  }
  return { scale: fits ? scale : 1, slice: !fits };
}

// ---------------------------------------------------------------- layout

// The view the picture is drawn in: the phone's narrow 224 x 208, or the desktop's 320 x 192.
export const screenKind = (screen: { width: number }): ScreenKind => (screen.width < 280 ? "narrow" : "wide");

export interface Screen {
  width: number;
  height: number;
}

export interface GridLayout {
  kind: ScreenKind;
  // The six cells in reading order; the drawn list is the tap list.
  cells: Rect[];
  // Everything below the grid is free from here (manage mode lays its status, buttons and hint under it).
  bottom: number;
  // Where the title sits in manage mode (the page's own "PHOTOS" at y 5).
  titleY: number;
  // Scene mode only: the phone and its parts.
  phone?: { panel: Rect; screen: Rect; strip: Rect; line: Array<{ text: string; x: number; y: number }>; buttons: Array<{ id: "continue" | "leave"; label: string; rect: Rect }> };
}

export const PHONE_BEZEL = 4;
export const STRIP_H = 9;
const LINE_H = 9;

// A grid cell: 96 x 72 on the wide view (a 48 x 36 picture at 2x fills one), 64 x 48 on the narrow one.
export const cellSize = (kind: ScreenKind): { w: number; h: number } => (kind === "wide" ? { w: 96, h: 72 } : { w: 64, h: 48 });

export interface GridOptions {
  mode: GalleryMode;
  screen: Screen;
  // Scene mode: the one fixed line under the grid.
  line?: string;
}

// Manage mode: the full view, cells 96 x 72 gap 4 (wide) or 64 x 48 gap 4 (narrow), centred, from y 16 or
// 17. Scene mode: the same cells inside a phone panel (306 x 177 sideways on the wide view, 208 x 196
// upright on the narrow one) with a 9 px status strip above and the fixed line below.
export function gridLayout({ mode, screen, line = "" }: GridOptions): GridLayout {
  const kind = screenKind(screen);
  const wide = kind === "wide";
  const { w, h } = cellSize(kind);
  const place = (x0: number, y0: number, gap: number): Rect[] =>
    Array.from({ length: PAGE_SIZE }, (_, i) => ({ x: x0 + (i % GRID_COLS) * (w + gap), y: y0 + Math.floor(i / GRID_COLS) * (h + gap), w, h }));
  if (mode === "manage") {
    const gap = 4;
    const x0 = Math.floor((screen.width - (GRID_COLS * w + (GRID_COLS - 1) * gap)) / 2);
    const y0 = wide ? 16 : 17;
    const cells = place(x0, y0, gap);
    return { kind, cells, bottom: y0 + GRID_ROWS * h + (GRID_ROWS - 1) * gap, titleY: 5 };
  }
  const gap = wide ? 3 : 4;
  const gridW = GRID_COLS * w + (GRID_COLS - 1) * gap;
  const gridH = GRID_ROWS * h + (GRID_ROWS - 1) * gap;
  const panelW = wide ? 306 : 208;
  const panelH = wide ? 177 : 196;
  const panel: Rect = { x: Math.floor((screen.width - panelW) / 2), y: Math.floor((screen.height - panelH) / 2), w: panelW, h: panelH };
  const inner: Rect = { x: panel.x + PHONE_BEZEL, y: panel.y + PHONE_BEZEL, w: panel.w - 2 * PHONE_BEZEL, h: panel.h - 2 * PHONE_BEZEL };
  const strip: Rect = { x: inner.x, y: inner.y, w: inner.w, h: STRIP_H };
  const cells = place(inner.x + Math.floor((inner.w - gridW) / 2), strip.y + STRIP_H + 2, gap);
  const gridBottom = strip.y + STRIP_H + 2 + gridH;
  const lines = wrapText(line, inner.w - 8);
  const textLines = wide ? lines.slice(0, 1) : lines;
  const lineTop = wide ? gridBottom + 2 : gridBottom + 4;
  const linePos = textLines.map((text, i) => ({ text, x: inner.x + Math.floor((inner.w - textWidth(text)) / 2), y: lineTop + i * LINE_H }));
  const buttons: NonNullable<GridLayout["phone"]>["buttons"] = [];
  if (!wide) {
    const bw = Math.floor((inner.w - 4) / 2);
    const by = inner.y + inner.h - 16;
    buttons.push({ id: "continue", label: "CONTINUE", rect: { x: inner.x, y: by, w: bw, h: 16 } });
    buttons.push({ id: "leave", label: "LEAVE", rect: { x: inner.x + bw + 4, y: by, w: bw, h: 16 } });
  }
  return { kind, cells, bottom: gridBottom, titleY: strip.y + 1, phone: { panel, screen: inner, strip, line: linePos, buttons } };
}

export interface CloseupLayout {
  kind: ScreenKind;
  // Where the picture may go, and where it is, at a whole scale.
  box: Rect;
  pic: Rect;
  scale: number;
  // Scene mode: the phone's bezel round the whole view, and the foot band with the caption lines.
  bezel: Rect | null;
  band: Rect | null;
  caption: Array<{ text: string; x: number; y: number }>;
  // Where the foot hint goes (manage mode: along the foot of the view; scene mode: right end of the band).
  hint: { x: number; y: number; align: "left" | "right" | "center"; stack: boolean };
}

export const CLOSEUP_BAND = 12;
// Wide enough for "< >: OTHERS" (11 characters) in the side margin.
export const HINT_STACK_MARGIN = 72;

export interface CloseupOptions {
  mode: GalleryMode;
  screen: Screen;
  pic: PicSize;
  // Scene mode: the caption under the picture.
  caption?: string;
}

// Manage mode: no chrome and no caption, the box is the whole view and the hint runs along the foot. Scene
// mode: a bezel round the view and a foot band of 12 px (more when the caption wraps) for the caption and
// the key hint, the box is what is left above it. The picture is the largest whole scale that fits the box,
// centred (manage mode lifts it a little when it would run into the hint line).
export function closeupLayout({ mode, screen, pic, caption = "" }: CloseupOptions): CloseupLayout {
  const kind = screenKind(screen);
  const view: Rect = { x: 0, y: 0, w: screen.width, h: screen.height };
  if (mode === "manage") {
    const scale = closeupScale(pic, view);
    const w = pic.w * scale;
    const h = pic.h * scale;
    const y = Math.max(0, Math.min(Math.floor((view.h - h) / 2), view.h - 10 - h));
    const x = Math.floor((view.w - w) / 2);
    // A picture that fills the view's height leaves no foot to put the hint line in. When the side margin
    // is wide enough the hint is stacked there, bottom left (its parts one above the other); otherwise
    // (a 256 px wide picture) it is laid over the foot of the picture, on its own shadow.
    const collides = y + h > view.h - 10;
    const stack = collides && x >= HINT_STACK_MARGIN;
    return {
      kind,
      box: view,
      pic: { x, y, w, h },
      scale,
      bezel: null,
      band: null,
      caption: [],
      hint: stack ? { x: 4, y: view.h - 9, align: "left", stack: true } : { x: view.w / 2, y: view.h - 9, align: "center", stack: false },
    };
  }
  const inner = PHONE_BEZEL;
  const textW = screen.width - 2 * inner - 2 - (kind === "wide" ? 50 : 54);
  const lines = caption ? wrapText(caption, textW) : [];
  const bandH = lines.length <= 1 ? CLOSEUP_BAND : LINE_H * lines.length + 5;
  const box: Rect = { x: 0, y: 0, w: screen.width, h: screen.height - bandH };
  const scale = closeupScale(pic, box);
  const w = pic.w * scale;
  const h = pic.h * scale;
  const band: Rect = { x: 0, y: screen.height - bandH, w: screen.width, h: bandH };
  return {
    kind,
    box,
    pic: { x: Math.floor((box.w - w) / 2), y: Math.floor((box.h - h) / 2), w, h },
    scale,
    bezel: { x: 0, y: 0, w: screen.width, h: screen.height },
    band,
    caption: lines.map((text, i) => ({ text, x: inner + 2, y: band.y + 1 + i * LINE_H })),
    hint: { x: screen.width - inner - 2, y: band.y + 1, align: "right", stack: false },
  };
}
