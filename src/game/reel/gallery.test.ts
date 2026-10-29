import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  cellsOnPage,
  close,
  closeupLayout,
  closeupScale,
  gridLayout,
  hasNextPage,
  hasPrevPage,
  indexAt,
  manageGallery,
  move,
  open,
  others,
  pageCount,
  pageLabel,
  sceneGallery,
  tapCell,
  thumbWindow,
  withPics,
  type Gallery,
  type PicSize,
} from "./gallery";

// Synthetic sizes only: no picture, pixels or file are involved in the pure core.
const WIDE = { width: 320, height: 192 };
const NARROW = { width: 224, height: 208 };
const SIZES = {
  crisp: { w: 64, h: 48 },
  soft: { w: 48, h: 36 },
  chunky: { w: 32, h: 24 },
};
const portrait = (s: PicSize): PicSize => ({ w: s.h, h: s.w });
const pics = (n: number, s: PicSize = SIZES.soft): Array<PicSize & { id: number }> => Array.from({ length: n }, (_, i) => ({ ...s, id: i }));
const inside = (r: { x: number; y: number; w: number; h: number }, v: { width: number; height: number }) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= v.width && r.y + r.h <= v.height;
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("state and paging", () => {
  it("counts pages of six, at least one", () => {
    expect([0, 1, 6, 7, 12, 13].map(pageCount)).toEqual([1, 1, 1, 2, 2, 3]);
    expect(cellsOnPage(7, 1)).toBe(1);
    expect(cellsOnPage(7, 0)).toBe(6);
  });

  it("manage mode lists newest first", () => {
    const g = manageGallery(pics(3));
    expect(g.pics.map((p) => (p as { id: number }).id)).toEqual([2, 1, 0]);
    expect(g.view).toBe("grid");
    expect(indexAt(g)).toBe(0);
  });

  it("moves by one and by a row, turns the page at its edges and stops at the ends", () => {
    let g = manageGallery(pics(14));
    g = move(g, "right");
    g = move(g, "right");
    expect(g.cursor).toBe(2);
    g = move(g, "down");
    expect([g.page, g.cursor]).toEqual([0, 5]);
    g = move(g, "right"); // past the last cell: next page
    expect([g.page, g.cursor]).toEqual([1, 0]);
    g = move(g, "left"); // and back
    expect([g.page, g.cursor]).toEqual([0, 5]);
    g = move(g, "down"); // past the bottom row: next page, same column
    expect([g.page, g.cursor]).toEqual([1, 2]);
    g = move(g, "up");
    expect([g.page, g.cursor]).toEqual([0, 5]);
    const start = manageGallery(pics(14));
    expect(move(start, "left")).toBe(start);
    expect(move(start, "up")).toBe(start);
    const end = { ...start, page: 2, cursor: 1 }; // the 14th picture
    expect(move(end, "right")).toBe(end);
    expect(move(end, "down")).toBe(end);
  });

  it("never rests on an empty cell of a short page", () => {
    let g: Gallery = manageGallery(pics(8)); // page 2 holds two
    g = { ...g, page: 1, cursor: 1 };
    expect(move(g, "right")).toBe(g);
    expect(move(g, "down")).toBe(g);
    const four = manageGallery(pics(4));
    const m = move({ ...four, cursor: 2 }, "down"); // 2 + 3 = 5 is empty: the last picture
    expect(indexAt(m)).toBe(3);
    expect(move({ ...four, cursor: 3 }, "down")).toEqual({ ...four, cursor: 3 });
    for (const n of [1, 2, 5, 6, 7, 13]) {
      let c: Gallery = manageGallery(pics(n));
      for (const d of ["right", "down", "down", "left", "down", "right", "right", "up"] as const) {
        c = move(c, d);
        expect(indexAt(c)).not.toBeNull();
      }
    }
  });

  it("an empty gallery does nothing and opens nothing", () => {
    const g = manageGallery([]);
    expect(move(g, "right")).toBe(g);
    expect(open(g)).toBe(g);
    expect(indexAt(g)).toBeNull();
    expect(tapCell(g, 0)).toBe(g);
  });

  it("one page has no arrows; several do, only where there is somewhere to go", () => {
    expect([hasPrevPage(manageGallery(pics(6))), hasNextPage(manageGallery(pics(6)))]).toEqual([false, false]);
    const g = manageGallery(pics(13));
    expect([hasPrevPage(g), hasNextPage(g)]).toEqual([false, true]);
    const last = { ...g, page: 2 };
    expect([hasPrevPage(last), hasNextPage(last)]).toEqual([true, false]);
    expect(pageLabel(last)).toBe("PAGE 3 OF 3");
  });

  it("opens, closes, flips to the others in a close-up, and stops at the ends", () => {
    let g = open(manageGallery(pics(8)));
    expect(g.view).toBe("closeup");
    g = others(g, 1);
    expect(indexAt(g)).toBe(1);
    expect(g.view).toBe("closeup");
    expect(others(g, -1).cursor).toBe(0);
    const first = open(manageGallery(pics(3)));
    expect(others(first, -1)).toBe(first);
    const lastPic = { ...first, cursor: 2 };
    expect(others(lastPic, 1)).toBe(lastPic);
    const seven = { ...open(manageGallery(pics(7))), cursor: 5 };
    expect(others(seven, 1)).toMatchObject({ page: 1, cursor: 0 });
    expect(close(g).view).toBe("grid");
  });

  it("taps: an empty cell does nothing, another cell takes the highlight, the highlighted one opens", () => {
    const g = manageGallery(pics(3));
    expect(tapCell(g, 5)).toBe(g);
    const moved = tapCell(g, 2);
    expect([moved.cursor, moved.view]).toEqual([2, "grid"]);
    expect(tapCell(moved, 2).view).toBe("closeup");
  });

  it("after a delete the highlight keeps its cell, else falls back to the last picture, and the page moves back", () => {
    const g = { ...manageGallery(pics(8)), page: 1, cursor: 1, view: "closeup" as const }; // the 8th
    const after = withPics(g, pics(7));
    expect(after.view).toBe("grid");
    expect([after.page, after.cursor]).toEqual([1, 0]); // the 7th, the new last
    const gone = withPics({ ...g, cursor: 0 }, pics(6)); // page 1 no longer exists
    expect([gone.page, gone.cursor]).toEqual([0, 5]);
    const keep = withPics({ ...manageGallery(pics(8)), cursor: 3 }, pics(7));
    expect([keep.page, keep.cursor]).toEqual([0, 3]);
    expect(withPics(g, [])).toMatchObject({ page: 0, cursor: 0, view: "grid" });
  });
});

