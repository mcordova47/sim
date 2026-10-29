import type { Rect } from "../input/tap";
import { keyRange, noteName, type ChannelId } from "../game/music/demos";
import { drawButton } from "./button";
import { COLOR, withAlpha } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";
import { keyLabel } from "./hints";
import type { EditorView } from "./track-editor";

// The track editor's touch look (issue 106a, docs/track-editor-phones-design.md section 3): the same
// activity and the same state as the desktop piano roll, drawn bigger so a finger can hit it. One layout
// function (`touchEditorLayout`) returns every rectangle; the drawing here and the activity's tap targets
// (issue 106b) both read it, so what is drawn is what is tappable.
//
// It is drawn in the live view, never as a 320 x 192 picture scaled down: 224 x 208 on the phone's narrow
// view (portrait), 320 x 192 on the wide view (landscape).

// A page is 8 steps; six pitch rows of 20 game pixels (Marc, 2026-10-28). The beat channel has three
// drum rows, so each is taller.
export const TOUCH_EDITOR = {
  pageSteps: 8,
  pitchRows: 6,
  drumRows: 3,
  rowH: 20,
  // The top strip: the message or reminder line, left clear for the game's own chips.
  hintH: 12,
  headerH: 17,
  tabH: 17,
  pageH: 16,
  buttonH: 18,
  gap: 2,
  margin: 2,
};

export type EditorShape = "portrait" | "landscape";

export interface TouchLayout {
  shape: EditorShape;
  rows: number;
  pageSteps: number;
  // The line of text at the very top (a message, or the reminder).
  hint: Rect;
  name: Rect;
  tempoDown: Rect;
  tempoValue: Rect;
  tempoUp: Rect;
  // Melody, bass, beat.
  tabs: Rect[];
  // The pitch labels, one per row, top to bottom, and the grid they sit beside (the cells tile it).
  gutter: Rect[];
  grid: Rect;
  cellW: number;
  rowH: number;
  // One button per page of the track (2 for 16 steps, 4 for 32).
  pages: Rect[];
  // Scroll the six pitches shown up or down by a window (pitched channels only; issue 106b, so every
  // pitch is reachable by taps).
  pitchUp: Rect;
  pitchDown: Rect;
  play: Rect;
  save: Rect;
  length: Rect;
  more: Rect;
  // Landscape only: the side panel also holds these two (portrait has Undo in the More menu and pages
  // by the strip).
  undo: Rect | null;
  nextPage: Rect | null;
}

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

