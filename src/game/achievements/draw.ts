import { COLOR } from "../../render/colors";
import { drawButton } from "../../render/button";
import { drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import type { Rect } from "../../input/tap";
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
  get footerTop(): number {
    return VIEW.height - 28;
  },
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
  // The touch layer is showing (issue 093): the settings are big buttons, the list pages, and the
  // key names in the hint become the touch layer's buttons.
  touch?: boolean;
  // Waiting for the answer to "reset all progress?" (touch draws YES and NO buttons for it).
  confirmReset?: boolean;
}

// The touch layout of the pause screen (issue 093), in game pixels for the 320 x 192 view. The
// settings are buttons in two columns, then the achievements in pages of two columns of rows.
// Fingers need room: these are as tall as the screen allows. Where a finger can land is the same
// list that is drawn (`pauseButtons`, `listRows`, `pageButton`), so a tap and the picture agree.
export const PAUSE_TOUCH = {
  margin: 6,
  buttonH: 16,
  buttonGap: 2,
  buttonsTop: 17,
  // The achievements: a header line with the page button, then rows. Four rows of buttons fit above
  // them (the ad blocker, the voice, TRANSFER SAVE, SYNC, THINGS, PHOTOS, RESET and CLOSE: eight, which
  // is the four rows there is room for).
  pageTop: 89,
  rowsTop: 102,
  rowHeight: 10,
};

export type PauseButtonId = "adBlocker" | "voice" | "transfer" | "sync" | "things" | "photos" | "reset" | "close" | "yes" | "no";

export interface PauseButton {
  id: PauseButtonId;
  label: string;
  rect: Rect;
}

// The buttons on the touch layout: the settings (the voice one only with the sound feature),
// TRANSFER SAVE, RESET and CLOSE; while the reset question is up, YES and NO instead.
export function pauseButtons(view: ListView): PauseButton[] {
  const T = PAUSE_TOUCH;
  const w = Math.floor((VIEW.width - 2 * T.margin - T.buttonGap) / 2);
  const at = (i: number, top: number): Rect => ({
    x: T.margin + (i % 2) * (w + T.buttonGap),
    y: top + Math.floor(i / 2) * (T.buttonH + T.buttonGap),
    w,
    h: T.buttonH,
  });
  if (view.confirmReset) {
    // The question sits above them (see `drawList`).
    const top = T.buttonsTop + 14;
    return [
      { id: "yes", label: "YES, RESET", rect: at(0, top) },
      { id: "no", label: "NO", rect: at(1, top) },
    ];
  }
  const list: Array<{ id: PauseButtonId; label: string }> = [];
  if (typeof view.adBlocker === "boolean") list.push({ id: "adBlocker", label: `AD BLOCKER: ${view.adBlocker ? "ON" : "OFF"}` });
  if (view.voice) list.push({ id: "voice", label: view.voice });
  list.push({ id: "transfer", label: "TRANSFER SAVE" }, { id: "sync", label: "SYNC" }, { id: "things", label: "THINGS" }, { id: "photos", label: "PHOTOS" }, { id: "reset", label: "RESET PROGRESS" }, { id: "close", label: "CLOSE" });
  return list.map((b, i) => ({ ...b, rect: at(i, T.buttonsTop) }));
}

// On the touch layout, how many rows fit in a column and so how many achievements a page holds.
export function touchPageSize(): number {
  const rows = Math.floor((LIST_LAYOUT.footerTop - 2 - PAUSE_TOUCH.rowsTop) / PAUSE_TOUCH.rowHeight);
  return rows * LIST_LAYOUT.columns;
}

// Which achievements show and where: a rectangle per row. Desktop shows all of them in two
// columns; touch shows the page the cursor is on.
export function listRows(view: ListView): Array<{ index: number; rect: Rect }> {
  const n = view.achievements.length;
  const columnWidth = Math.floor((VIEW.width - 12) / LIST_LAYOUT.columns);
  const touch = !!view.touch;
  const perPage = touch ? touchPageSize() : n;
  const start = touch ? Math.floor(view.cursor / perPage) * perPage : 0;
  const end = Math.min(n, start + perPage);
  const perColumn = touch ? perPage / LIST_LAYOUT.columns : Math.ceil(n / LIST_LAYOUT.columns);
  const top = touch ? PAUSE_TOUCH.rowsTop : LIST_LAYOUT.top;
  const rows: Array<{ index: number; rect: Rect }> = [];
  for (let i = start; i < end; i++) {
    const k = i - start;
    const col = Math.floor(k / perColumn);
    rows.push({
      index: i,
      rect: { x: 6 + col * columnWidth - 3, y: top + (k % perColumn) * LIST_LAYOUT.rowHeight - 1, w: columnWidth - 2, h: LIST_LAYOUT.rowHeight - 1 },
    });
  }
  return rows;
}