describe("scene mode picks", () => {
  const seq = (...v: number[]) => {
    let i = 0;
    return () => v[i++ % v.length];
  };

  it("picks six without repeats from a bigger reel, on one page, with the highlight on one of them", () => {
    const all = pics(30);
    const g = sceneGallery(all, seq(0.1, 0.9, 0.5, 0.3, 0.7, 0.2, 0.99, 0.4));
    expect(g.pics).toHaveLength(6);
    expect(new Set(g.pics.map((p) => (p as { id: number }).id)).size).toBe(6);
    expect(g.page).toBe(0);
    expect(g.cursor).toBeLessThan(6);
    expect(pageCount(g.pics.length)).toBe(1);
  });

  it("shows what there is with fewer than six and keeps the highlight on a picture", () => {
    for (const n of [1, 2, 5]) {
      for (const r of [0, 0.5, 0.999999]) {
        const g = sceneGallery(pics(n), () => r);
        expect(g.pics).toHaveLength(n);
        expect(indexAt(g)).not.toBeNull();
      }
    }
    expect(sceneGallery([], () => 0.5).pics).toHaveLength(0);
  });

  it("never pages: arrows and moves stay on the one screen", () => {
    const g = sceneGallery(pics(30), () => 0.5);
    for (const d of ["right", "right", "right", "right", "right", "right", "down", "down", "up"] as const) {
      const m = move(g, d);
      expect(m.page).toBe(0);
    }
    expect(hasNextPage(g)).toBe(false);
    expect(hasPrevPage(g)).toBe(false);
  });
});

