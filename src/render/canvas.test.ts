import { afterEach, describe, expect, it, vi } from "vitest";
import { createScreen, desktopScale, fitScale, landscapeLayout, LANDSCAPE, pictureArea, PORTRAIT_CONTROLS_HEIGHT, rectsOverlap } from "./canvas";
import { NARROW_VIEW } from "../game/config";

// docs/mobile.md section 2.1: the sizes for the phones in the note.
describe("fitScale", () => {
  const css = (w: number, h: number, dpr: number) => {
    const f = fitScale(w, h, dpr);
    return [f.scaleDev, Math.round(f.cssWidth), Math.round(f.cssHeight)];
  };
  it("matches the note's portrait rows (width limited)", () => {
    expect(css(375, 553, 2)).toEqual([2, 320, 192]); // SE class, 1.00
    expect(css(360, 740, 3)).toEqual([3, 320, 192]); // Android 360
    expect(css(390, 763, 3)).toEqual([3, 320, 192]); // iPhone 14 standalone
    expect(css(390, 664, 3)).toEqual([3, 320, 192]); // iPhone 14 in Safari
    expect(css(430, 839, 3)).toEqual([4, 427, 256]); // Pro Max, 1.33
    expect(css(412, 915, 2.625)).toEqual([3, 366, 219]); // Pixel, fractional DPR
  });
  it("matches the landscape rows", () => {
    expect(css(844, 390, 3)).toEqual([6, 640, 384]);
    expect(css(750, 369, 3)).toEqual([5, 533, 320]);
  });
  it("backing store is whole device pixels per game pixel", () => {
    const f = fitScale(430, 839, 3);
    expect([f.backingWidth, f.backingHeight]).toEqual([1280, 768]);
    expect(f.cssWidth * 3).toBeCloseTo(f.backingWidth);
  });
  it("never goes below 1 (a too-small window is cropped, never zero or NaN)", () => {
    expect(fitScale(100, 50, 3).scaleDev).toBe(1);
    expect(fitScale(0, 0, 2).scaleDev).toBe(1);
    expect(fitScale(-5, 300, 2).scaleDev).toBe(1);
    expect(fitScale(Number.NaN, 300, 2).scaleDev).toBe(1);
    expect(fitScale(400, 400, 0).scaleDev).toBe(1);
  });
});

describe("pictureArea", () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  it("portrait leaves room for the controls, landscape leaves a column at each side, both inside the insets", () => {
    const p = pictureArea(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    expect(p).toEqual({ width: 390, height: 844 - 47 - 34 - PORTRAIT_CONTROLS_HEIGHT, portrait: true });
    const l = pictureArea(844, 390, { top: 0, right: 47, bottom: 21, left: 47 });
    expect(l).toEqual({ width: 750 - 2 * LANDSCAPE.side, height: 369, portrait: false });
    expect(pictureArea(10, 10, { top: 20, right: 20, bottom: 20, left: 20 }, ).width).toBe(0);
    expect(pictureArea(390, 844, none).portrait).toBe(true);
  });
});

describe("desktop is unchanged", () => {
  it("uses the largest whole CSS-pixel factor, at least 1", () => {
    expect(desktopScale(1920, 1080)).toBe(5);
    expect(desktopScale(1280, 720)).toBe(3);
    expect(desktopScale(300, 100)).toBe(1);
  });
});

// A bare-bones page, enough for createScreen.
function fakePage(width: number, height: number) {
  const mk = () => {
    const ctx = { imageSmoothingEnabled: true, drawImage: vi.fn() };
    return { width: 0, height: 0, style: {} as Record<string, string>, getContext: () => ctx, ctx };
  };
  const listeners: Record<string, Array<() => void>> = {};
  vi.stubGlobal("document", {
    createElement: () => mk(),
    body: { appendChild() {}, },
  });
  vi.stubGlobal("window", {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 3,
    addEventListener: (t: string, f: () => void) => (listeners[t] = [...(listeners[t] ?? []), f]),
  });
  vi.stubGlobal("getComputedStyle", () => ({ paddingTop: "0px", paddingRight: "0px", paddingBottom: "0px", paddingLeft: "0px" }));
  return mk();
}