// The touch layout's page control ("PAGE 1/2"), or null when everything fits one page.
export function pageButton(view: ListView): { label: string; rect: Rect } | null {
  if (!view.touch) return null;
  const size = touchPageSize();
  const pages = Math.ceil(view.achievements.length / size);
  if (pages < 2) return null;
  const page = Math.floor(view.cursor / size) + 1;
  const label = `PAGE ${page}/${pages}`;
  const w = textWidth(label) + 12;
  return { label, rect: { x: VIEW.width - PAUSE_TOUCH.margin - w, y: PAUSE_TOUCH.pageTop, w, h: 11 } };
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

// The touch layer's line at the foot: the settings are buttons, so only the pad and the way out.
export function touchListHint(): string {
  return hintLine([
    { key: "ARROWS", text: "LOOK" },
    { key: "L", text: "CLOSE" },
  ]);
}

export const TRANSFER_HINT = "T: TRANSFER SAVE";
export const SYNC_HINT = "P: SYNC";
export const THINGS_HINT = "I: THINGS";
export const PHOTOS_HINT = "O: PHOTOS";

export const LEGEND_TEXT = "GOOD HOUR: 1.5X POINTS";

// The list of achievements: a full-screen panel, locked ones as "???".
export function drawList(ctx: CanvasRenderingContext2D, view: ListView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const done = view.achievements.filter((a) => view.unlocked(a.id)).length;
  drawText(ctx, "PAUSE", 6, 5, { color: COLOR.butter });
  drawText(ctx, `ACHIEVEMENTS ${done}/${view.achievements.length}`, 6 + textWidth("PAUSE") + 12, 5, { color: COLOR.mist, shadow: null });

  // Legend for the clock icon the prompt and the award popup use.
  if (view.sprites?.has(GOOD_HOUR_ICON)) {
    const x = VIEW.width - 6 - textWidth(LEGEND_TEXT);
    view.sprites.draw(ctx, GOOD_HOUR_ICON, x - GOOD_HOUR_ICON_SIZE - 3, 4);
    drawText(ctx, LEGEND_TEXT, x, 5, { color: COLOR.mist, shadow: null });
  }

  if (view.touch) {
    if (view.confirmReset) drawText(ctx, "RESET ALL PROGRESS?", VIEW.width / 2, PAUSE_TOUCH.buttonsTop + 3, { color: COLOR.tangerine, align: "center" });
    for (const b of pauseButtons(view)) drawButton(ctx, b.rect, b.label, { color: b.id === "yes" ? COLOR.tangerine : COLOR.paper });
    const page = pageButton(view);
    if (page) drawButton(ctx, page.rect, page.label, { color: COLOR.butter });
  }

  for (const { index: i, rect } of listRows(view)) {
    const a = view.achievements[i];
    const has = view.unlocked(a.id);
    if (i === view.cursor) {
      ctx.fillStyle = COLOR.slate;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    drawText(ctx, has ? a.name : "???", rect.x + 3, rect.y + 1, { color: has ? COLOR.paper : COLOR.mist, shadow: null });
  }

  // The desktop's way into the transfer page, in the free line above the footer when the list leaves it free.
  const rowsBottom = LIST_LAYOUT.top + Math.ceil(view.achievements.length / LIST_LAYOUT.columns) * LIST_LAYOUT.rowHeight;
  if (!view.touch && rowsBottom <= LIST_LAYOUT.footerTop - 9) {
    // Four hints spread across the line, the first at the left edge and the last at the right.
    const hints = [SYNC_HINT, THINGS_HINT, PHOTOS_HINT, TRANSFER_HINT];
    const gap = (VIEW.width - 12 - hints.reduce((sum, h) => sum + textWidth(h), 0)) / (hints.length - 1);
    let x = 6;
    for (const h of hints) {
      drawText(ctx, h, Math.round(x), LIST_LAYOUT.footerTop - 9, { color: COLOR.mist, shadow: null });
      x += textWidth(h) + gap;
    }
  }

  const picked = view.achievements[view.cursor];
  if (picked) {
    const has = view.unlocked(picked.id);
    drawText(ctx, has ? picked.name : "???", 6, LIST_LAYOUT.footerTop, { color: COLOR.butter });
    if (view.voice && !view.touch) drawText(ctx, view.voice, VIEW.width - 6, LIST_LAYOUT.footerTop, { color: COLOR.mist, shadow: null, align: "right" });
    drawText(ctx, has ? picked.description : "???", 6, LIST_LAYOUT.footerTop + 10, { color: COLOR.paper });
  }
  const plain = view.voice ? LIST_HINT_VOICE : LIST_HINT;
  const desktop = typeof view.adBlocker === "boolean" ? listHint(!!view.voice, view.adBlocker) : plain;
  const hint = view.message ?? (view.touch ? touchListHint() : desktop);
  drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, {
    color: view.message ? COLOR.tangerine : COLOR.mist,
    align: "center",
  });
}

// -- The transfer page (issue 102, docs/sync.md section 6) -------------------------------------------

export type TransferButtonId = "copy" | "paste" | "save" | "open" | "restore" | "yes" | "no" | "back";

export interface TransferView {
  touch: boolean;
  // A line in the hint's place: what just happened, or the restore question.
  message: string | null;
  // Waiting for the answer to "restore?" (touch draws YES and NO buttons for it).
  confirmRestore: boolean;
}

export const TRANSFER_LINES = [
  "MOVE YOUR SAVE TO ANOTHER BROWSER OR DEVICE.",
  "COPY A CODE OR SAVE A FILE HERE, THEN PASTE",
  "OR OPEN IT THERE. IMPORTING MERGES: IT NEVER",
  "TAKES ANYTHING AWAY. A BROWSER CAN CLEAR A",
  "SAVE, SO KEEP A FILE.",
];

export const TRANSFER_RESTORE_QUESTION = "GO BACK TO BEFORE THE LAST IMPORT?";

const TRANSFER_TOP = 17 + 9 * TRANSFER_LINES.length + 5;

// What can be pressed on the transfer page, with the desktop key of each. On touch these are buttons
// (the question has YES and NO in their place); on the desktop they are the lines of a key list.
export function transferButtons(view: TransferView): Array<{ id: TransferButtonId; label: string; key: string; rect: Rect }> {
  const T = PAUSE_TOUCH;
  const w = Math.floor((VIEW.width - 2 * T.margin - T.buttonGap) / 2);
  const at = (i: number): Rect => ({
    x: T.margin + (i % 2) * (w + T.buttonGap),
    y: TRANSFER_TOP + Math.floor(i / 2) * (T.buttonH + T.buttonGap),
    w,
    h: T.buttonH,
  });
  if (view.confirmRestore) {
    return [
      { id: "yes", label: "YES, GO BACK", key: "Y", rect: at(0) },
      { id: "no", label: "NO", key: "N", rect: at(1) },
    ];
  }
  const list: Array<{ id: TransferButtonId; label: string; key: string }> = [
    { id: "copy", label: "COPY CODE", key: "C" },
    { id: "paste", label: "PASTE CODE", key: "V" },
    { id: "save", label: "SAVE FILE", key: "F" },
    { id: "open", label: "OPEN FILE", key: "O" },
    { id: "restore", label: "RESTORE BEFORE IMPORT", key: "SHIFT+R" },
    { id: "back", label: "BACK", key: "ESC" },
  ];
  return list.map((b, i) => ({ ...b, rect: at(i) }));
}

export function drawTransfer(ctx: CanvasRenderingContext2D, view: TransferView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawText(ctx, "TRANSFER SAVE", 6, 5, { color: COLOR.butter });
  TRANSFER_LINES.forEach((line, i) => drawText(ctx, line, 6, 17 + 9 * i, { color: COLOR.paper, shadow: null }));
  if (view.touch) {
    for (const b of transferButtons(view)) drawButton(ctx, b.rect, b.label, { color: b.id === "yes" ? COLOR.tangerine : COLOR.paper });
  } else {
    transferButtons({ ...view, confirmRestore: false }).forEach((b, i) =>
      drawText(ctx, hintLine([{ key: b.key, text: b.label }]), 6, TRANSFER_TOP + 10 * i, { color: COLOR.paper, shadow: null }),
    );
  }
  const hint = view.message ?? (view.confirmRestore ? (view.touch ? TRANSFER_RESTORE_QUESTION : `${TRANSFER_RESTORE_QUESTION} Y: YES`) : view.touch ? hintLine([{ key: "ESC", text: "BACK" }]) : null);
  if (hint) drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, { color: view.message || view.confirmRestore ? COLOR.tangerine : COLOR.mist, align: "center" });
}

