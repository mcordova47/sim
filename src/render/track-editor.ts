import { VIEW } from "../game/config";
import { noteName, type ChannelId, type GridNote } from "../game/music/demos";
import { COLOR, withAlpha } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";

// Draws the track editor (layout A of docs/make-tracks.md: a piano roll, one
// channel at a time) over the whole screen. It only draws what it is given; the
// activity (activities/make-track.ts) owns the state.

export interface EditorView {
  // False while the start menu is up: only the frame is drawn.
  started: boolean;
  title: string;
  naming: boolean;
  blink: boolean;
  tempo: number;
  steps: number;
  channel: ChannelId;
  // The notes of the shown channel, as they will be written.
  notes: GridNote[];
  // The channels that have notes.
  used: ChannelId[];
  step: number;
  // The cursor's key: a MIDI number, or the drum index in the beat channel.
  row: number;
  pen: number;
  playing: boolean;
  playStep: number | null;
  message: string;
  drums: readonly string[];
}

// Layout in pixels, for the 320x192 screen. The game draws "ESC TO STOP" in the top 10.
export const EDITOR = {
  margin: 8,
  headerY: 13,
  tabsY: 25,
  gridX: 34,
  gridY: 36,
  cell: 16,
  pageSteps: 16,
  rowH: 8,
  rows: 12,
  beatRowH: 16,
  rulerGap: 2,
  messageY: 146,
  helpY: 158,
  helpStep: 9,
};

// The editor's own wording (the tests check that the font can draw it and that it fits).
export const EDITOR_TEXT = {
  reminder: "Escape leaves at any time. Your draft is kept.",
  help: [
    "Arrows move   E note   T length   P play",
    "1 2 3 channel   - = tempo   , . 16 or 32 steps",
    "N name   S save   D delete   C copy   V paste",
  ],
  namingHelp: ["Type a name. Backspace deletes.", "Enter keeps it."],
};

const CHANNEL_TEXT: Record<ChannelId, { tab: string; color: string }> = {
  melody: { tab: "1 MELODY", color: COLOR.tangerine },
  bass: { tab: "2 BASS", color: COLOR.leaf },
  beat: { tab: "3 BEAT", color: COLOR.butter },
};
const BLACK = new Set([1, 3, 6, 8, 10]);

// The keys shown in the grid, top to bottom: the octave the cursor is in for a
// pitched channel (B down to C), or the drums (hat, snare, kick) for the beat.
export function rowKeys(channel: ChannelId, cursor: number): number[] {
  if (channel === "beat") return [2, 1, 0];
  const base = Math.floor(cursor / 12) * 12;
  return Array.from({ length: EDITOR.rows }, (_, i) => base + EDITOR.rows - 1 - i);
}

function rowLabel(channel: ChannelId, key: number, drums: readonly string[]): string {
  return channel === "beat" ? (drums[key] ?? "") : noteName(key);
}

const fitText = (text: string, width: number): string => {
  let out = text;
  while (out.length > 0 && textWidth(out) > width) out = out.slice(0, -1);
  return out;
};

