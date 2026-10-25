import { describe, expect, it } from "vitest";
import { ACCENT_ROWS, GLYPHS, GLYPH_H, GLYPH_W, normalizeText, textWidth, unsupportedChars } from "./font";
import { HUD_BOX, fitBox, placeLabel, type Box } from "./layout";
import { Popups } from "./popups";

const view = { width: 320, height: 192 };

describe("font", () => {
  it("has well-formed glyphs", () => {
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      expect([GLYPH_H, GLYPH_H + ACCENT_ROWS], ch).toContain(rows.length);
      for (const row of rows) expect(row, ch).toMatch(new RegExp(`^[#.]{${GLYPH_W}}$`));
    }
  });

  it("covers everything the game prints", () => {
    const needed =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*.,:!?'()/%";
    for (const ch of needed) expect(GLYPHS[ch], ch).toBeDefined();
  });

  it("has the punctuation dialog text needs", () => {
    for (const ch of "\"; & # @ $ = _ < > [ ] { } | \\ ^ ~ `".replace(/ /g, "")) {
      expect(GLYPHS[ch], ch).toBeDefined();
    }
  });

  it("draws the Spanish accented capitals, and lowercase ones as capitals", () => {
    for (const ch of "ÁÉÍÓÚÑ") expect(GLYPHS[ch], ch).toHaveLength(GLYPH_H + ACCENT_ROWS);
    expect(unsupportedChars("canción, él, niño, café, más, tú")).toEqual([]);
    expect(unsupportedChars("¿")).toEqual(["¿"]);
  });

  it("replaces typographic characters with plain ones", () => {
    expect(normalizeText("it\u2019s")).toBe("it's");
    expect(normalizeText("\u201Cquoted\u201D")).toBe('"quoted"');
    expect(normalizeText("a\u2014b\u2013c")).toBe("a-b-c");
    expect(normalizeText("wait\u2026")).toBe("wait...");
    expect(normalizeText("a\u00A0b\tc")).toBe("a b c");
    expect(normalizeText("plain text")).toBe("plain text");
  });

  it("measures text after normalising it, so an ellipsis counts as three dots", () => {
    expect(textWidth("\u2026")).toBe(textWidth("..."));
  });

  it("lists the characters it can't draw, once each", () => {
    expect(unsupportedChars("Hello, world! (it\u2019s fine)")).toEqual([]);
    expect(unsupportedChars("caf\u00E9 \u00EB\u00EB \u2603")).toEqual(["\u00CB", "\u2603"]);
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

describe("placeLabel with wide labels", () => {
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  it("clears the HUD even when too wide to slide beside it", () => {
    // 200px can't fit to the right of the 152px HUD on a 320px screen.
    const size = { w: 200, h: 13 };
    for (let x = 0; x <= 320; x += 10) {
      for (let top = 0; top <= 120; top += 6) {
        const box = placeLabel({ x, top, bottom: top + 14 }, size, view);
        expect(overlaps(box, HUD_BOX), `x=${x} top=${top}`).toBe(false);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(view.width);
      }
    }
  });

  it("also keeps clear of extra boxes such as popups", () => {
    const popup: Box = { x: 150, y: 80, w: 40, h: 20 };
    const box = placeLabel({ x: 170, top: 100, bottom: 114 }, { w: 60, h: 13 }, view, [
      HUD_BOX,
      popup,
    ]);
    expect(overlaps(box, popup)).toBe(false);
    expect(overlaps(box, HUD_BOX)).toBe(false);
  });
});

describe("fitBox", () => {
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  it("leaves a box that is already fine alone", () => {
    const box = { x: 200, y: 100, w: 40, h: 10 };
    expect(fitBox(box, view)).toEqual(box);
  });

  it("pulls a box back on screen on every side", () => {
    expect(fitBox({ x: -30, y: 100, w: 40, h: 10 }, view).x).toBeGreaterThanOrEqual(0);
    const right = fitBox({ x: 310, y: 100, w: 40, h: 10 }, view);
    expect(right.x + right.w).toBeLessThanOrEqual(view.width);
    expect(fitBox({ x: 200, y: -20, w: 40, h: 10 }, view).y).toBeGreaterThanOrEqual(0);
    const bottom = fitBox({ x: 200, y: 200, w: 40, h: 10 }, view);
    expect(bottom.y + bottom.h).toBeLessThanOrEqual(view.height);
  });

  it("moves a box out of the HUD the shortest way", () => {
    // Just inside the HUD's right edge: easier to go right than down.
    const nearRight = fitBox({ x: 140, y: 10, w: 40, h: 10 }, view);
    expect(overlaps(nearRight, HUD_BOX)).toBe(false);
    expect(nearRight.y).toBe(10);
    // Just above the HUD's bottom edge, far from the right: easier to go down.
    const nearBottom = fitBox({ x: 10, y: 30, w: 40, h: 10 }, view);
    expect(overlaps(nearBottom, HUD_BOX)).toBe(false);
    expect(nearBottom.x).toBe(10);
  });
});

describe("Popups", () => {
  const popupText = (text: string, scale = 1) => [{ text, color: "#fff", scale }];

  it("expires popups after their lifetime", () => {
    const p = new Popups();
    p.add(10, 10, popupText("+5"));
    expect(p.count).toBe(1);
    p.update(0.5);
    expect(p.count).toBe(1);
    p.update(2);
    expect(p.count).toBe(0);
  });

  it("keeps popups of every size fully on screen at every edge", () => {
    const lines = [
      { text: "+45", color: "#fff", scale: 2 },
      { text: "COMBO X3.0", color: "#fff" },
      { text: "REPEAT X0.50", color: "#fff" },
    ];
    for (const x of [0, 5, 20, 35, 160, 285, 300, 319, 400]) {
      for (const y of [0, 4, 30, 100, 180, 192]) {
        for (const age of [0, 0.4, 1.2]) {
          const p = new Popups();
          p.add(x, y, lines);
          p.update(age);
          const [box] = p.boxes(view);
          const at = `x=${x} y=${y} age=${age}`;
          expect(box.x, at).toBeGreaterThanOrEqual(0);
          expect(box.y, at).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w, at).toBeLessThanOrEqual(view.width);
          expect(box.y + box.h, at).toBeLessThanOrEqual(view.height);
        }
      }
    }
  });

  it("keeps popups out of the HUD", () => {
    const overlaps = (a: Box, b: Box) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const x of [10, 60, 120, 150]) {
      const p = new Popups();
      p.add(x, 20, popupText("+45", 2));
      const [box] = p.boxes(view);
      expect(overlaps(box, HUD_BOX), `x=${x}`).toBe(false);
    }
  });

  it("measures the real widest line, not a fixed margin", () => {
    const p = new Popups();
    p.add(160, 100, [{ text: "REPEAT X0.50", color: "#fff" }]);
    const [box] = p.boxes(view);
    expect(box.w).toBe(textWidth("REPEAT X0.50"));
  });

  it("reports boxes in screen coordinates relative to the camera", () => {
    const p = new Popups();
    p.add(500, 100, popupText("+9"));
    const [a] = p.boxes(view, { x: 400, y: 0 });
    const [b] = p.boxes(view, { x: 440, y: 0 });
    expect(a.x - b.x).toBe(40);
  });
});