// -- The sync page (issue 103, docs/sync.md section 5) ------------------------------------------------

export type SyncButtonId = "on" | "copy" | "now" | "auto" | "paste" | "stop" | "yes" | "no" | "back";

export interface SyncView {
  touch: boolean;
  // A line in the hint's place: what just happened, or the question.
  message: string | null;
  // The status line (SYNC: ON ...) and, when a key is kept, its start and end.
  status: string;
  keyLine: string | null;
  isOn: boolean;
  // Automatic sync is switched on (the button says which).
  auto: boolean;
  // Waiting for a yes or no: stopping, or pairing with the link's save.
  confirm: "stop" | "pair" | null;
  busy: boolean;
}

export const SYNC_LINES = [
  "KEEP YOUR SAVE IN STEP ON TWO DEVICES.",
  "TURN ON SYNC, THEN OPEN THE LINK ON THE OTHER",
  "DEVICE, OR PASTE THE KEY THERE. A SYNC MERGES:",
  "IT NEVER TAKES ANYTHING AWAY. ANYONE WITH THE",
  "LINK CAN READ THIS SAVE. KEEP A SAVE FILE TOO.",
];

export const SYNC_QUESTIONS = { stop: "STOP SYNCING AND DELETE THE SAVED COPY?", pair: "SYNC WITH THE SAVE IN THIS LINK?" };

