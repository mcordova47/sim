import { describe, expect, it } from "vitest";
import palette from "../../../art/palette.json";
import { REEL_PALETTE, REEL_PALETTE_VERSION } from "./palette";
import { DEFAULT_DITHER, LANDSCAPE, PORTRAIT, pixelate } from "./pixelate";

// Synthetic images only. Never read a real photo into a test.

type Fn = (x: number, y: number) => [number, number, number];

function image(w: number, h: number, f: Fn): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  return d;
}

const flat = (c: [number, number, number]): Fn => () => c;

describe("reel palette", () => {
  it("has the 22 game colours in file order", () => {
    expect(REEL_PALETTE.length).toBe(22);
    expect(REEL_PALETTE_VERSION).toBe(1);
    const hexes = Object.values(palette.colors).map((c) => c.hex);
    hexes.forEach((hex, i) => {
      const n = parseInt(hex.slice(1), 16);
      expect(REEL_PALETTE[i]).toEqual([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    });
  });
});

describe("pixelate size and shape", () => {
  it("landscape gives 48 x 36", () => {
    const r = pixelate(image(200, 100, flat([90, 90, 90])), 200, 100);
    expect([r.w, r.h, r.px.length]).toEqual([48, 36, 1728]);
  });
  it("portrait gives 36 x 48", () => {
    const r = pixelate(image(100, 200, flat([90, 90, 90])), 100, 200);
    expect([r.w, r.h, r.px.length]).toEqual([PORTRAIT.w, PORTRAIT.h, 1728]);
  });
  it("square counts as landscape", () => {
    const r = pixelate(image(64, 64, flat([90, 90, 90])), 64, 64);
    expect([r.w, r.h]).toEqual([LANDSCAPE.w, LANDSCAPE.h]);
  });
  it("handles sources smaller than the target, down to 1 x 1", () => {
    for (const [w, h] of [
      [1, 1],
      [3, 2],
      [2, 3],
      [10, 5],
      [47, 35],
      [1, 500],
      [500, 1],
    ]) {
      const r = pixelate(image(w, h, (x, y) => [x * 20, y * 20, 100]), w, h);
      expect(r.px.length).toBe(r.w * r.h);
      expect(r.px.every((v) => v >= 0 && v < 22)).toBe(true);
    }
  });
  it("rejects bad sizes and short buffers", () => {
    expect(() => pixelate(new Uint8ClampedArray(4), 0, 1)).toThrow();
    expect(() => pixelate(new Uint8ClampedArray(4), 1.5, 1)).toThrow();
    expect(() => pixelate(new Uint8ClampedArray(8), 2, 2)).toThrow();
  });
});

describe("pixelate colours", () => {
  it("a flat palette colour gives one index everywhere (even with dither)", () => {
    REEL_PALETTE.forEach((c, i) => {
      const r = pixelate(image(96, 72, flat([...c])), 96, 72);
      // A flat image is under the auto-levels threshold, so nothing is stretched.
      expect(new Set(r.px).size).toBe(1);
      expect(r.px[0]).toBe(i);
    });
  });
  it("without dither a flat image is exactly the nearest colour", () => {
    const r = pixelate(image(96, 72, flat([240, 240, 245])), 96, 72, { dither: 0 });
    expect(new Set(r.px)).toEqual(new Set([5])); // paper
  });
  it("every index is a real palette entry", () => {
    const r = pixelate(image(300, 200, (x, y) => [x % 256, (y * 3) % 256, (x + y) % 256]), 300, 200);
    for (const v of r.px) expect(REEL_PALETTE[v]).toBeDefined();
  });
  it("is deterministic and does not touch its input", () => {
    const src = image(120, 90, (x, y) => [x * 2, y * 2, (x * y) % 256]);
    const copy = Uint8ClampedArray.from(src);
    const a = pixelate(src, 120, 90);
    const b = pixelate(src, 120, 90);
    expect(Array.from(a.px)).toEqual(Array.from(b.px));
    expect(Array.from(src)).toEqual(Array.from(copy));
  });
  it("ignores alpha and any bytes past the pixels", () => {
    const src = image(48, 36, (x, y) => [x * 5, y * 7, 50]);
    const longer = new Uint8ClampedArray(src.length + 16);
    longer.set(src);
    const withAlpha = Uint8ClampedArray.from(src);
    for (let i = 3; i < withAlpha.length; i += 4) withAlpha[i] = 0;
    const base = Array.from(pixelate(src, 48, 36).px);
    expect(Array.from(pixelate(longer, 48, 36).px)).toEqual(base);
    expect(Array.from(pixelate(withAlpha, 48, 36).px)).toEqual(base);
  });
  it("a black to white gradient is monotonic in brightness, left to right", () => {
    const w = 480;
    const r = pixelate(image(w, 360, (x) => [(x / (w - 1)) * 255, (x / (w - 1)) * 255, (x / (w - 1)) * 255]), w, 360, {
      dither: 0,
    });
    const lum = (i: number) => REEL_PALETTE[i][0] * 0.299 + REEL_PALETTE[i][1] * 0.587 + REEL_PALETTE[i][2] * 0.114;
    // Rows are identical with no dither; palette luminance of the row never drops by much.
    let prev = -1;
    let drops = 0;
    for (let x = 0; x < r.w; x++) {
      const l = lum(r.px[x]);
      if (l < prev - 30) drops++;
      prev = Math.max(prev, l);
    }
    expect(drops).toBe(0);
    expect(lum(r.px[0])).toBeLessThan(lum(r.px[r.w - 1]));
    expect(r.px[0]).toBe(0); // ink
    expect(r.px[r.w - 1]).toBe(5); // paper
    for (let y = 1; y < r.h; y++) {
      expect(Array.from(r.px.slice(y * r.w, (y + 1) * r.w))).toEqual(Array.from(r.px.slice(0, r.w)));
    }
  });
  it("dithering a flat mid-grey uses only a few neighbouring colours", () => {
    // Between two palette colours: the dither may mix them but nothing else.
    const mid = REEL_PALETTE[3].map((v, k) => Math.round((v + REEL_PALETTE[4][k]) / 2)) as [number, number, number];
    const r = pixelate(image(96, 72, flat(mid)), 96, 72, { dither: 100 });
    expect(new Set(r.px).size).toBeLessThanOrEqual(3);
  });
  it("dither strength 0 gives a flat result with no checker pattern", () => {
    const src = image(96, 72, (x) => [100 + x / 4, 100 + x / 4, 100 + x / 4]);
    const r = pixelate(src, 96, 72, { dither: 0 });
    for (let y = 1; y < r.h; y++) {
      expect(Array.from(r.px.slice(y * r.w, (y + 1) * r.w))).toEqual(Array.from(r.px.slice(0, r.w)));
    }
  });
  it("dither changes a gradient but the default is the documented 20", () => {
    expect(DEFAULT_DITHER).toBe(20);
    const src = image(192, 144, (x) => [60 + x / 2, 60 + x / 2, 60 + x / 2]);
    const a = pixelate(src, 192, 144, { dither: 0 });
    const b = pixelate(src, 192, 144);
    const c = pixelate(src, 192, 144, { dither: DEFAULT_DITHER });
    expect(Array.from(b.px)).toEqual(Array.from(c.px));
    expect(Array.from(a.px)).not.toEqual(Array.from(b.px));
  });
  it("out-of-range dither is clamped", () => {
    const src = image(96, 72, (x) => [x * 2, x * 2, x * 2]);
    expect(Array.from(pixelate(src, 96, 72, { dither: 500 }).px)).toEqual(
      Array.from(pixelate(src, 96, 72, { dither: 100 }).px),
    );
    expect(Array.from(pixelate(src, 96, 72, { dither: -5 }).px)).toEqual(
      Array.from(pixelate(src, 96, 72, { dither: 0 }).px),
    );
  });
});

describe("pixelate levels and crop", () => {
  it("auto-levels stretch a low-contrast picture to use dark and light", () => {
    const r = pixelate(image(96, 72, (x) => [100 + x / 2, 100 + x / 2, 100 + x / 2]), 96, 72, { dither: 0 });
    const used = new Set(r.px);
    expect(used.size).toBeGreaterThan(3);
    expect(r.px[0]).toBe(0);
    expect(r.px[r.w - 1]).toBe(5);
  });
  it("leaves an already full-range image alone", () => {
    const w = 96;
    const f: Fn = (x) => [(x / (w - 1)) * 255, (x / (w - 1)) * 255, (x / (w - 1)) * 255];
    const a = pixelate(image(w, 72, f), w, 72, { dither: 0 });
    const b = pixelate(image(w, 72, f), w, 72, { dither: 0 });
    expect(Array.from(a.px)).toEqual(Array.from(b.px));
    expect(a.px[0]).toBe(0);
    expect(a.px[a.w - 1]).toBe(5);
  });
  it("crops from the centre: a centre marker survives, an edge marker is cut", () => {
    // 4:3 output from a wide 400 x 100 source keeps the middle 133 columns.
    const w = 400;
    const h = 100;
    const src = image(w, h, (x, y) => {
      if (x >= 190 && x < 210 && y >= 40 && y < 60) return [255, 255, 255];
      if (x < 20) return [255, 255, 255];
      return [0, 0, 0];
    });
    const r = pixelate(src, w, h, { dither: 0 });
    const idx = (x: number, y: number) => r.px[y * r.w + x];
    expect(idx(24, 18)).toBe(5); // paper in the middle
    for (let y = 0; y < r.h; y++) expect(idx(0, y)).toBe(0); // the edge marker is gone
  });
  it("crops a tall source from the centre vertically", () => {
    const w = 100;
    const h = 400;
    const src = image(w, h, (_x, y) => (y < 20 ? [255, 255, 255] : [0, 0, 0]));
    const r = pixelate(src, w, h, { dither: 0 });
    for (let x = 0; x < r.w; x++) expect(r.px[x]).toBe(0); // top row is dark: the white strip was cropped
  });
  it("a custom palette is honoured", () => {
    const r = pixelate(image(96, 72, flat([200, 0, 0])), 96, 72, {
      dither: 0,
      palette: [
        [0, 0, 0],
        [255, 0, 0],
      ],
    });
    expect(new Set(r.px)).toEqual(new Set([1]));
  });
});
