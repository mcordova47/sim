import { describe, expect, it } from "vitest";
import { GLYPHS, GLYPH_H, GLYPH_W, textWidth } from "./font";
import { HUD_BOX, placeLabel, type Box } from "./layout";
import { Popups } from "./popups";

const view = { width: 320, height: 192 };

describe("font", () => {
  it("has well-formed glyphs", () => {
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      expect(rows, ch).toHaveLength(GLYPH_H);
      for (const row of rows) expect(row, ch).toMatch(new RegExp(`^[#.]{${GLYPH_W}}$`));
    }
  });

  it("covers everything the game prints", () => {
    const needed =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*.,:!?'()/%";
    for (const ch of needed) expect(GLYPHS[ch], ch).toBeDefined();
  });

  it("measures text", () => {
    expect(textWidth("")).toBe(0);
    expect(textWidth("A")).toBe(GLYPH_W);
    expect(textWidth("AB")).toBe(GLYPH_W * 2 + 1);
    expect(textWidth("AB", 2)).toBe((GLYPH_W * 2 + 1) * 2);
  });
});

describe("placeLabel", () => {
  const size = { w: 60, h: 13 };
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  it("sits above the anchor, centred", () => {
    const box = placeLabel({ x: 200, top: 150, bottom: 164 }, size, view);
    expect(box.y + box.h).toBeLessThan(150);
    expect(box.x + box.w / 2).toBe(200);
  });

  it("stays inside the view horizontally", () => {
    expect(placeLabel({ x: 2, top: 150, bottom: 164 }, size, view).x).toBeGreaterThanOrEqual(0);
    const right = placeLabel({ x: 319, top: 150, bottom: 164 }, size, view);
    expect(right.x + right.w).toBeLessThanOrEqual(view.width);
  });

  it("moves below the anchor rather than overlapping the HUD", () => {
    const anchor = { x: 30, top: 30, bottom: 44 };
    const box = placeLabel(anchor, size, view);
    expect(overlaps(box, HUD_BOX)).toBe(false);
    expect(box.y).toBeGreaterThanOrEqual(anchor.bottom);
  });

  it("moves below when there is no room above the screen top", () => {
    const box = placeLabel({ x: 200, top: 8, bottom: 22 }, size, view);
    expect(box.y).toBeGreaterThanOrEqual(22);
  });

  it("stays on screen when the anchor is at the bottom", () => {
    const box = placeLabel({ x: 30, top: 10, bottom: 190 }, size, view);
    expect(box.y + box.h).toBeLessThanOrEqual(view.height);
  });

  it("never overlaps the HUD across the whole screen", () => {
    for (let x = 0; x <= 320; x += 8) {
      for (let top = 0; top <= 176; top += 4) {
        const box = placeLabel({ x, top, bottom: top + 14 }, size, view);
        // The bottom-clamp fallback can't fix an anchor sitting under the HUD
        // with no space, but ordinary cases must stay clear.
        if (top + 14 + 3 + size.h <= view.height - 2) {
          expect(overlaps(box, HUD_BOX), `x=${x} top=${top}`).toBe(false);
        }
      }
    }
  });
});

describe("Popups", () => {
  it("expires popups after their lifetime", () => {
    const p = new Popups();
    p.add(10, 10, [{ text: "+5", color: "#fff" }]);
    expect(p.count).toBe(1);
    p.update(0.5);
    expect(p.count).toBe(1);
    p.update(2);
    expect(p.count).toBe(0);
  });
});