export function drawTrackEditor(ctx: CanvasRenderingContext2D, v: EditorView): void {
  const { margin, headerY, tabsY, gridX, gridY, cell, pageSteps, rowH, rows } = EDITOR;
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = COLOR.night;
  ctx.fillRect(1, 1, VIEW.width - 2, VIEW.height - 2);

  // Header: the name (with a caret while it is typed) and the tempo.
  const name = fitText(v.title, 24 * 6);
  drawText(ctx, name, margin, headerY, { color: v.naming ? COLOR.butter : COLOR.paper, shadow: null });
  if (v.naming && v.blink) drawText(ctx, "_", margin + textWidth(name) + 1, headerY, { color: COLOR.butter, shadow: null });
  drawText(ctx, `${v.tempo} BPM  ${v.steps} STEPS`, VIEW.width - margin, headerY, { color: COLOR.mist, align: "right", shadow: null });
  if (!v.started) {
    drawText(ctx, "MAKE A TRACK", VIEW.width / 2, VIEW.height / 2 - 4, { color: COLOR.mist, align: "center", shadow: null });
    return;
  }

  // Tabs for the channels, a small square after those that have notes.
  let x = margin;
  for (const id of ["melody", "bass", "beat"] as const) {
    const { tab, color } = CHANNEL_TEXT[id];
    const has = v.used.includes(id);
    const label = tab;
    const w = textWidth(label) + 8 + (has ? 6 : 0);
    const active = id === v.channel;
    if (active) {
      ctx.fillStyle = color;
      ctx.fillRect(x, tabsY - 2, w, GLYPH_H + 4);
    }
    drawText(ctx, label, x + 4, tabsY, { color: active ? COLOR.ink : COLOR.mist, shadow: null });
    // A small square after the name of a channel that has notes.
    if (has) {
      ctx.fillStyle = active ? COLOR.ink : color;
      ctx.fillRect(x + w - 7, tabsY + 2, 3, 3);
    }
    x += w + 4;
  }
  drawText(ctx, `LENGTH ${v.pen}`, x + 6, tabsY, { color: COLOR.mist, shadow: null });
  drawText(ctx, v.playing ? "PLAYING" : "STOPPED", VIEW.width - margin, tabsY, {
    color: v.playing ? COLOR.leaf : COLOR.dusk,
    align: "right",
    shadow: null,
  });

  // The grid: 16 steps across (the page the cursor is on), one octave down.
  const keys = rowKeys(v.channel, v.row);
  const beat = v.channel === "beat";
  const h = beat ? EDITOR.beatRowH : rowH;
  const page = Math.floor(v.step / pageSteps) * pageSteps;
  const gridH = (beat ? keys.length : rows) * h;
  const color = CHANNEL_TEXT[v.channel].color;

  keys.forEach((key, i) => {
    const y = gridY + i * h;
    const black = !beat && BLACK.has(key % 12);
    ctx.fillStyle = black ? COLOR.night : COLOR.slate;
    ctx.fillRect(gridX, y, pageSteps * cell, h);
    const isCursorRow = key === v.row;
    const label = rowLabel(v.channel, key, v.drums);
    const isC = !beat && key % 12 === 0;
    drawText(ctx, label, margin - 2, y + Math.floor((h - GLYPH_H) / 2), {
      color: isCursorRow ? COLOR.butter : isC ? COLOR.mist : COLOR.dusk,
      shadow: null,
    });
  });
  // Beat and bar lines, and the steps past the end of the track.
  for (let s = 0; s <= pageSteps; s++) {
    const lineX = gridX + s * cell;
    if (s % 2 === 0 || s === pageSteps) {
      ctx.fillStyle = (page + s) % 8 === 0 ? COLOR.dusk : COLOR.night;
      ctx.fillRect(lineX, gridY, 1, gridH);
    }
  }
  for (let s = 0; s < pageSteps; s++) {
    if (page + s >= v.steps) {
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(gridX + s * cell + 1, gridY, cell - 1, gridH);
    }
  }
  // Octave lines under each C.
  if (!beat) {
    ctx.fillStyle = COLOR.dusk;
    keys.forEach((key, i) => {
      if (key % 12 === 0) ctx.fillRect(gridX, gridY + (i + 1) * h - 1, pageSteps * cell, 1);
    });
  }

  // Notes. A held note is one bar across its steps (cut at the page edge).
  for (const n of v.notes) {
    const row = keys.indexOf(n.key);
    if (row < 0) continue;
    const from = Math.max(n.step, page);
    const to = Math.min(n.step + n.length, page + pageSteps);
    if (to <= from) continue;
    ctx.fillStyle = color;
    ctx.fillRect(gridX + (from - page) * cell + 1, gridY + row * h + 1, (to - from) * cell - 1, h - 2);
  }

  // The playing position, and the cursor.
  if (v.playStep !== null && v.playStep >= page && v.playStep < page + pageSteps) {
    ctx.fillStyle = withAlpha(COLOR.paper, 0.22);
    ctx.fillRect(gridX + (v.playStep - page) * cell, gridY, cell, gridH);
  }
  const cursorRow = keys.indexOf(v.row);
  if (cursorRow >= 0 && !v.naming) {
    const cx = gridX + (v.step - page) * cell;
    const cy = gridY + cursorRow * h;
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(cx, cy, cell + 1, 1);
    ctx.fillRect(cx, cy + h - 1, cell + 1, 1);
    ctx.fillRect(cx, cy, 1, h);
    ctx.fillRect(cx + cell, cy, 1, h);
  }

  // The ruler: a number at each beat.
  const rulerY = gridY + gridH + EDITOR.rulerGap;
  for (let s = 0; s < pageSteps; s += 2) {
    if (page + s >= v.steps) break;
    drawText(ctx, String(1 + (page + s) / 2), gridX + s * cell + 2, rulerY, {
      color: (page + s) % 8 === 0 ? COLOR.paper : COLOR.dusk,
      shadow: null,
    });
  }

  // One line for what just happened (or a reminder), then the keys.
  const line = v.message || EDITOR_TEXT.reminder;
  drawText(ctx, fitText(line, VIEW.width - 2 * margin), margin, EDITOR.messageY, {
    color: v.message ? COLOR.butter : COLOR.dusk,
    shadow: null,
  });
  const help = v.naming ? EDITOR_TEXT.namingHelp : EDITOR_TEXT.help;
  help.forEach((text, i) => {
    drawText(ctx, text, margin, EDITOR.helpY + i * EDITOR.helpStep, { color: COLOR.mist, shadow: null });
  });
}
