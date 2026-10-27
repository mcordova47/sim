import { afterEach, describe, expect, it, vi } from "vitest";
import { createScreen, desktopScale, fitScale, pictureArea, PORTRAIT_CONTROLS_HEIGHT } from "./canvas";

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
  it("portrait leaves room for the controls, landscape takes the whole viewport, both inside the insets", () => {
    const p = pictureArea(390, 844, { top: 47, right: 0, bottom: 34, left: 0 });
    expect(p).toEqual({ width: 390, height: 844 - 47 - 34 - PORTRAIT_CONTROLS_HEIGHT, portrait: true });
    const l = pictureArea(844, 390, { top: 0, right: 47, bottom: 21, left: 47 });
    expect(l).toEqual({ width: 750, height: 369, portrait: false });
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