describe("createScreen without touch", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("is a 320 x 192 canvas at a whole CSS-pixel factor, drawing straight onto it, with nothing to present", () => {
    const canvas = fakePage(1280, 720);
    const screen = createScreen(canvas as unknown as HTMLCanvasElement);
    expect([canvas.width, canvas.height]).toEqual([320, 192]);
    expect([canvas.style.width, canvas.style.height]).toEqual(["960px", "576px"]);
    expect(screen.ctx).toBe(canvas.ctx);
    screen.present();
    expect(canvas.ctx.drawImage).not.toHaveBeenCalled();
    expect(canvas.ctx.imageSmoothingEnabled).toBe(false);
  });
  it("in touch mode draws into an offscreen 320 x 192 and presents it onto a device-pixel canvas", () => {
    const canvas = fakePage(430, 932);
    const screen = createScreen(canvas as unknown as HTMLCanvasElement);
    screen.setTouch(true);
    expect(screen.ctx).not.toBe(canvas.ctx);
    expect([canvas.width, canvas.height]).toEqual([1280, 768]);
    screen.present();
    expect(canvas.ctx.drawImage).toHaveBeenCalledTimes(1);
    // Back to the desktop fit.
    screen.setTouch(false);
    expect([canvas.width, canvas.height]).toEqual([320, 192]);
    expect(screen.ctx).toBe(canvas.ctx);
  });
});

// Issue 092: in landscape no control overlaps the picture.
describe("landscapeLayout", () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };
  const sizes: Array<[string, number, number, { top: number; right: number; bottom: number; left: number }, number]> = [
    ["iPhone 14 full 844x390", 844, 390, none, 3],
    ["iPhone 14 Safari bars 844x340", 844, 340, none, 3],
    ["iPhone 14 standalone with insets", 844, 390, { top: 0, right: 47, bottom: 21, left: 47 }, 3],
    ["iPhone Pro Max 932x430", 932, 430, none, 3],
    ["Pro Max Safari bars 932x380", 932, 380, none, 3],
    ["Pro Max with insets", 932, 430, { top: 0, right: 59, bottom: 21, left: 59 }, 3],
    ["iPhone SE 667x375", 667, 375, none, 2],
    ["Android 800x360", 800, 360, none, 3],
    ["Pixel 915x412", 915, 412, none, 2.625],
    ["small 568x320", 568, 320, none, 2],
  ];
  for (const view of [{ width: 320, height: 192 }, NARROW_VIEW]) {
    for (const [name, w, h, insets, dpr] of sizes) {
      it(`${name} (${view.width}x${view.height}): controls and picture do not intersect, all inside the page`, () => {
        const l = landscapeLayout(w, h, insets, dpr, view);
        for (const box of [l.dpad, l.face, l.pills]) {
          expect(rectsOverlap(box, l.picture)).toBe(false);
          expect(box.x).toBeGreaterThanOrEqual(insets.left - 1e-9);
          expect(box.x + box.width).toBeLessThanOrEqual(w - insets.right + 1e-9);
          expect(box.y).toBeGreaterThanOrEqual(insets.top - 1e-9);
          expect(box.y + box.height).toBeLessThanOrEqual(h - insets.bottom + 1e-9);
        }
        expect(rectsOverlap(l.face, l.pills)).toBe(false);
        expect(l.picture.x).toBeGreaterThanOrEqual(l.area.x - 1e-9);
        expect(l.picture.x + l.picture.width).toBeLessThanOrEqual(l.area.x + l.area.width + 1e-9);
        expect(l.picture.y + l.picture.height).toBeLessThanOrEqual(h - insets.bottom + 1e-9);
      });
    }
  }
  it("fits the picture at the whole device-pixel scales the note lists", () => {
    expect(landscapeLayout(844, 390, none, 3).scaleDev).toBe(5); // 1.67x, 533 x 320
    expect(landscapeLayout(932, 430, none, 3).scaleDev).toBe(6); // 2.0x, 640 x 384
    expect(landscapeLayout(844, 340, none, 3).scaleDev).toBe(5);
    expect(landscapeLayout(750, 369, none, 3).scaleDev).toBe(4); // standalone width: 1.33x
  });
  it("controls keep full size where there is room and shrink only on narrow screens", () => {
    expect(landscapeLayout(844, 390, none, 3).shrink).toBe(1);
    expect(landscapeLayout(568, 320, none, 2).shrink).toBeLessThan(1);
    expect(landscapeLayout(568, 320, none, 2).shrink).toBeGreaterThanOrEqual(LANDSCAPE.minShrink);
  });
  it("the rectangles check can fail: a picture over a control is reported", () => {
    const l = landscapeLayout(844, 390, none, 3);
    expect(rectsOverlap(l.picture, { x: l.picture.x + 10, y: l.picture.y + 10, width: 20, height: 20 })).toBe(true);
  });
});