// Every rectangle for a view of this size. `steps` is the track's length (the number of page buttons)
// and `rows` the number of grid rows (6 pitches, or 3 drums in the beat channel).
export function touchEditorLayout(
  screen: { width: number; height: number },
  options: { steps?: number; rows?: number } = {},
): TouchLayout {
  const T = TOUCH_EDITOR;
  const steps = options.steps ?? 16;
  const rows = options.rows ?? T.pitchRows;
  // The phone's narrow view (224 x 208) is wider than it is tall, so the shapes are told apart by width.
  const shape: EditorShape = screen.width >= 300 ? "landscape" : "portrait";
  const landscape = shape === "landscape";
  const { margin: m, gap } = T;
  const gridH = T.pitchRows * T.rowH;
  const rowH = gridH / rows;

  const headerY = T.hintH;
  const tabsY = headerY + T.headerH + gap;
  const gridY = tabsY + T.tabH + gap + 1;
  // Portrait: the gutter is 24 wide and 8 cells of 25 fill the rest. Landscape: a 22 gutter, 24 cells,
  // and the side panel takes the right.
  const gutterW = landscape ? 22 : 24;
  const cellW = landscape ? 24 : 25;
  const gridX = gutterW;
  const gridW = T.pageSteps * cellW;

  // Header: the name, then the tempo stepper (minus, value, plus).
  const stepW = landscape ? 40 : 26;
  const valueW = landscape ? 52 : 24;
  const stepperW = 2 * stepW + valueW;
  const tempoX = screen.width - m - stepperW;
  const nameW = tempoX - gap - m;
  const name = rect(m, headerY, nameW, T.headerH);
  const tempoDown = rect(tempoX, headerY, stepW, T.headerH);
  const tempoValue = rect(tempoX + stepW, headerY, valueW, T.headerH);
  const tempoUp = rect(tempoX + stepW + valueW, headerY, stepW, T.headerH);

  // Tabs share the width above the grid (the whole width in portrait).
  const tabsW = landscape ? gridX + gridW - m : screen.width - 2 * m;
  const tabW = Math.floor((tabsW - 2 * gap) / 3);
  const tabs = [0, 1, 2].map((i) => rect(m + i * (tabW + gap), tabsY, tabW, T.tabH));

  const gutter = Array.from({ length: rows }, (_, i) => rect(0, gridY + i * rowH, gutterW, rowH));
  const grid = rect(gridX, gridY, gridW, gridH);

  // Pages: a strip under the grid.
  const pageCount = Math.max(1, Math.ceil(steps / T.pageSteps));
  const pagesY = gridY + gridH + gap;
  const pagesX = landscape ? gridX : m;
  // The pitch scroll buttons sit at the right end of the strip.
  const scrollW = 22;
  const stripW = landscape ? gridW : screen.width - 2 * m;
  const pagesW = stripW - 2 * (scrollW + gap);
  const pitchUp = rect(pagesX + stripW - 2 * scrollW - gap, pagesY, scrollW, T.pageH);
  const pitchDown = rect(pagesX + stripW - scrollW, pagesY, scrollW, T.pageH);
  const pageW = Math.floor((pagesW - (pageCount - 1) * gap) / pageCount);
  const pages = Array.from({ length: pageCount }, (_, i) => rect(pagesX + i * (pageW + gap), pagesY, pageW, T.pageH));

  let play: Rect, save: Rect, length: Rect, more: Rect;
  let undo: Rect | null = null;
  let nextPage: Rect | null = null;
  if (landscape) {
    // A panel of two columns by three rows, right of the grid.
    const panelX = gridX + gridW + gap;
    const colW = Math.floor((screen.width - m - panelX - gap) / 2);
    const col = (c: number) => panelX + c * (colW + gap);
    const rowY = (r: number) => gridY + r * (T.buttonH + gap);
    play = rect(col(0), rowY(0), colW, T.buttonH);
    save = rect(col(1), rowY(0), colW, T.buttonH);
    length = rect(col(0), rowY(1), colW, T.buttonH);
    more = rect(col(1), rowY(1), colW, T.buttonH);
    undo = rect(col(0), rowY(2), colW, T.buttonH);
    nextPage = rect(col(1), rowY(2), colW, T.buttonH);
  } else {
    // A bar of four along the bottom.
    const y = screen.height - T.buttonH;
    const w = Math.floor((screen.width - 2 * m - 3 * gap) / 4);
    [play, save, length, more] = [0, 1, 2, 3].map((i) => rect(m + i * (w + gap), y, w, T.buttonH));
  }

  return {
    shape,
    rows,
    pageSteps: T.pageSteps,
    hint: rect(0, 0, screen.width, T.hintH),
    name,
    tempoDown,
    tempoValue,
    tempoUp,
    tabs,
    gutter,
    grid,
    cellW,
    rowH,
    pages,
    pitchUp,
    pitchDown,
    play,
    save,
    length,
    more,
    undo,
    nextPage,
  };
}

// The rectangle of the cell in column `col` (a step within the page) and row `row` (from the top).
export function cellRect(layout: TouchLayout, col: number, row: number): Rect {
  return rect(layout.grid.x + col * layout.cellW, layout.grid.y + row * layout.rowH, layout.cellW, layout.rowH);
}

