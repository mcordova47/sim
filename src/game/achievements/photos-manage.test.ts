import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { COLOR } from "../../render/colors";
import { NO_INPUT } from "../../input/controls";
import { textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { DESKTOP_VIEW, NARROW_VIEW, VIEW, setView } from "../config";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { createMemoryReelStore, type ReelPic, type ReelStoreHandle } from "../reel/reel-store";
import { lookSizes } from "../reel/looks";
import { syntheticPic } from "../reel/synthetic-pic";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";
import { PHOTOS_DELETED, PHOTOS_DELETE, PHOTOS_DELETE_SURE, PHOTOS_NOT_DELETED, drawPhotos, photosLayout, type PhotosView } from "./photos-draw";
import { SoftCanvas, installSoftDocument } from "./soft-canvas";

// The PHOTOS page in manage mode (issue 117c): the grid, the close-up, delete one. Synthetic pictures only.

class FakeTarget<E> implements Listenable<E> {
  listeners = new Map<string, ((e: E) => void)[]>();
  addEventListener(type: string, fn: (e: E) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: E) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

const tick = async () => {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0));
};

async function setup(n: number, opts: { persistent?: boolean; size?: [number, number] } = {}) {
  const keys = new FakeTarget<KeyEventLike>();
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const reel: ReelStoreHandle = { store: createMemoryReelStore(), persistent: opts.persistent ?? true };
  const [w, h] = opts.size ?? [48, 36];
  // The store takes only palette indices; each picture differs by its seed.
  await reel.store.add(Array.from({ length: n }, (_, i) => { const px = syntheticPic(w, h, i + 1).px; px[1] = i % 22; px[2] = Math.floor(i / 22); return { w, h, px }; }));
  const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys, reel });
  const press = (code: string) => keys.fire("keydown", { code });
  const internals = feature as unknown as { page: string; photosView(): PhotosView };
  const tap = (r: { x: number; y: number; w: number; h: number }) => game.tapAt(r.x + r.w / 2, r.y + r.h / 2);
  press("KeyL");
  press("KeyO");
  await tick();
  const view = () => internals.photosView();
  const g = () => view().gallery!;
  const layout = () => photosLayout(view());
  const button = (id: string) => layout().buttons.find((b) => b.id === id)!;
  const ids = async () => (await reel.store.list()).map((p) => p.id);
  const hasPhotos = () => game.state.get("hasPhotos");
  return { game, feature, press, tap, reel, internals, view, g, layout, button, ids, hasPhotos };
}

afterEach(() => {
  setTouchHints(false);
  setView(DESKTOP_VIEW);
});

describe("manage mode: the grid on the keyboard", () => {
  it("shows the newest first, six to a page, and E opens the highlighted one", async () => {
    const s = await setup(8);
    const stored = await s.ids();
    expect(s.g().pics.map((p) => p.id)).toEqual([...stored].reverse());
    expect(s.layout().mode).toBe("grid");
    expect(s.layout().thumbs.map((t) => s.view().pics![t.index].id)).toEqual([...stored].reverse().slice(0, 6));
    s.press("KeyE");
    expect(s.g().view).toBe("closeup");
    expect(s.layout().mode).toBe("closeup");
    s.press("Escape");
    expect(s.g().view).toBe("grid");
    expect(s.internals.page).toBe("photos");
    s.press("Escape");
    expect(s.internals.page).toBe("list");
  });

  it("arrows move one picture or one row and turn the page, with no wrap at the ends", async () => {
    const s = await setup(8);
    s.press("ArrowLeft");
    s.press("ArrowUp");
    expect([s.g().page, s.g().cursor]).toEqual([0, 0]);
    s.press("ArrowDown");
    expect(s.g().cursor).toBe(3);
    s.press("ArrowRight");
    s.press("ArrowRight");
    s.press("ArrowRight");
    expect([s.g().page, s.g().cursor]).toEqual([1, 0]);
    expect(s.layout().pageLabel?.text).toBe("PAGE 2 OF 2");
    s.press("ArrowRight");
    s.press("ArrowRight");
    s.press("ArrowRight");
    expect([s.g().page, s.g().cursor]).toEqual([1, 1]);
    s.press("ArrowLeft");
    s.press("ArrowLeft");
    expect([s.g().page, s.g().cursor]).toEqual([0, 5]);
  });

  it("with no pictures there is no grid and the intro stays", async () => {
    const s = await setup(0);
    expect(s.layout().mode).toBe("list");
    s.press("KeyE");
    s.press("Delete");
    expect(s.layout().mode).toBe("list");
  });

  it("A and R behave as before beside the grid", async () => {
    const s = await setup(3);
    s.press("KeyR");
    expect(s.view().confirmRemove).toBe(true);
    s.press("KeyY");
    await tick();
    expect(await s.ids()).toEqual([]);
    expect(s.hasPhotos()).toBe(0);
    expect(s.layout().mode).toBe("list");
  });
});

