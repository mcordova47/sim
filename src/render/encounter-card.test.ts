import { afterEach, describe, expect, it, vi } from "vitest";
import { VIEW } from "../game/config";
import { ADS, CARD_WORDS, ENCOUNTER_WORDS, type Ad } from "../game/encounter-ads";
import { CARD_SPRITE, PRODUCT_SCALE, drawCard, layoutCard, productScale } from "./encounter-card";
import { menuBoxRect, textBoxRect } from "./dialog-box";
import { GLYPH_H, textWidth } from "./font";
import type { Box } from "./layout";
import type { SpriteDrawer } from "./sprites";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// Issue 043 stage B: the three cards. Every ad's card, on both pages, keeps everything inside
// the screen and out of the way of the menu and the dialog box.

const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const textBox = (t: { text: string; x: number; y: number; align?: string }): Box => {
  const w = textWidth(t.text);
  return { x: t.align === "right" ? t.x - w : t.x, y: t.y, w, h: GLYPH_H };
};

function menus(ad: Ad, details: boolean): Box[] {
  const labels = [ENCOUNTER_WORDS.ignore, CARD_WORDS[ad.card].unsubscribe, ...(details ? [] : [ENCOUNTER_WORDS.closer]), ENCOUNTER_WORDS.cart];
  // The menu over the first page has the narrator's box under it; the second page has no prompt.
  return [menuBoxRect(labels, !details), textBoxRect()];
}

describe("the card layout", () => {
  for (const ad of ADS) {
    for (const details of [false, true]) {
      it(`${ad.id}${details ? " (look closer)" : ""}: everything is on screen and clear of the menu and the dialog box`, () => {
        const layout = layoutCard(ad, details);
        const boxes: [string, Box][] = [
          ...layout.texts.map((t): [string, Box] => [t.text, textBox(t)]),
          ["button", layout.button.box],
          ["picture", layout.picture],
          ...(layout.bubble ? [["bubble", layout.bubble] as [string, Box]] : []),
        ];
        for (const [what, box] of boxes) {
          expect(box.x, what).toBeGreaterThanOrEqual(0);
          expect(box.y, what).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w, what).toBeLessThanOrEqual(VIEW.width);
          expect(box.y + box.h, what).toBeLessThanOrEqual(VIEW.height);
          for (const m of menus(ad, details)) expect(overlap(box, m), `${what} under the menu or dialog box`).toBe(false);
        }
        // The button's text fits inside it.
        expect(textWidth(layout.button.text) + 2).toBeLessThanOrEqual(layout.button.box.w);
      });
    }
  }

  it("the email card puts the sender, subject, the body and the button in reading order", () => {
    const ad = ADS.find((a) => a.card === "email")!;
    const { texts, button } = layoutCard(ad, false);
    const at = (s: string) => texts.find((t) => t.text === s)!;
    expect(at(ad.from!).y).toBeLessThan(at(ad.headline).y);
    expect(at(ad.headline).y).toBeLessThan(at(ad.body[0]).y);
    expect(at(ad.body[0]).y).toBeLessThan(button.box.y);
    // The second page swaps the body for the details.
    const closer = layoutCard(ad, true).texts.map((t) => t.text);
    for (const line of ad.closer) expect(closer).toContain(line);
    for (const line of ad.body) expect(closer).not.toContain(line);
  });

  it("the three templates exist as art", () => {
    for (const name of Object.values(CARD_SPRITE)) expect(`/public/sprites/${name}.png` in spriteFiles, name).toBe(true);
    expect(Object.keys(CARD_SPRITE).sort()).toEqual(["email", "social", "text"]);
  });
});

// The pixel font makes its glyphs on small canvases.
const stubDocument = () =>
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
  });
afterEach(() => vi.unstubAllGlobals());

describe("the product picture", () => {
  it("is the item's own sprite scaled by whole numbers, at most 3x", () => {
    const wide = { x: 0, y: 0, w: 100, h: 52 };
    expect(productScale(16, 16, wide)).toBe(PRODUCT_SCALE);
    expect(productScale(32, 16, wide)).toBe(PRODUCT_SCALE);
    expect(productScale(16, 16, { x: 0, y: 0, w: 70, h: 52 })).toBe(3);
    expect(productScale(32, 16, { x: 0, y: 0, w: 70, h: 52 })).toBe(2);
    // Too small an area still draws it, at 1x.
    expect(productScale(32, 16, { x: 0, y: 0, w: 10, h: 10 })).toBe(1);
    expect(productScale(0, 0, wide)).toBe(PRODUCT_SCALE);
  });

  it("is drawn through drawRegion at that whole-number scale, inside its area, after the template and before the text", () => {
    stubDocument();
    const order: string[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name) => void order.push(`draw ${name}`),
      drawRegion: (_c, name, from, into) => void order.push(`region ${name} ${from.w}x${from.h} -> ${into.width}x${into.height}`),
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    const ad = ADS.find((a) => a.item === "art-robin")!;
    drawCard(ctx, { ad, details: false, product: { sprite: "art-robin", w: 32, h: 16 }, sprites });
    expect(order).toEqual(["draw view-ad-social", "region art-robin 32x16 -> 96x48"]);
    order.length = 0;
    const candle = ADS.find((a) => a.item === "lamp-candle")!;
    drawCard(ctx, { ad: candle, details: true, product: { sprite: "lamp-candle", w: 16, h: 16 }, sprites });
    expect(order).toEqual(["draw view-ad-email", "region lamp-candle 16x16 -> 48x48"]);
  });

  it("without the template or the item's art (tests, a missing file) the card still draws", () => {
    stubDocument();
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, n: string) => () => void calls.push(`${n}`), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const ad of ADS) {
      calls.length = 0;
      expect(() => drawCard(ctx, { ad, details: false, product: { sprite: "nope", w: 16, h: 16 } })).not.toThrow();
      expect(() => drawCard(ctx, { ad, details: true, product: { sprite: "nope", w: 16, h: 16 }, sprites: { has: () => false, draw: () => {} } })).not.toThrow();
      expect(calls.length).toBeGreaterThan(10);
    }
  });
});
