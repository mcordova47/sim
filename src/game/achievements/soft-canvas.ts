// A tiny software canvas for tests and review renders (issue 117b): fillRect, nearest-neighbour
// drawImage, putImageData, a rectangular clip and save/restore, enough for the game's pixel drawing and
// the bitmap font. Not used by the game. `installSoftDocument` makes `document.createElement("canvas")`
// return one, so the real `drawText` and `drawPic` run unchanged.

import { COLOR } from "../../render/colors";

type Clip = { x0: number; y0: number; x1: number; y1: number };

function parseColor(c: string): [number, number, number, number] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`soft canvas: cannot read colour ${c}`);
  const [r, g, b, a = 1] = m[1].split(",").map(Number);
  return [r, g, b, Math.round(a * 255)];
}

export class SoftCanvas {
  data: Uint8ClampedArray;
  private ctx: SoftContext | null = null;
  private w: number;
  private h: number;
  constructor(width = 300, height = 150) {
    this.w = width;
    this.h = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
  // Like a real canvas, setting a size makes it a new blank bitmap.
  get width() {
    return this.w;
  }
  set width(v: number) {
    this.w = v;
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
  }
  get height() {
    return this.h;
  }
  set height(v: number) {
    this.h = v;
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
  }
  getContext(): SoftContext {
    return (this.ctx ??= new SoftContext(this));
  }
  pixel(x: number, y: number): string {
    const i = (y * this.width + x) * 4;
    const [r, g, b] = this.data.subarray(i, i + 3);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
}

export class SoftContext {
  fillStyle: string = COLOR.ink;
  imageSmoothingEnabled = true;
  private bounds: Clip;
  private stack: Clip[] = [];
  private path: Clip | null = null;
  constructor(private canvas: SoftCanvas) {
    this.bounds = { x0: 0, y0: 0, x1: canvas.width, y1: canvas.height };
  }
  save() {
    this.stack.push({ ...this.bounds });
  }
  restore() {
    this.bounds = this.stack.pop() ?? this.bounds;
  }
  beginPath() {
    this.path = null;
  }
  rect(x: number, y: number, w: number, h: number) {
    this.path = { x0: x, y0: y, x1: x + w, y1: y + h };
  }
  clip() {
    if (!this.path) return;
    const p = this.path;
    this.bounds = { x0: Math.max(this.bounds.x0, p.x0), y0: Math.max(this.bounds.y0, p.y0), x1: Math.min(this.bounds.x1, p.x1), y1: Math.min(this.bounds.y1, p.y1) };
  }
  private put(x: number, y: number, [r, g, b, a]: [number, number, number, number]) {
    if (x < this.bounds.x0 || y < this.bounds.y0 || x >= this.bounds.x1 || y >= this.bounds.y1) return;
    const d = this.canvas.data;
    const i = (y * this.canvas.width + x) * 4;
    if (a === 255) d.set([r, g, b, 255], i);
    else if (a > 0) {
      const t = a / 255;
      d[i] = r * t + d[i] * (1 - t);
      d[i + 1] = g * t + d[i + 1] * (1 - t);
      d[i + 2] = b * t + d[i + 2] * (1 - t);
      d[i + 3] = 255;
    }
  }
  fillRect(x: number, y: number, w: number, h: number) {
    const col = parseColor(this.fillStyle);
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.put(xx, yy, col);
  }
  drawImage(src: SoftCanvas, dx: number, dy: number, dw = src.width, dh = src.height) {
    for (let yy = 0; yy < dh; yy++) {
      for (let xx = 0; xx < dw; xx++) {
        const sx = Math.floor((xx * src.width) / dw);
        const sy = Math.floor((yy * src.height) / dh);
        const i = (sy * src.width + sx) * 4;
        this.put(Math.round(dx) + xx, Math.round(dy) + yy, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
    }
  }
  createImageData(w: number, h: number) {
    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
  }
  putImageData(img: { width: number; height: number; data: Uint8ClampedArray }, x: number, y: number) {
    this.canvas.data.set(img.data, 0);
    void x;
    void y;
  }
}

// Makes `document.createElement("canvas")` return a SoftCanvas. Returns a function that restores the old one.
export function installSoftDocument(): () => void {
  const g = globalThis as unknown as { document?: unknown };
  const old = g.document;
  g.document = { createElement: () => new SoftCanvas() };
  return () => {
    g.document = old;
  };
}
