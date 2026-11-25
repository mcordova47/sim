import { describe, expect, it, vi } from "vitest";
import { drawText, textWidth } from "../../render/font";
import { VIEW } from "../config";
import golden from "./golden/pause-26.json";
import { ACHIEVEMENTS, type Achievement } from "./data";
import { LEGEND_TEXT, PRODUCT_NAME, OUTFITS_HINT, SYNC_HINT, THINGS_HINT, TRANSFER_HINT, LIST_LAYOUT, drawList, listRows, desktopPageLabel, type ListView } from "./draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

// Issue 178: the desktop hint line (P, I, F, T: the only on-screen way to the pause pages) used to vanish once the
// rows ran below y 155, which a 27th achievement did (rows end at 158). The list now pages above the hint line.
// golden/pause-26.json was recorded from the code before this issue, so it is the screen as it was.

function make(n: number): Achievement[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i}`, name: `TEST ${i}`, description: "D", when: { tasks: ["x"] } }));
}

function record(achievements: readonly Achievement[], cursor: number, extra: Partial<ListView> = {}) {
  const fills: unknown[] = [];
  const ctx = { fillRect: (...a: unknown[]) => fills.push(a), set fillStyle(v: string) { fills.push(v); } } as unknown as CanvasRenderingContext2D;
  vi.mocked(drawText).mockClear();
  drawList(ctx, { achievements, unlocked: (id) => id.endsWith("1"), cursor, message: null, voice: "DIALOG VOICE: BEEP", adBlocker: false, ...extra });
  return { fills, texts: vi.mocked(drawText).mock.calls.map((c) => [c[1], c[2], c[3], c[4]]) };
}

const texts = (r: ReturnType<typeof record>) => r.texts.map((t) => t[0]);

describe("the desktop pause list with many achievements", () => {
  it("draws the 26-achievement screen exactly as before", () => {
    const got = JSON.parse(JSON.stringify(record(make(26), 5)));
    expect(got).toEqual(golden);
  });

  it("keeps all four page hints for 26, 27, 40 and 100 achievements, with the cursor anywhere", () => {
    for (const n of [26, 27, 40, 100]) {
      for (const cursor of [0, 13, 26, n - 1]) {
        const t = texts(record(make(n), cursor));
        for (const h of [SYNC_HINT, THINGS_HINT, OUTFITS_HINT, TRANSFER_HINT]) expect(t, `${n}/${cursor}`).toContain(h);
      }
    }
  });

  it("never draws a row into the hint line or the footer", () => {
    for (const n of [27, 40, 100]) {
      for (const cursor of [0, 26, n - 1]) {
        const rows = listRows({ achievements: make(n), unlocked: () => false, cursor, message: null });
        expect(rows.length).toBeLessThanOrEqual(26);
        expect(rows.some((r) => r.index === cursor)).toBe(true);
        for (const r of rows) expect(r.rect.y + r.rect.h).toBeLessThanOrEqual(LIST_LAYOUT.footerTop - 9);
      }
    }
  });

  it("shows the page label only when there is more than one page", () => {
    const v = (n: number, cursor: number): ListView => ({ achievements: make(n), unlocked: () => false, cursor, message: null });
    expect(desktopPageLabel(v(26, 0))).toBeNull();
    expect(desktopPageLabel(v(27, 0))).toBe("PAGE 1/2");
    expect(desktopPageLabel(v(27, 26))).toBe("PAGE 2/2");
    expect(texts(record(make(27), 26))).toContain("PAGE 2/2");
  });

  it("reaches every achievement by moving the cursor, one page at a time", () => {
    const seen = new Set<number>();
    for (let c = 0; c < 60; c++) for (const r of listRows({ achievements: make(60), unlocked: () => false, cursor: c, message: null })) seen.add(r.index);
    expect(seen.size).toBe(60);
  });

  // The 224-wide look at the pause screen never happens in the game (the pause screen switches the phone to the
  // 320 x 192 picture, `fullPictureWhen`); these guard the width the game does use.
  it("keeps the header clear of the legend and the voice label inside its touch button, at 320 wide", () => {
    const header = 6 + textWidth(PRODUCT_NAME) + 8 + textWidth("0/99") + 8 + textWidth("PAGE 9/9");
    const legendLeft = VIEW.width - 6 - textWidth(LEGEND_TEXT) - 9 - 3;
    expect(header).toBeLessThan(legendLeft);
    const buttonW = Math.floor((VIEW.width - 12 - 2) / 2);
    for (const label of ["DIALOG VOICE: BEEP", "DIALOG VOICE: LETTERS"]) expect(textWidth(label) + 8).toBeLessThanOrEqual(buttonW);
  });

  it("still fits the real list", () => {
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(26);
    expect(VIEW.width).toBeGreaterThan(0);
  });
});