// The (column, row) of the cell under a point, or null outside the grid.
export function cellAt(layout: TouchLayout, x: number, y: number): { col: number; row: number } | null {
  const { grid } = layout;
  if (x < grid.x || y < grid.y || x >= grid.x + grid.w || y >= grid.y + grid.h) return null;
  return { col: Math.floor((x - grid.x) / layout.cellW), row: Math.floor((y - grid.y) / layout.rowH) };
}

// The pitches shown, top to bottom: for a pitched channel the window of six that holds the cursor
// (windows are fixed blocks of six from the channel's lowest note, so the grid does not jump on every
// move), or the drums (hat, snare, kick) for the beat.
export function touchRowKeys(channel: ChannelId, cursor: number): number[] {
  if (channel === "beat") return [2, 1, 0];
  const { low, high } = keyRange(channel);
  const n = TOUCH_EDITOR.pitchRows;
  const clamped = Math.min(high, Math.max(low, cursor));
  const base = Math.min(high - n + 1, low + Math.floor((clamped - low) / n) * n);
  return Array.from({ length: n }, (_, i) => base + n - 1 - i);
}

// The step and key under a point, given the page shown and the rows shown, or null.
export function stepKeyAt(
  layout: TouchLayout,
  x: number,
  y: number,
  page: number,
  keys: readonly number[],
): { step: number; key: number } | null {
  const hit = cellAt(layout, x, y);
  if (!hit || hit.row >= keys.length) return null;
  return { step: page * layout.pageSteps + hit.col, key: keys[hit.row] };
}

// Every rectangle of a layout with a name, for the tests (a cell is listed by `cellRect`).
export function layoutRects(layout: TouchLayout): { name: string; rect: Rect }[] {
  const out: { name: string; rect: Rect }[] = [
    { name: "name", rect: layout.name },
    { name: "tempoDown", rect: layout.tempoDown },
    { name: "tempoValue", rect: layout.tempoValue },
    { name: "tempoUp", rect: layout.tempoUp },
    { name: "play", rect: layout.play },
    { name: "save", rect: layout.save },
    { name: "length", rect: layout.length },
    { name: "more", rect: layout.more },
    { name: "pitchUp", rect: layout.pitchUp },
    { name: "pitchDown", rect: layout.pitchDown },
  ];
  layout.tabs.forEach((r, i) => out.push({ name: `tab${i}`, rect: r }));
  layout.gutter.forEach((r, i) => out.push({ name: `gutter${i}`, rect: r }));
  layout.pages.forEach((r, i) => out.push({ name: `page${i}`, rect: r }));
  if (layout.undo) out.push({ name: "undo", rect: layout.undo });
  if (layout.nextPage) out.push({ name: "nextPage", rect: layout.nextPage });
  return out;
}

// -- Wording (through keyLabel, so a key is only named when it can be pressed) ------------------

export const TOUCH_TEXT = {
  // The reminder in the top strip. On touch the leave key is B.
  reminder: () => `${keyLabel("ESC")} leaves. Your draft is kept.`,
  // The first time the editor opens in a session.
  firstTime: "Tap a square to add or remove a note",
  namingHelp: "Type a name. GO keeps it.",
  play: "PLAY",
  stop: "STOP",
  save: "SAVE",
  more: "MORE",
  channels: { melody: "MELODY", bass: "BASS", beat: "BEAT" } as Record<ChannelId, string>,
};

const CHANNEL_COLOR: Record<ChannelId, string> = { melody: COLOR.tangerine, bass: COLOR.leaf, beat: COLOR.butter };
const BLACK = new Set([1, 3, 6, 8, 10]);

const fitText = (text: string, width: number): string => {
  let out = text;
  while (out.length > 0 && textWidth(out) > width) out = out.slice(0, -1);
  return out;
};

// The end of a text that fits `width` (the name box while typing: the caret and the last letters stay visible).
export const fitTail = (text: string, width: number): string => {
  let out = text;
  while (out.length > 0 && textWidth(out) > width) out = out.slice(1);
  return out;
};