describe("close-up scale", () => {
  it("is the largest whole number that fits", () => {
    expect(closeupScale(SIZES.soft, { w: 320, h: 192 })).toBe(5);
    expect(closeupScale(SIZES.soft, { w: 224, h: 208 })).toBe(4);
    expect(closeupScale({ w: 100, h: 100 }, { w: 50, h: 50 })).toBe(1);
  });

  // The table of design section 3.3, manage mode (the whole view).
  it.each([
    ["wide", WIDE, "soft", 5, 240, 180],
    ["wide", WIDE, "crisp", 4, 256, 192],
    ["wide", WIDE, "chunky", 8, 256, 192],
    ["narrow", NARROW, "soft", 4, 192, 144],
    ["narrow", NARROW, "crisp", 3, 192, 144],
    ["narrow", NARROW, "chunky", 7, 224, 168],
  ] as const)("manage %s %s landscape", (_v, screen, look, scale, w, h) => {
    const l = closeupLayout({ mode: "manage", screen, pic: SIZES[look] });
    expect([l.scale, l.pic.w, l.pic.h]).toEqual([scale, w, h]);
  });

  it.each([
    ["wide", WIDE, "soft", 4, 144, 192],
    ["wide", WIDE, "crisp", 3, 144, 192],
    ["wide", WIDE, "chunky", 6, 144, 192],
    ["narrow", NARROW, "soft", 4, 144, 192],
  ] as const)("manage %s %s portrait", (_v, screen, look, scale, w, h) => {
    const l = closeupLayout({ mode: "manage", screen, pic: portrait(SIZES[look]) });
    expect([l.scale, l.pic.w, l.pic.h]).toEqual([scale, w, h]);
  });

  it("manage mode: a picture that fills the height stacks the hint in a margin that is wide enough, else it sits over the foot", () => {
    expect(closeupLayout({ mode: "manage", screen: WIDE, pic: portrait(SIZES.soft) }).hint.stack).toBe(true); // 144 wide, 88 margins
    expect(closeupLayout({ mode: "manage", screen: WIDE, pic: SIZES.crisp }).hint.stack).toBe(false); // 256 wide, 32 margins
    const soft = closeupLayout({ mode: "manage", screen: WIDE, pic: SIZES.soft });
    expect(soft.hint.stack).toBe(false);
    expect(soft.pic.y + soft.pic.h).toBeLessThanOrEqual(192 - 10); // 240 x 180 leaves the foot clear
  });

  it("scene mode on the wide view reserves a 12 px band: 5x landscape, 3x portrait", () => {
    const land = closeupLayout({ mode: "scene", screen: WIDE, pic: SIZES.soft, caption: "Ah, memories." });
    expect(land.scale).toBe(5);
    expect([land.pic.w, land.pic.h]).toEqual([240, 180]);
    expect(land.band).toEqual({ x: 0, y: 180, w: 320, h: 12 });
    expect(land.caption).toHaveLength(1);
    // The longest candidate caption (design section 8) still fits on one line beside the hint.
    expect(closeupLayout({ mode: "scene", screen: WIDE, pic: SIZES.soft, caption: "You could look at this all day. You do not." }).caption).toHaveLength(1);
    const port = closeupLayout({ mode: "scene", screen: WIDE, pic: portrait(SIZES.soft), caption: "Ah, memories." });
    expect(port.scale).toBe(3);
    expect([port.pic.w, port.pic.h]).toEqual([108, 144]);
  });

  it("scene mode on the narrow view: 4x landscape; a one-line caption keeps a portrait at 4x, a wrapped one costs a step", () => {
    const land = closeupLayout({ mode: "scene", screen: NARROW, pic: SIZES.soft, caption: "Look at that." });
    expect(land.scale).toBe(4);
    const one = closeupLayout({ mode: "scene", screen: NARROW, pic: portrait(SIZES.soft), caption: "Look at that." });
    expect(one.caption).toHaveLength(1);
    expect(one.scale).toBe(4);
    const two = closeupLayout({ mode: "scene", screen: NARROW, pic: portrait(SIZES.soft), caption: "You could look at this all day. You do not." });
    expect(two.caption.length).toBeGreaterThan(1);
    expect(two.scale).toBe(3);
  });

  it("every look, orientation, view, mode and caption keeps the picture and the text inside the view and apart", () => {
    const captions = ["", "Ah, memories.", "You could look at this all day. You do not."];
    for (const screen of [WIDE, NARROW]) {
      for (const mode of ["manage", "scene"] as const) {
        for (const base of Object.values(SIZES)) {
          for (const pic of [base, portrait(base)]) {
            for (const caption of mode === "scene" ? captions : [""]) {
              const l = closeupLayout({ mode, screen, pic, caption });
              expect(inside(l.pic, screen)).toBe(true);
              expect(l.pic.w).toBe(pic.w * l.scale);
              expect(closeupScale(pic, l.box)).toBe(l.scale);
              if (l.band) {
                expect(inside(l.band, screen)).toBe(true);
                expect(overlap(l.pic, l.band)).toBe(false);
                for (const c of l.caption) expect(c.y + 7).toBeLessThanOrEqual(l.band.y + l.band.h);
              }
            }
          }
        }
      }
    }
  });
});

