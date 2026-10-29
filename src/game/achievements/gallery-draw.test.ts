import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COLOR } from "../../render/colors";
import { DESKTOP_VIEW, NARROW_VIEW } from "../config";
import { closeupLayout, gridLayout, manageGallery, move, sceneGallery, type GalleryMode } from "../reel/gallery";
import { syntheticPic } from "../reel/synthetic-pic";
import { drawCloseup, drawGrid, drawPhone, drawPhoneFoot } from "./gallery-draw";
import { SoftCanvas, installSoftDocument } from "./soft-canvas";

let restore: () => void;
beforeEach(() => {
  restore = installSoftDocument();
});
afterEach(() => restore());

const views = [["wide", DESKTOP_VIEW], ["narrow", NARROW_VIEW]] as const;
const pics = (n: number, w = 48, h = 36) => Array.from({ length: n }, (_, i) => syntheticPic(w, h, i));
const canvas = (v: { width: number; height: number }) => new SoftCanvas(v.width, v.height);
const count = (c: SoftCanvas, color: string, r: { x: number; y: number; w: number; h: number }) => {
  let n = 0;
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (c.pixel(x, y) === color) n++;
  return n;
};

describe.each(views)("gallery drawing, %s view", (_name, view) => {
  for (const mode of ["manage", "scene"] as GalleryMode[]) {
    it(`${mode}: the highlight is drawn on the highlighted cell only, in butter`, () => {
      const c = canvas(view);
      const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
      ctx.fillStyle = COLOR.night;
      ctx.fillRect(0, 0, view.width, view.height);
      const layout = gridLayout({ mode, screen: view, line: "A line." });
      let g = manageGallery(pics(6));
      g = move(g, "right");
      if (mode === "scene") drawPhone(ctx, layout);
      drawGrid(ctx, g, layout, mode);
      const cell = layout.cells[1];
      expect(c.pixel(cell.x, cell.y)).toBe(COLOR.butter);
      expect(c.pixel(cell.x + cell.w - 1, cell.y + cell.h - 1)).toBe(COLOR.butter);
      const other = layout.cells[0];
      // (a picture may use the butter colour inside; the frame is the cell's outer two pixels)
      expect(c.pixel(other.x, other.y)).not.toBe(COLOR.butter);
      expect(c.pixel(other.x + other.w - 1, other.y + other.h - 1)).not.toBe(COLOR.butter);
    });
  }

  it("an empty cell on a short page is drawn plain and gets no highlight", () => {
    const c = canvas(view);
    const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
    const layout = gridLayout({ mode: "manage", screen: view });
    drawGrid(ctx, manageGallery(pics(2)), layout, "manage");
    const empty = layout.cells[4];
    expect(count(c, COLOR.ink, empty)).toBe(empty.w * empty.h);
  });

  it("draws every picture inside its own cell, and a thumbnail does not spill into the gap", () => {
    const c = canvas(view);
    const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
    const layout = gridLayout({ mode: "manage", screen: view });
    // Portraits, which are cut to the cell on the wide view.
    drawGrid(ctx, manageGallery(pics(6, 36, 48)), layout, "manage");
    const gapX = layout.cells[0].x + layout.cells[0].w;
    for (let y = layout.cells[0].y; y < layout.cells[0].y + layout.cells[0].h; y++) expect(c.pixel(gapX, y)).toBe("#000000");
    const gapY = layout.cells[0].y + layout.cells[0].h;
    for (let x = layout.cells[0].x; x < layout.cells[0].x + layout.cells[0].w; x++) expect(c.pixel(x, gapY)).toBe("#000000");
  });

  it("scene mode draws the phone: a paper bezel round an ink screen, and nothing outside the panel", () => {
    const c = canvas(view);
    const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
    const layout = gridLayout({ mode: "scene", screen: view, line: "You scroll for a while, because why not." });
    drawPhone(ctx, layout);
    drawGrid(ctx, sceneGallery(pics(6), () => 0.3), layout, "scene");
    drawPhoneFoot(ctx, layout);
    const p = layout.phone!.panel;
    expect(c.pixel(p.x, p.y)).toBe(COLOR.paper);
    expect(c.pixel(p.x + p.w - 1, p.y + p.h - 1)).toBe(COLOR.paper);
    expect(c.pixel(p.x - 1, p.y)).toBe("#000000");
    expect(c.pixel(p.x + p.w, p.y + p.h - 1)).toBe("#000000");
    expect(c.pixel(p.x + 4, p.y + 4)).toBe(COLOR.ink);
  });

  it("the close-up paints the picture at its whole scale and keeps clear of the view's edge", () => {
    for (const mode of ["manage", "scene"] as GalleryMode[]) {
      const c = canvas(view);
      const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
      const pic = syntheticPic(48, 36, 3);
      const l = closeupLayout({ mode, screen: view, pic, caption: "Ah, memories." });
      drawCloseup(ctx, l, pic, { hint: "E: DONE", foot: { text: "ESC: BACK" } });
      // The marker in the picture's top-left corner is 6 source pixels: a whole-scale block.
      const marker = 6 * l.scale;
      expect(count(c, "#" + "000000", l.pic)).toBe(0);
      expect(c.pixel(l.pic.x + 1, l.pic.y + marker - 1)).not.toBe(c.pixel(l.pic.x + marker + 1, l.pic.y + marker + 1));
    }
  });
});