const SYNC_TOP = 17 + 9 * (SYNC_LINES.length + 2) + 5;

export function syncButtons(view: SyncView): Array<{ id: SyncButtonId; label: string; key: string; rect: Rect }> {
  const T = PAUSE_TOUCH;
  const w = Math.floor((VIEW.width - 2 * T.margin - T.buttonGap) / 2);
  const at = (i: number): Rect => ({
    x: T.margin + (i % 2) * (w + T.buttonGap),
    y: SYNC_TOP + Math.floor(i / 2) * (T.buttonH + T.buttonGap),
    w,
    h: T.buttonH,
  });
  if (view.confirm) {
    return [
      { id: "yes", label: "YES", key: "Y", rect: at(0) },
      { id: "no", label: "NO", key: "N", rect: at(1) },
    ];
  }
  const list: Array<{ id: SyncButtonId; label: string; key: string }> = view.isOn
    ? [
        { id: "copy", label: "COPY LINK", key: "C" },
        { id: "now", label: "SYNC NOW", key: "S" },
        { id: "auto", label: view.auto ? "AUTO SYNC: ON" : "AUTO SYNC: OFF", key: "A" },
        { id: "paste", label: "PASTE KEY OR LINK", key: "V" },
        { id: "stop", label: "STOP SYNCING", key: "X" },
        { id: "back", label: "BACK", key: "ESC" },
      ]
    : [
        { id: "on", label: "TURN ON SYNC", key: "N" },
        { id: "paste", label: "PASTE KEY OR LINK", key: "V" },
        { id: "back", label: "BACK", key: "ESC" },
      ];
  return list.map((b, i) => ({ ...b, rect: at(i) }));
}

export function drawSync(ctx: CanvasRenderingContext2D, view: SyncView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawText(ctx, "SYNC", 6, 5, { color: COLOR.butter });
  SYNC_LINES.forEach((line, i) => drawText(ctx, line, 6, 17 + 9 * i, { color: COLOR.paper, shadow: null }));
  drawText(ctx, view.busy ? "SYNC: WORKING..." : view.status, 6, 17 + 9 * SYNC_LINES.length, { color: COLOR.butter, shadow: null });
  if (view.keyLine) drawText(ctx, view.keyLine, 6, 17 + 9 * (SYNC_LINES.length + 1), { color: COLOR.mist, shadow: null });
  if (view.touch) {
    for (const b of syncButtons(view)) drawButton(ctx, b.rect, b.label, { color: b.id === "yes" ? COLOR.tangerine : COLOR.paper });
  } else {
    syncButtons({ ...view, confirm: null }).forEach((b, i) =>
      drawText(ctx, hintLine([{ key: b.key, text: b.label }]), 6, SYNC_TOP + 10 * i, { color: COLOR.paper, shadow: null }),
    );
  }
  const question = view.confirm ? SYNC_QUESTIONS[view.confirm] : null;
  const hint = view.message ?? (question ? (view.touch ? question : `${question} Y: YES`) : view.touch ? hintLine([{ key: "ESC", text: "BACK" }]) : null);
  if (hint) drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, { color: view.message || question ? COLOR.tangerine : COLOR.mist, align: "center" });
}
