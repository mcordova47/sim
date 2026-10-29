import { afterEach, describe, expect, it } from "vitest";
import { NARROW_VIEW, DESKTOP_VIEW } from "../game/config";
import { CHANNELS, keyRange } from "../game/music/demos";
import { setTouchHints } from "./hints";
import type { Rect } from "../input/tap";
import {
  TOUCH_EDITOR,
  TOUCH_TEXT,
  cellAt,
  cellRect,
  layoutRects,
  stepKeyAt,
  touchEditorLayout,
  touchHintText,
  touchRowKeys,
} from "./track-editor-touch";

afterEach(() => setTouchHints(false));

const VIEWS = [
  { name: "224 x 208 (phone, narrow view)", screen: NARROW_VIEW, shape: "portrait" },
  { name: "320 x 192 (wide view)", screen: DESKTOP_VIEW, shape: "landscape" },
] as const;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (r: Rect, s: { width: number; height: number }) => r.x >= 0 && r.y >= 0 && r.x + r.w <= s.width && r.y + r.h <= s.height;

describe("the touch editor's layout (issue 106a)", () => {
  for (const view of VIEWS) {
    for (const steps of [16, 32]) {
      for (const rows of [6, 3]) {
        describe(`${view.name}, ${steps} steps, ${rows} rows`, () => {
          const layout = touchEditorLayout(view.screen, { steps, rows });
          const all = layoutRects(layout);
          const cells = Array.from({ length: rows * layout.pageSteps }, (_, i) => ({
            name: `cell ${i}`,
            rect: cellRect(layout, i % layout.pageSteps, Math.floor(i / layout.pageSteps)),
          }));

          it("is the shape for its view", () => expect(layout.shape).toBe(view.shape));

          it("keeps every rectangle inside the view", () => {
            for (const { name, rect } of [...all, ...cells, { name: "grid", rect: layout.grid }, { name: "hint", rect: layout.hint }]) {
              expect(inside(rect, view.screen), name).toBe(true);
              expect(rect.w, name).toBeGreaterThan(0);
              expect(rect.h, name).toBeGreaterThan(0);
            }
          });

          it("has no two rectangles overlapping (buttons, tabs, gutter, pages and cells)", () => {
            const things = [...all, ...cells];
            for (let i = 0; i < things.length; i++) {
              for (let j = i + 1; j < things.length; j++) {
                expect(overlap(things[i].rect, things[j].rect), `${things[i].name} / ${things[j].name}`).toBe(false);
              }
            }
          });

          it("keeps the top strip clear for the hint line", () => {
            for (const { name, rect } of all) expect(overlap(rect, layout.hint), name).toBe(false);
          });

          it("tiles the grid with its cells and maps a cell back to its own column and row", () => {
            const area = cells.reduce((sum, c) => sum + c.rect.w * c.rect.h, 0);
            expect(area).toBe(layout.grid.w * layout.grid.h);
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < layout.pageSteps; col++) {
                const r = cellRect(layout, col, row);
                for (const [dx, dy] of [[0, 0], [r.w - 1, 0], [0, r.h - 1], [r.w - 1, r.h - 1], [r.w / 2, r.h / 2]]) {
                  expect(cellAt(layout, r.x + dx, r.y + dy)).toEqual({ col, row });
                }
              }
            }
            expect(cellAt(layout, layout.grid.x - 1, layout.grid.y)).toBeNull();
            expect(cellAt(layout, layout.grid.x, layout.grid.y + layout.grid.h)).toBeNull();
            expect(cellAt(layout, layout.grid.x + layout.grid.w, layout.grid.y)).toBeNull();
          });

          it("makes the bar buttons at least 50 x 18", () => {
            for (const r of [layout.play, layout.save, layout.length, layout.more, ...(layout.undo ? [layout.undo] : []), ...(layout.nextPage ? [layout.nextPage] : [])]) {
              expect(r.w).toBeGreaterThanOrEqual(50);
              expect(r.h).toBeGreaterThanOrEqual(18);
            }
          });

          it("has a page button for every 8 steps, tabs for the three channels and a row label per row", () => {
            expect(layout.pages).toHaveLength(steps / 8);
            expect(layout.tabs).toHaveLength(3);
            expect(layout.gutter).toHaveLength(rows);
          });
        });
      }
    }
  }

  it("gives the grid cells of 25 x 20 (portrait) and 24 x 20 (landscape) game pixels, and 6 pitch rows", () => {
    const p = touchEditorLayout(NARROW_VIEW);
    expect([p.cellW, p.rowH, p.rows]).toEqual([25, TOUCH_EDITOR.rowH, 6]);
    const l = touchEditorLayout(DESKTOP_VIEW);
    expect([l.cellW, l.rowH, l.rows]).toEqual([24, TOUCH_EDITOR.rowH, 6]);
  });

  it("uses the four top-level buttons Play, Save, Length, More, in a bar (portrait) or a panel (landscape)", () => {
    const p = touchEditorLayout(NARROW_VIEW);
    expect([p.play, p.save, p.length, p.more].every((r) => r.y === p.play.y)).toBe(true);
    expect(p.play.x).toBeLessThan(p.save.x);
    expect(p.save.x).toBeLessThan(p.length.x);
    expect(p.length.x).toBeLessThan(p.more.x);
    expect(p.undo).toBeNull();
    const l = touchEditorLayout(DESKTOP_VIEW);
    expect(l.play.x).toBeGreaterThanOrEqual(l.grid.x + l.grid.w);
    expect(l.undo).not.toBeNull();
  });

  it("makes the tap targets at least about 44 CSS px where it can (cells 40 x 33 and up on a 1.67x phone)", () => {
    const scale = 5 / 3;
    for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
      const l = touchEditorLayout(screen);
      expect(l.cellW * scale).toBeGreaterThanOrEqual(40);
      expect(l.rowH * scale).toBeGreaterThanOrEqual(33);
    }
  });
});

