import { REEL_PALETTE, type Rgb } from "./palette";

// Photo reel stage A: turn a picture into a tiny palette-only one. Pure: no
// canvas, no DOM, no metadata. Mirrors art/tools/pixel-looks.html (look (a)):
// centre crop, box-average shrink, auto-levels (2nd to 98th percentile),
// Bayer 4x4 ordered dither, nearest palette colour by redmean distance.
// Output is one palette index per pixel (see palette.ts).

export const LANDSCAPE = { w: 48, h: 36 } as const;
export const PORTRAIT = { w: 36, h: 48 } as const;
// Dither strength, 0 to 100 (the look tool's slider). Marc's pick: 20.
export const DEFAULT_DITHER = 20;

export interface PixelateOptions {
  dither?: number;
  // The palette to map onto; default the game palette.
  palette?: readonly Rgb[];
}

export interface Pixelated {
  w: number;
  h: number;
  px: Uint8Array;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Centre-crop to the output aspect, then average every source pixel that lands in a cell.
function shrink(src: Uint8ClampedArray, sw: number, sh: number, w: number, h: number): Float32Array {
  const ar = w / h;
  let cw = sw;
  let ch = sw / ar;
  if (ch > sh) {
    ch = sh;
    cw = sh * ar;
  }
  const ox = (sw - cw) / 2;
  const oy = (sh - ch) / 2;
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const y0 = Math.min(sh - 1, Math.floor(oy + (y * ch) / h));
    const y1 = Math.max(y0 + 1, Math.floor(oy + ((y + 1) * ch) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.min(sw - 1, Math.floor(ox + (x * cw) / w));
      const x1 = Math.max(x0 + 1, Math.floor(ox + ((x + 1) * cw) / w));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y0; yy < y1 && yy < sh; yy++) {
        for (let xx = x0; xx < x1 && xx < sw; xx++) {
          const i = (yy * sw + xx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          n++;
        }
      }
      n = n || 1;
      const o = (y * w + x) * 3;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
    }
  }
  return out;
}

// Stretch the 2nd to 98th percentile of brightness to the full range.
function autoLevels(px: Float32Array): Float32Array {
  const n = px.length / 3;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = px[i * 3] * 0.299 + px[i * 3 + 1] * 0.587 + px[i * 3 + 2] * 0.114;
  const s = Float32Array.from(lum).sort();
  const lo = s[Math.floor(n * 0.02)];
  const hi = s[Math.min(n - 1, Math.floor(n * 0.98))];
  if (hi - lo < 8) return px;
  const k = 255 / (hi - lo);
  const out = new Float32Array(px.length);
  for (let i = 0; i < px.length; i++) out[i] = Math.min(255, Math.max(0, (px[i] - lo) * k));
  return out;
}

function redmean(a: ArrayLike<number>, b: Rgb): number {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

function toPalette(px: Float32Array, w: number, h: number, pal: readonly Rgb[], dither: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const spread = dither * 0.9;
  const v = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      const t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
      for (let k = 0; k < 3; k++) v[k] = px[o + k] + t * spread;
      let best = 0;
      let bd = Infinity;
      for (let p = 0; p < pal.length; p++) {
        const e = redmean(v, pal[p]);
        if (e < bd) {
          bd = e;
          best = p;
        }
      }
      out[y * w + x] = best;
    }
  }
  return out;
}

// rgba: width * height * 4 bytes (alpha is ignored). Portrait sources (taller
// than wide) give 36 x 48, everything else 48 x 36.
export function pixelate(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  opts: PixelateOptions = {},
): Pixelated {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("pixelate: width and height must be positive integers");
  }
  if (rgba.length < width * height * 4) throw new Error("pixelate: pixel buffer is too short");
  const shape = height > width ? PORTRAIT : LANDSCAPE;
  const dither = Math.min(100, Math.max(0, opts.dither ?? DEFAULT_DITHER));
  const levelled = autoLevels(shrink(rgba, width, height, shape.w, shape.h));
  const px = toPalette(levelled, shape.w, shape.h, opts.palette ?? REEL_PALETTE, dither);
  return { w: shape.w, h: shape.h, px };
}