describe("manage mode: delete one, from the close-up only", () => {
  it("no delete key does anything in the grid", async () => {
    const s = await setup(3);
    for (const code of ["Delete", "Backspace", "KeyD", "KeyX", "KeyY"]) s.press(code);
    s.press("Delete");
    await tick();
    expect(await s.ids()).toHaveLength(3);
    expect(s.view().confirmDelete).toBeFalsy();
    expect(s.hasPhotos()).toBe(1);
  });

  it("DELETE asks; a second DELETE (or Backspace, or Y) removes exactly that picture", async () => {
    for (const second of ["Delete", "Backspace", "KeyY"]) {
      const s = await setup(4);
      const stored = await s.ids();
      s.press("ArrowRight"); // the second newest
      const target = s.g().pics[1].id;
      s.press("KeyE");
      s.press("Delete");
      expect(s.view().confirmDelete).toBe(true);
      expect(await s.ids()).toHaveLength(4);
      s.press(second);
      await tick();
      expect(await s.ids()).toEqual(stored.filter((id) => id !== target));
      expect(s.view().message).toEqual([PHOTOS_DELETED]);
      expect(s.g().view).toBe("grid");
    }
  });

  it("any other key, and Escape, only put the question away and delete nothing", async () => {
    for (const code of ["Escape", "KeyE", "KeyA", "KeyR", "ArrowLeft", "ArrowRight", "Enter", "Space", "KeyN"]) {
      const s = await setup(3);
      s.press("KeyE");
      s.press("Delete");
      s.press(code);
      expect(s.view().confirmDelete, code).toBe(false);
      expect(await s.ids(), code).toHaveLength(3);
      expect(s.g().view, code).toBe("closeup");
      // And the question has to be asked again.
      s.press("Delete");
      await tick();
      expect(await s.ids(), code).toHaveLength(3);
    }
  });

  it("Left and Right in the close-up show the other pictures, and a delete there removes the one in view", async () => {
    const s = await setup(5);
    s.press("KeyE");
    s.press("ArrowRight");
    s.press("ArrowRight");
    const target = s.g().pics[2].id;
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect((await s.ids()).includes(target)).toBe(false);
    expect(await s.ids()).toHaveLength(4);
  });

  it("the highlight lands on the same cell (the next older picture), or on the last when none is left there", async () => {
    const s = await setup(8);
    s.press("ArrowRight");
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect([s.g().page, s.g().cursor]).toEqual([0, 1]);
    expect(s.g().pics).toHaveLength(7);
    // The last picture of the last page: the highlight steps back to the new last one, on the page before.
    for (let i = 0; i < 6; i++) s.press("ArrowRight");
    expect([s.g().page, s.g().cursor]).toEqual([1, 0]);
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(s.g().pics).toHaveLength(6);
    expect([s.g().page, s.g().cursor]).toEqual([0, 5]);
    expect(s.layout().pageLabel).toBeNull();
  });

  it("the sofa task's hasPhotos follows at once: still 1 with pictures left, 0 after the last is deleted", async () => {
    const s = await setup(2);
    expect(s.hasPhotos()).toBe(1);
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(s.hasPhotos()).toBe(1);
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(await s.ids()).toEqual([]);
    expect(s.hasPhotos()).toBe(0);
    expect(s.layout().mode).toBe("list");
    expect(s.internals.page).toBe("photos");
    s.game.update(0.1, NO_INPUT);
    expect(s.hasPhotos()).toBe(0);
  });

  it("a failing store leaves the picture and says so", async () => {
    const s = await setup(2);
    s.reel.store.remove = () => Promise.reject(new Error("no"));
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(await s.ids()).toHaveLength(2);
    expect(s.view().message).toEqual([PHOTOS_NOT_DELETED]);
    expect(s.hasPhotos()).toBe(1);
  });

  it("keys during a delete in flight do not delete a second picture", async () => {
    const s = await setup(4);
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    s.press("Delete");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(await s.ids()).toHaveLength(3);
  });

  it("nothing about a delete reaches the save or the sync document", async () => {
    const s = await setup(2);
    const doc = () => JSON.stringify((s.feature as unknown as { doc(): unknown }).doc());
    const before = doc();
    s.press("KeyE");
    s.press("Delete");
    s.press("Delete");
    await tick();
    expect(doc()).toBe(before);
  });
});

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("manage mode by touch at %s", (_name, size) => {
  beforeEach(() => {
    setView(size);
    setTouchHints(true);
  });

  it("a tap moves the highlight; a tap on the highlighted cell opens; an empty cell does nothing", async () => {
    const s = await setup(8);
    const cell = (i: number) => s.layout().thumbs[i].rect;
    s.tap(cell(2));
    expect(s.g().cursor).toBe(2);
    expect(s.g().view).toBe("grid");
    s.tap(cell(2));
    expect(s.g().view).toBe("closeup");
    s.tap(s.layout().back!);
    expect(s.g().view).toBe("grid");
    s.press("KeyE"); // (a key still works with the touch layer up)
    s.press("Escape");
    // The second page holds two pictures; the other cells are empty and not targets.
    s.tap(s.button("pageNext").rect);
    expect(s.g().page).toBe(1);
    expect(s.layout().thumbs).toHaveLength(2);
    expect(s.game.tapTargets().filter((t) => t.y >= 16 && t.y < 90 && t.h >= 48)).toHaveLength(2);
    s.tap(s.button("pagePrev").rect);
    expect(s.g().page).toBe(0);
  });

  it("the OPEN button opens, BACK in the close-up goes back to the grid, < and > show the others", async () => {
    const s = await setup(3);
    s.tap(s.button("open").rect);
    expect(s.g().view).toBe("closeup");
    const first = s.g().cursor;
    s.tap(s.button("next").rect);
    expect(s.g().cursor).toBe(first + 1);
    s.tap(s.button("prev").rect);
    expect(s.g().cursor).toBe(first);
    s.tap(s.button("back").rect);
    expect(s.g().view).toBe("grid");
    expect(s.internals.page).toBe("photos");
    s.tap(s.button("back").rect);
    expect(s.internals.page).toBe("list");
  });

  it("DELETE then SURE? DELETE deletes one; a tap anywhere else cancels; the grid has no delete", async () => {
    const s = await setup(4);
    expect(s.layout().buttons.map((b) => b.id)).not.toContain("delete");
    s.tap(s.layout().thumbs[0].rect); // the highlight starts here, so one tap opens
    expect(s.button("delete").label).toBe(PHOTOS_DELETE);
    s.tap(s.button("delete").rect);
    expect(s.button("delete").label).toBe(PHOTOS_DELETE_SURE);
    s.tap(s.layout().back!); // anywhere else
    expect(s.button("delete").label).toBe(PHOTOS_DELETE);
    expect(s.g().view).toBe("closeup");
    s.tap(s.button("delete").rect);
    s.tap(s.button("back").rect);
    expect(s.button("delete").label).toBe(PHOTOS_DELETE);
    expect(await s.ids()).toHaveLength(4);
    const target = s.g().pics[0].id;
    s.tap(s.button("delete").rect);
    s.tap(s.button("delete").rect);
    await tick();
    expect((await s.ids()).includes(target)).toBe(false);
    expect(await s.ids()).toHaveLength(3);
    expect(s.g().view).toBe("grid");
    expect(s.hasPhotos()).toBe(1);
  });

  it("the tap list equals the drawn buttons in the close-up too (and the picture goes back)", async () => {
    const s = await setup(3);
    s.press("KeyE");
    const drawn = s.layout().buttons.map((b) => b.rect);
    const targets = s.game.tapTargets().map(({ x, y, w, h }) => ({ x, y, w, h }));
    expect(targets.slice(1)).toEqual(drawn);
    expect(targets[0]).toEqual({ ...s.layout().back! });
  });
});

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("manage mode layout at %s", (_name, size) => {
  const sizes: Array<[number, number]> = lookSizes().map((z) => [z.w, z.h]);
  const gallery = (n: number, w: number, h: number): ReelPic[] => Array.from({ length: n }, (_, i) => syntheticPic(w, h, i));
  const view = (touch: boolean, extra: Partial<PhotosView> = {}): PhotosView => ({ touch, pics: gallery(14, 48, 36), persistent: true, progress: null, message: [], confirmRemove: false, ...extra });
  const inside = (r: { x: number; y: number; w: number; h: number }) => r.x >= 0 && r.y >= 0 && r.x + r.w <= VIEW.width && r.y + r.h <= VIEW.height;
  const apart = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;

  it("the grid, in every state: everything inside the view, nothing overlapping, text inside the width", () => {
    setView(size);
    for (const touch of [true, false]) {
      const states: PhotosView[] = [view(touch), view(touch, { confirmRemove: true }), view(touch, { message: ["12 pictures added.", "2 were already here.", "2 could not be read."] }), view(touch, { pics: gallery(5, 48, 36) }), view(touch, { progress: { done: 1, total: 4 } })];
      for (const v of states) {
        const l = photosLayout(v);
        expect(l.mode).toBe("grid");
        const rects = [...l.buttons.map((b) => b.rect), ...l.thumbs.map((t) => t.rect)];
        for (const r of rects) expect(inside(r)).toBe(true);
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(apart(rects[i], rects[j]), `${i} ${j}`).toBe(true);
        for (const line of [...l.status, ...l.message]) {
          expect(textWidth(line.text)).toBeLessThanOrEqual(VIEW.width - 12);
          expect(line.y + 7).toBeLessThanOrEqual(VIEW.height);
          // Text sits clear of the grid and of every button.
          for (const r of l.thumbs.map((t) => t.rect)) expect(line.y >= r.y + r.h || line.y + 7 <= r.y).toBe(true);
          for (const b of l.buttons) if (touch) expect(apart({ x: 0, y: line.y, w: VIEW.width, h: 7 }, b.rect), `${line.text} ${b.id}`).toBe(true);
        }
        if (touch) for (const b of l.buttons) expect(textWidth(b.label), b.label).toBeLessThanOrEqual(b.rect.w - 4);
        if (touch) for (const b of l.buttons) expect(b.rect.h).toBeGreaterThanOrEqual(16);
        expect(l.thumbs).toHaveLength(Math.min(6, v.pics!.length));
      }
    }
  });

  it("the close-up, for every picture size and both inputs: the whole picture, the largest whole scale that fits above the foot, nothing overlapping", () => {
    setView(size);
    for (const touch of [true, false]) {
      for (const [w, h] of sizes) {
        for (const armed of [false, true]) {
          const pics = gallery(3, w, h);
          const g = { pics, page: 0, cursor: 1, view: "closeup" as const };
          const l = photosLayout({ ...view(touch, { pics, gallery: g, confirmDelete: armed }) });
          expect(l.mode).toBe("closeup");
          const c = l.closeup!;
          expect(c.pic.w).toBe(w * c.scale);
          expect(c.pic.h).toBe(h * c.scale);
          expect(inside(c.pic)).toBe(true);
          const foot = touch ? 18 : 10;
          expect(c.pic.y + c.pic.h).toBeLessThanOrEqual(VIEW.height - foot);
          // One scale up would not fit above the foot.
          expect((w * (c.scale + 1) > VIEW.width) || (h * (c.scale + 1) > VIEW.height - foot)).toBe(true);
          for (const b of l.buttons) {
            expect(inside(b.rect)).toBe(true);
            expect(apart(b.rect, c.pic), b.id).toBe(true);
          }
          for (let i = 0; i < l.buttons.length; i++) for (let j = i + 1; j < l.buttons.length; j++) expect(apart(l.buttons[i].rect, l.buttons[j].rect)).toBe(true);
          if (touch) for (const b of l.buttons) expect(textWidth(b.label), b.label).toBeLessThanOrEqual(b.rect.w - 4);
          if (l.foot) {
            expect(textWidth(l.foot.text)).toBeLessThanOrEqual(VIEW.width - 4);
            expect(unsupportedChars(l.foot.text)).toEqual([]);
          }
          expect(l.foot === null).toBe(touch);
        }
      }
    }
  });

  it("a single picture has no < or > buttons", () => {
    setView(size);
    const pics = gallery(1, 48, 36);
    const l = photosLayout(view(true, { pics, gallery: { pics, page: 0, cursor: 0, view: "closeup" } }));
    expect(l.buttons.map((b) => b.id)).toEqual(["delete", "back"]);
  });

  it("the new words use letters the font has and say nothing of size or pixels", () => {
    for (const t of [PHOTOS_DELETED, PHOTOS_NOT_DELETED, PHOTOS_DELETE, PHOTOS_DELETE_SURE, "OPEN", "PAGE 2 OF 10", "DEL: SURE? DELETE  OTHER KEY: CANCEL", "OTHERS"]) {
      expect(unsupportedChars(t), t).toEqual([]);
      expect(t).not.toMatch(/pixel|resolution|small|tiny|\bsize|game|sprite|palette|colou?r/i);
      expect(textWidth(t)).toBeLessThanOrEqual(VIEW.width - 12);
    }
  });
});