describe("the rows shown", () => {
  it("is a window of six pitches holding the cursor, top to bottom, inside the channel's range", () => {
    for (const channel of ["melody", "bass"] as const) {
      const { low, high } = keyRange(channel);
      for (let cursor = low; cursor <= high; cursor++) {
        const keys = touchRowKeys(channel, cursor);
        expect(keys).toHaveLength(6);
        expect(keys).toContain(cursor);
        expect(keys[0]).toBeLessThanOrEqual(high);
        expect(keys[5]).toBeGreaterThanOrEqual(low);
        keys.forEach((k, i) => i > 0 && expect(k).toBe(keys[i - 1] - 1));
      }
    }
  });
  it("stays put while the cursor moves inside a window", () => {
    expect(touchRowKeys("melody", 60)).toEqual(touchRowKeys("melody", 63));
    expect(touchRowKeys("melody", 60)).not.toEqual(touchRowKeys("melody", 66));
  });
  it("is the three drums for the beat (hat, snare, kick from the top)", () => {
    expect(touchRowKeys("beat", 1)).toEqual([2, 1, 0]);
  });
  it("maps a point to the step (on the page shown) and the pitch", () => {
    for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
      const layout = touchEditorLayout(screen, { steps: 32 });
      const keys = touchRowKeys("melody", 62);
      for (let page = 0; page < 4; page++) {
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 8; col++) {
            const r = cellRect(layout, col, row);
            expect(stepKeyAt(layout, r.x + 1, r.y + 1, page, keys)).toEqual({ step: page * 8 + col, key: keys[row] });
          }
        }
      }
      expect(stepKeyAt(layout, 0, 0, 0, keys)).toBeNull();
      // Drum rows are three; a point below them is nothing.
      const drums = touchEditorLayout(screen, { rows: 3 });
      const low = cellRect(drums, 0, 2);
      expect(stepKeyAt(drums, low.x, low.y, 0, touchRowKeys("beat", 0))).toEqual({ step: 0, key: 0 });
    }
  });
});

describe("the hint line's wording", () => {
  it("names B on the touch layer and says so in the reminder", () => {
    setTouchHints(true);
    expect(TOUCH_TEXT.reminder()).toBe("B leaves. Your draft is kept.");
    expect(touchHintText({ message: "", naming: false, firstTouch: false })).toBe("B leaves. Your draft is kept.");
  });
  it("shows the tip the first time, a message over it, and the naming help while naming", () => {
    setTouchHints(true);
    expect(touchHintText({ message: "", naming: false, firstTouch: true })).toBe("Tap a square to add or remove a note");
    expect(touchHintText({ message: "Saved.", naming: false, firstTouch: true })).toBe("Saved.");
    expect(touchHintText({ message: "", naming: true, firstTouch: true })).toBe("Type a name. GO keeps it.");
  });
  it("fits the narrow view's width in the font", async () => {
    const { textWidth } = await import("./font");
    for (const t of [TOUCH_TEXT.reminder(), TOUCH_TEXT.firstTime, TOUCH_TEXT.namingHelp]) {
      expect(textWidth(t)).toBeLessThanOrEqual(NARROW_VIEW.width - 8);
    }
  });
  it("keeps its channel and button labels short enough for their rectangles", async () => {
    const { textWidth } = await import("./font");
    const layout = touchEditorLayout(NARROW_VIEW, { steps: 32 });
    for (const id of CHANNELS) expect(textWidth(TOUCH_TEXT.channels[id]) + 8).toBeLessThanOrEqual(layout.tabs[0].w);
    expect(textWidth("LENGTH 4") + 2).toBeLessThanOrEqual(layout.length.w);
    for (const p of layout.pages) expect(textWidth("25-32") + 2).toBeLessThanOrEqual(p.w);
    const wide = touchEditorLayout(DESKTOP_VIEW);
    expect(textWidth("LENGTH 4") + 2).toBeLessThanOrEqual(wide.length.w);
    expect(textWidth("NEXT") + 2).toBeLessThanOrEqual(wide.nextPage!.w);
  });
});