describe("grid layout", () => {
  for (const [name, screen] of [["wide", WIDE], ["narrow", NARROW]] as const) {
    for (const mode of ["manage", "scene"] as const) {
      it(`${mode} on the ${name} view: six cells, inside the view, no overlap, in reading order`, () => {
        const l = gridLayout({ mode, screen, line: "You scroll for a while, because why not." });
        expect(l.cells).toHaveLength(PAGE_SIZE);
        l.cells.forEach((c, i) => {
          expect(inside(c, screen)).toBe(true);
          l.cells.slice(i + 1).forEach((d) => expect(overlap(c, d)).toBe(false));
        });
        expect(l.cells[1].x).toBeGreaterThan(l.cells[0].x);
        expect(l.cells[3].y).toBeGreaterThan(l.cells[0].y);
        expect(l.cells[0].w).toBe(name === "wide" ? 96 : 64);
        expect(l.cells[0].h).toBe(name === "wide" ? 72 : 48);
        expect(l.bottom).toBeLessThanOrEqual(screen.height);
        if (mode === "scene") {
          const p = l.phone!;
          expect(inside(p.panel, screen)).toBe(true);
          for (const c of l.cells) {
            expect(c.x).toBeGreaterThanOrEqual(p.screen.x);
            expect(c.x + c.w).toBeLessThanOrEqual(p.screen.x + p.screen.w);
            expect(c.y).toBeGreaterThanOrEqual(p.strip.y + p.strip.h);
            expect(c.y + c.h).toBeLessThanOrEqual(p.screen.y + p.screen.h);
          }
          for (const t of p.line) {
            expect(t.y).toBeGreaterThanOrEqual(l.bottom);
            expect(t.y + 7).toBeLessThanOrEqual(p.screen.y + p.screen.h);
          }
          for (const b of p.buttons) {
            expect(inside(b.rect, screen)).toBe(true);
            expect(b.rect.h).toBeGreaterThanOrEqual(16);
            for (const t of p.line) expect(t.y + 7).toBeLessThanOrEqual(b.rect.y);
            for (const c of l.cells) expect(overlap(c, b.rect)).toBe(false);
          }
          expect(p.buttons.length).toBe(name === "narrow" ? 2 : 0);
        } else {
          expect(l.phone).toBeUndefined();
        }
      });
    }
  }

  it("the wide phone is 306 x 177 and the narrow one 208 x 196, centred", () => {
    const w = gridLayout({ mode: "scene", screen: WIDE }).phone!.panel;
    expect([w.x, w.y, w.w, w.h]).toEqual([7, 7, 306, 177]);
    const n = gridLayout({ mode: "scene", screen: NARROW }).phone!.panel;
    expect([n.x, n.y, n.w, n.h]).toEqual([8, 6, 208, 196]);
  });

  it("the fixed line is one line on the wide view and wraps on the narrow one", () => {
    const text = "You scroll for a while, because why not.";
    expect(gridLayout({ mode: "scene", screen: WIDE, line: text }).phone!.line).toHaveLength(1);
    expect(gridLayout({ mode: "scene", screen: NARROW, line: text }).phone!.line.length).toBeGreaterThan(1);
  });

  it("manage mode leaves room under the grid on both views", () => {
    expect(gridLayout({ mode: "manage", screen: WIDE }).bottom).toBe(164);
    expect(gridLayout({ mode: "manage", screen: NARROW }).bottom).toBe(117);
  });
});

