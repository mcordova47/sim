import { COLOR } from "../../render/colors";
import { drawButton } from "../../render/button";
import { drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { Rect } from "../../input/tap";
import { VIEW } from "../config";
import { wrapText } from "../dialog";
import type { ReelPic } from "../reel/reel-store";
import { REEL_PALETTE } from "../reel/palette";
import { PAUSE_TOUCH } from "./draw";

// The PHOTOS page (issue 113c, docs/photo-reel-design.md section 5). The buttons, the thumbnails and the
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

export type PhotosButtonId = "add" | "remove" | "back";

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
function buttonList(view: PhotosView): Array<{ id: PhotosButtonId; label: string; key: string }> {
  const out: Array<{ id: PhotosButtonId; label: string; key: string }> = [];
  const busy = !!view.progress;
  if (!busy && view.persistent) out.push({ id: "add", label: "ADD PHOTOS", key: "A" });
  if (!busy && view.persistent && view.pics && view.pics.length > 0) out.push({ id: "remove", label: view.confirmRemove ? PHOTOS_REMOVE_SURE : PHOTOS_REMOVE, key: "R" });
  out.push({ id: "back", label: "BACK", key: "ESC" });
  return out;
}

// The buttons come right under the intro, so they never move; the status, the message and then the
// thumbnails follow, taking what room they need (the thumbnails get the rest).
export function photosLayout(view: PhotosView): PhotosLayout {
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
  return { intro, status, message, buttons, thumbs };
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
  drawText(ctx, "PHOTOS", MARGIN, 5, { color: COLOR.butter });
  const layout = photosLayout(view);
  layout.intro.forEach((line, i) => drawText(ctx, line, MARGIN, TOP + LINE * i, { color: COLOR.paper, shadow: null }));
  for (const l of layout.status) drawText(ctx, l.text, MARGIN, l.y, { color: COLOR.butter, shadow: null });
  for (const l of layout.message) drawText(ctx, l.text, MARGIN, l.y, { color: COLOR.mist, shadow: null });
  for (const b of layout.buttons) {
    if (view.touch) drawButton(ctx, b.rect, b.label, { color: b.id === "remove" && view.confirmRemove ? COLOR.tangerine : COLOR.paper });
    else drawText(ctx, hintLine([{ key: b.key, text: b.label }]), MARGIN, b.rect.y + 1, { color: b.id === "remove" && view.confirmRemove ? COLOR.tangerine : COLOR.paper, shadow: null });
  }
  for (const { index, rect } of layout.thumbs) {
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawPic(ctx, view.pics![index], rect);
  }
  const hint = view.touch ? hintLine([{ key: "ESC", text: "BACK" }]) : null;
  if (hint) drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, { color: COLOR.mist, align: "center" });
}