describe("drawing the manage page (software canvas, synthetic pictures)", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installSoftDocument();
  });
  afterEach(() => restore());

  for (const [name, size] of [["wide", DESKTOP_VIEW], ["narrow", NARROW_VIEW]] as const) {
    it(`${name}: the grid shows the highlight in butter, the close-up shows the picture and no highlight`, () => {
      setView(size);
      const pics = Array.from({ length: 8 }, (_, i) => syntheticPic(48, 36, i));
      const c = new SoftCanvas(size.width, size.height);
      const ctx = c.getContext() as unknown as CanvasRenderingContext2D;
      const v: PhotosView = { touch: size === NARROW_VIEW, pics, persistent: true, progress: null, message: [], confirmRemove: false };
      drawPhotos(ctx, v);
      const l = photosLayout(v);
      const cell = l.thumbs[0].rect;
      expect(c.pixel(cell.x, cell.y)).toBe(COLOR.butter);
      const closeup = { pics: [...pics].reverse(), page: 0, cursor: 0, view: "closeup" as const };
      const c2 = new SoftCanvas(size.width, size.height);
      drawPhotos(c2.getContext() as unknown as CanvasRenderingContext2D, { ...v, gallery: closeup });
      const pr = photosLayout({ ...v, gallery: closeup }).closeup!.pic;
      // The picture's own top-left marker pixel (a synthetic picture has one) is at the picture's corner.
      expect(c2.pixel(pr.x, pr.y)).not.toBe(COLOR.ink);
      expect(pr.w).toBe(48 * photosLayout({ ...v, gallery: closeup }).closeup!.scale);
    });
  }
});