// The top strip's text: the last message, or what is useful to know now.
export function touchHintText(v: Pick<EditorView, "message" | "naming" | "firstTouch">): string {
  if (v.message) return v.message;
  if (v.naming) return TOUCH_TEXT.namingHelp;
  return v.firstTouch ? TOUCH_TEXT.firstTime : TOUCH_TEXT.reminder();
}

export function drawTrackEditorTouch(ctx: CanvasRenderingContext2D, v: EditorView, screen: { width: number; height: number }): void {
  const T = TOUCH_EDITOR;
  const beat = v.channel === "beat";
  const keys = touchRowKeys(v.channel, v.row);
  const layout = touchEditorLayout(screen, { steps: v.steps, rows: keys.length });
  const color = CHANNEL_COLOR[v.channel];
  const page = v.page ?? Math.floor(v.step / T.pageSteps);
  const first = page * T.pageSteps;

  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, 0, screen.width, screen.height);
  ctx.fillStyle = COLOR.night;
  ctx.fillRect(1, 1, screen.width - 2, screen.height - 2);

  // The top strip.
  const text = touchHintText(v);
  drawText(ctx, fitText(text, screen.width - 8), 4, 3, { color: v.message ? COLOR.butter : COLOR.dusk, shadow: null });

  // The name (with a caret while it is typed) and the tempo.
  const { name } = layout;
  drawButton(ctx, name, "", { border: v.naming ? COLOR.butter : undefined });
  // While typing, the end of the name is what matters (the caret is there), so a long name scrolls
  // to show its last letters; otherwise the start is shown.
  const shown = v.naming ? fitTail(v.title, name.w - 8 - 6) : fitText(v.title, name.w - 8);
  const textY = name.y + Math.floor((name.h - GLYPH_H) / 2);
  drawText(ctx, shown, name.x + 4, textY, { color: v.naming ? COLOR.butter : COLOR.paper, shadow: null });
  if (v.naming && v.blink) drawText(ctx, "_", name.x + 4 + textWidth(shown) + 1, textY, { color: COLOR.butter, shadow: null });
  drawButton(ctx, layout.tempoDown, "-");
  drawButton(ctx, layout.tempoUp, "+");
  drawText(ctx, String(v.tempo), layout.tempoValue.x + layout.tempoValue.w / 2, textY, { color: COLOR.mist, align: "center", shadow: null });

  if (!v.started) {
    drawText(ctx, "MAKE A TRACK", screen.width / 2, screen.height / 2 - 4, { color: COLOR.mist, align: "center", shadow: null });
    return;
  }

  // Tabs.
  (["melody", "bass", "beat"] as const).forEach((id, i) => {
    const r = layout.tabs[i];
    const active = id === v.channel;
    const has = v.used.includes(id);
    ctx.fillStyle = active ? CHANNEL_COLOR[id] : COLOR.slate;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    drawText(ctx, TOUCH_TEXT.channels[id], r.x + r.w / 2, r.y + Math.floor((r.h - GLYPH_H) / 2), {
      color: active ? COLOR.ink : COLOR.mist,
      align: "center",
      shadow: null,
    });
    if (has) {
      ctx.fillStyle = active ? COLOR.ink : CHANNEL_COLOR[id];
      ctx.fillRect(r.x + r.w - 6, r.y + 3, 3, 3);
    }
  });

  // The grid: the rows' backgrounds, the gutter labels, the step lines, the steps past the end.
  keys.forEach((key, i) => {
    const row = cellRect(layout, 0, i);
    const black = !beat && BLACK.has(key % 12);
    ctx.fillStyle = black ? COLOR.night : COLOR.slate;
    ctx.fillRect(layout.grid.x, row.y, layout.grid.w, row.h);
    const label = beat ? (v.drums[key] ?? "") : noteName(key);
    const isCursorRow = key === v.row;
    const isC = !beat && key % 12 === 0;
    drawText(ctx, label, layout.gutter[i].x + 2, row.y + Math.floor((row.h - GLYPH_H) / 2), {
      color: isCursorRow ? COLOR.butter : isC ? COLOR.mist : COLOR.dusk,
      shadow: null,
    });
  });
  for (let s = 0; s <= T.pageSteps; s++) {
    ctx.fillStyle = s % 4 === 0 ? COLOR.dusk : COLOR.night;
    ctx.fillRect(layout.grid.x + s * layout.cellW - (s === T.pageSteps ? 1 : 0), layout.grid.y, 1, layout.grid.h);
  }
  for (let s = 0; s < T.pageSteps; s++) {
    if (first + s >= v.steps) {
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(layout.grid.x + s * layout.cellW + 1, layout.grid.y, layout.cellW - 1, layout.grid.h);
    }
  }
  if (!beat) {
    ctx.fillStyle = COLOR.dusk;
    keys.forEach((key, i) => {
      if (key % 12 === 0) ctx.fillRect(layout.grid.x, layout.grid.y + (i + 1) * layout.rowH - 1, layout.grid.w, 1);
    });
  }

  // Notes: one bar across a held note's steps (cut at the page edge).
  for (const n of v.notes) {
    const row = keys.indexOf(n.key);
    if (row < 0) continue;
    const from = Math.max(n.step, first);
    const to = Math.min(n.step + n.length, first + T.pageSteps);
    if (to <= from) continue;
    ctx.fillStyle = color;
    ctx.fillRect(layout.grid.x + (from - first) * layout.cellW + 1, layout.grid.y + row * layout.rowH + 1, (to - from) * layout.cellW - 1, layout.rowH - 2);
  }

  // The playing position, and the cursor (when it is on this page).
  if (v.playStep !== null && v.playStep >= first && v.playStep < first + T.pageSteps) {
    ctx.fillStyle = withAlpha(COLOR.paper, 0.22);
    ctx.fillRect(layout.grid.x + (v.playStep - first) * layout.cellW, layout.grid.y, layout.cellW, layout.grid.h);
  }
  const cursorRow = keys.indexOf(v.row);
  if (cursorRow >= 0 && !v.naming && v.step >= first && v.step < first + T.pageSteps) {
    const c = cellRect(layout, v.step - first, cursorRow);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(c.x, c.y, c.w + 1, 1);
    ctx.fillRect(c.x, c.y + c.h - 1, c.w + 1, 1);
    ctx.fillRect(c.x, c.y, 1, c.h);
    ctx.fillRect(c.x + c.w, c.y, 1, c.h);
  }

  // Pages, labelled by the steps they hold; the one shown is outlined, and one with notes has a dot.
  layout.pages.forEach((r, i) => {
    const lo = i * T.pageSteps;
    drawButton(ctx, r, `${lo + 1}-${lo + T.pageSteps}`, { border: i === page ? COLOR.butter : undefined, color: i === page ? COLOR.butter : COLOR.mist });
    if (v.notes.some((n) => n.step >= lo && n.step < lo + T.pageSteps)) {
      ctx.fillStyle = color;
      ctx.fillRect(r.x + r.w - 5, r.y + 3, 2, 2);
    }
  });

  // Scroll the pitches (not for the three drums).
  if (!beat) {
    drawButton(ctx, layout.pitchUp, "UP");
    drawButton(ctx, layout.pitchDown, "DN");
  }

  // The buttons.
  drawButton(ctx, layout.play, v.playing ? TOUCH_TEXT.stop : TOUCH_TEXT.play, { color: v.playing ? COLOR.leaf : COLOR.paper });
  drawButton(ctx, layout.save, TOUCH_TEXT.save);
  drawButton(ctx, layout.length, `LENGTH ${v.pen}`);
  drawButton(ctx, layout.more, TOUCH_TEXT.more);
  if (layout.undo) drawButton(ctx, layout.undo, "UNDO");
  if (layout.nextPage) drawButton(ctx, layout.nextPage, "NEXT");
}
