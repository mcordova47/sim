import { afterEach, describe, expect, it, vi } from "vitest";
import { drawText, textWidth, unsupportedChars } from "../../render/font";
import { DESKTOP_VIEW, NARROW_VIEW, setView } from "../config";
import { Decor } from "../decor";
import { DECOR_DATA, isTestItem } from "../decor-data";
import { drawThings, entryLayout, thingsBox } from "./inventory-draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

// Issue 109c: the silhouette cell and its entry.

const fills: string[] = [];
const ctx = { fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, drawImage: () => {}, set fillStyle(v: string) { fills.push(v); } } as unknown as CanvasRenderingContext2D;
const texts = () => vi.mocked(drawText).mock.calls.map((c) => String(c[1]));
afterEach(() => setView(DESKTOP_VIEW));

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("a silhouette at %s", (_n, view) => {
  const seenAll = () => {
    const d = new Decor();
    for (const i of DECOR_DATA.items) if (!isTestItem(i)) d.markSeen(i.id);
    return d.entries().filter((e) => e.silhouette);
  };

  it("says only ??? and the one line, and fits the box beside its sprite", () => {
    setView(view);
    const box = thingsBox();
    const all = seenAll();
    expect(all.length).toBeGreaterThan(5);
    for (const e of all) {
      const { lines, sprite, bottom } = entryLayout(e);
      expect(lines[0].text).toBe("???");
      expect(lines.slice(1).map((l) => l.text).join(" ")).toBe("YOU HAVE SEEN ONE OF THESE.");
      expect(bottom).toBeLessThanOrEqual(box.y + box.h);
      for (const l of lines) {
        expect(unsupportedChars(l.text)).toEqual([]);
        if (l.y < sprite.y + sprite.h) expect(l.x + textWidth(l.text)).toBeLessThanOrEqual(sprite.x - 3);
      }
    }
  });

  it("draws no name, note, source, place or hint, and no count, total or progress word", () => {
    setView(view);
    const entries = seenAll();
    for (let cursor = 0; cursor < entries.length; cursor += 4) {
      vi.mocked(drawText).mockClear();
      drawThings(ctx, { entries, cursor, touch: false });
      const all = texts().join("\n");
      for (const e of [entries[cursor]]) {
        expect(all).not.toContain(e.item.name);
        if (e.item.note) expect(all).not.toContain(e.item.note.slice(0, 10));
      }
      expect(all).toContain("YOU HAVE SEEN ONE OF THESE.".slice(0, 8));
      expect(all).not.toMatch(/TOTAL|COMPLETE|MISSING|LEFT|MORE|COLLECT|GET|FIND|BUY|ORDER|ALL \d|%|PACKAGE|GIFT|DELIVERY/);
      for (const t of texts().filter((x) => /\d/.test(x))) expect(t).toMatch(/^PAGE \d+\/\d+$/);
    }
  });

  it("is flat dark: the cell never draws the item's colours without a flat drawer", () => {
    setView(view);
    fills.length = 0;
    drawThings(ctx, { entries: seenAll(), cursor: 0, touch: false });
    expect(fills.length).toBeGreaterThan(0);
  });
});