describe("thumbnail rule", () => {
  const wideCell = { w: 96, h: 72 };
  const narrowCell = { w: 64, h: 48 };
  it("shows the whole picture at the largest whole scale that fits", () => {
    expect(thumbWindow(SIZES.soft, wideCell)).toEqual({ scale: 2, slice: false });
    expect(thumbWindow(SIZES.soft, narrowCell)).toEqual({ scale: 1, slice: false });
    expect(thumbWindow(SIZES.crisp, wideCell)).toEqual({ scale: 2, slice: true });
    expect(thumbWindow(SIZES.crisp, narrowCell)).toEqual({ scale: 1, slice: false });
    expect(thumbWindow(SIZES.chunky, wideCell)).toEqual({ scale: 3, slice: false });
    expect(thumbWindow(SIZES.chunky, narrowCell)).toEqual({ scale: 2, slice: false });
  });

  it("shows a portrait that would be tiny as its middle square at 2x on the wide view, whole at 1x on the narrow one", () => {
    expect(thumbWindow(portrait(SIZES.soft), wideCell)).toEqual({ scale: 2, slice: true });
    expect(thumbWindow(portrait(SIZES.soft), narrowCell)).toEqual({ scale: 1, slice: false });
  });

  it("a portrait that fits at 2x or more is shown whole", () => {
    expect(thumbWindow(portrait(SIZES.chunky), wideCell)).toEqual({ scale: 2, slice: false });
  });

  it("a Crisp picture, which would sit small in a big margin on the wide view, is enlarged to 2x and cut to the cell's middle (landscape and portrait); Soft and Chunky are unchanged", () => {
    expect(thumbWindow(SIZES.crisp, wideCell)).toEqual({ scale: 2, slice: true });
    expect(thumbWindow(portrait(SIZES.crisp), wideCell)).toEqual({ scale: 2, slice: true });
    // The narrow cell: a Soft picture would keep under half in view at 2x, so it stays whole.
    expect(thumbWindow(SIZES.soft, narrowCell)).toEqual({ scale: 1, slice: false });
  });

  it("a picture too big for the cell even at 1x (a Crisp portrait, narrow) is cut to its middle", () => {
    expect(thumbWindow(portrait(SIZES.crisp), narrowCell)).toEqual({ scale: 1, slice: true });
  });

  it("never exceeds the cell unless it is a slice", () => {
    for (const cell of [wideCell, narrowCell]) {
      for (const base of Object.values(SIZES)) {
        for (const pic of [base, portrait(base)]) {
          const t = thumbWindow(pic, cell);
          if (!t.slice) {
            expect(pic.w * t.scale).toBeLessThanOrEqual(cell.w);
            expect(pic.h * t.scale).toBeLessThanOrEqual(cell.h);
          } else {
            // A slice is cut to the cell by the draw code; it either is not wider than the cell or covers it.
            expect(pic.w * t.scale <= cell.w || (pic.w * t.scale >= cell.w && pic.h * t.scale >= cell.h)).toBe(true);
          }
        }
      }
    }
  });
});
