import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { drawText, textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { DESKTOP_VIEW, NARROW_VIEW, VIEW, setView } from "../config";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import type { DecodedImage, PhotoIO } from "../reel/photo-io";
import { REEL_CAP, createMemoryReelStore, type ReelPicInput, type ReelStoreHandle } from "../reel/reel-store";
import { drawList, pauseButtons } from "./draw";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";
import { PHOTOS_INTRO, PHOTOS_NONE, PHOTOS_NO_STORAGE, PHOTOS_REMOVED, drawPhotos, photosLayout, statusText, type PhotosView } from "./photos-draw";
import { summaryLines } from "../reel/photo-add";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

class FakeTarget<E> implements Listenable<E> {
  listeners = new Map<string, ((e: E) => void)[]>();
  addEventListener(type: string, fn: (e: E) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: E) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

const synthetic = (seed: number): DecodedImage => {
  const w = 120, h = 90;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = (i * (3 + seed) + seed * 17) % 256;
    rgba.set([v, (v * 3) % 256, 255 - v, 255], i * 4);
  }
  return { rgba, width: w, height: h };
};

function fakePhotoIO(count: () => number) {
  const picks: Array<() => void> = [];
  let calls = 0;
  const io: PhotoIO = {
    pickImages: () => {
      calls++;
      return Promise.resolve(Array.from({ length: count() }, (_, i) => new Blob([`${calls}-${i}`])));
    },
    decode: async (f) => synthetic(f.size * 7 + calls * 31 + picks.length++),
    keepStorage: vi.fn(),
  };
  return { io, get calls() { return calls; } };
}

function setup(opts: { persistent?: boolean; count?: number; storage?: FakeStorage } = {}) {
  const keys = new FakeTarget<KeyEventLike>();
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const storage = opts.storage ?? new FakeStorage();
  const reel: ReelStoreHandle = { store: createMemoryReelStore(), persistent: opts.persistent ?? true };
  const photo = fakePhotoIO(() => opts.count ?? 3);
  const feature = new AchievementsFeature(game, { storage, keys, reel, photoIO: photo.io });
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire("keydown", { code, ...extra });
  const tick = async () => {
    for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0));
  };
  const internals = feature as unknown as { page: string; photosView(): PhotosView; doc(): unknown };
  const tap = (r: { x: number; y: number; w: number; h: number }) => game.tapAt(r.x + r.w / 2, r.y + r.h / 2);
  return { game, feature, press, tick, reel, photo, storage, internals, tap };
}

const pic = (seed: number): ReelPicInput => {
  const px = new Uint8Array(48 * 36).fill(seed % 22);
  px[0] = Math.floor(seed / 22) % 22;
  return { w: 48, h: 36, px };
};

afterEach(() => {
  setTouchHints(false);
  setView(DESKTOP_VIEW);
});

const ctx = { fillRect: () => {}, drawImage: () => {} } as unknown as CanvasRenderingContext2D;
const drawnTexts = (view: PhotosView) => {
  vi.mocked(drawText).mockClear();
  drawPhotos(ctx, view);
  return vi.mocked(drawText).mock.calls.map((c) => String(c[1]));
};

describe("the PHOTOS page on the desktop", () => {
  it("O opens it from the pause screen, Escape goes back, L closes the whole screen", async () => {
    const s = setup();
    s.press("KeyL");
    s.press("KeyO");
    expect(s.internals.page).toBe("photos");
    s.press("Escape");
    expect(s.internals.page).toBe("list");
    s.press("KeyO");
    s.press("KeyO");
    expect(s.internals.page).toBe("list");
    s.press("KeyO");
    s.press("KeyL");
    expect(s.feature.listVisible).toBe(false);
  });

  it("the page is unreachable during a task or a dialog", () => {
    const s = setup();
    s.press("KeyO");
    expect(s.internals.page).toBe("list");
    expect(s.feature.listVisible).toBe(false);
  });

  it("A opens the chooser in the same call, adds what was chosen, and says so", async () => {
    const s = setup({ count: 3 });
    s.press("KeyL");
    s.press("KeyO");
    s.press("KeyA");
    expect(s.photo.calls).toBe(1); // synchronously, in the key press
    await s.tick();
    expect(await s.reel.store.list()).toHaveLength(3);
    expect(s.internals.photosView().message).toEqual(["3 pictures added."]);
    expect(s.internals.photosView().pics).toHaveLength(3);
    expect(s.photo.io.keepStorage).toHaveBeenCalled();
  });

  it("cancel (nothing chosen) changes nothing and says nothing", async () => {
    const s = setup({ count: 0 });
    s.press("KeyL");
    s.press("KeyO");
    s.press("KeyA");
    await s.tick();
    expect(await s.reel.store.list()).toHaveLength(0);
    expect(s.internals.photosView().message).toEqual([]);
  });

  it("REMOVE ALL asks first: R arms, Escape disarms (and stays), R then R clears", async () => {
    const s = setup();
    await s.reel.store.add([pic(1), pic(2)]);
    s.press("KeyL");
    s.press("KeyO");
    await s.tick();
    s.press("KeyR");
    expect(s.internals.photosView().confirmRemove).toBe(true);
    s.press("Escape");
    expect(s.internals.photosView().confirmRemove).toBe(false);
    expect(s.internals.page).toBe("photos");
    expect(await s.reel.store.list()).toHaveLength(2);
    s.press("KeyR");
    s.press("KeyA"); // any other key cancels (and A then adds: chooser gives 3 more)
    await s.tick();
    expect((await s.reel.store.list()).length).toBeGreaterThan(2);
    s.press("KeyR");
    s.press("KeyR");
    await s.tick();
    expect(await s.reel.store.list()).toHaveLength(0);
    expect(s.internals.photosView().message).toEqual([PHOTOS_REMOVED]);
    expect(s.internals.photosView().pics).toEqual([]);
  });

  it("does nothing to storage: no key in saved progress mentions the reel, and a pause-screen visit writes nothing new", async () => {
    const s = setup();
    s.press("KeyL");
    s.press("KeyO");
    s.press("KeyA");
    await s.tick();
    s.feature.save();
    const dump = JSON.stringify([...s.storage.data.entries()]);
    expect(dump).not.toMatch(/reel|pics|photo/i);
  });
});

describe("photos and the rest of the save", () => {
  it("the sync document has no reel field, and no picture bytes appear in it", async () => {
    const s = setup();
    await s.reel.store.add([pic(1), pic(2), pic(3)]);
    const doc = JSON.stringify(s.internals.doc());
    expect(doc).not.toMatch(/reel|pics|photo|"px"/i);
    // Nor does the doc change when pictures are added.
    const before = JSON.stringify(s.internals.doc());
    await s.reel.store.add([pic(4)]);
    expect(JSON.stringify(s.internals.doc())).toBe(before);
    const keys = Object.keys(s.internals.doc() as object).sort();
    expect(keys.some((k) => /reel|pic|photo/i.test(k))).toBe(false);
  });

  it("a reset keeps the photos", async () => {
    const s = setup();
    await s.reel.store.add([pic(1), pic(2)]);
    s.feature.reset();
    expect(await s.reel.store.list()).toHaveLength(2);
  });

  it("the store is not opened until the page is", () => {
    const keys = new FakeTarget<KeyEventLike>();
    const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys });
    expect((feature as unknown as { reelHandle: unknown }).reelHandle).toBeNull();
    for (let t = 0; t < 2; t += 0.5) game.update(0.5, NO_INPUT);
    expect((feature as unknown as { reelHandle: unknown }).reelHandle).toBeNull();
  });
});

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("the PHOTOS page at %s", (_name, size) => {
  const pics = (n: number) => Array.from({ length: n }, (_, i) => ({ ...pic(i), id: i + 1, palette: 1 as const }));
  const view = (extra: Partial<PhotosView> = {}): PhotosView => ({ touch: true, pics: pics(12), persistent: true, progress: null, message: [], confirmRemove: false, ...extra });

  it("everything drawn fits inside the picture and nothing overlaps", () => {
    setView(size);
    for (const touch of [true, false]) {
      for (const v of [view({ touch }), view({ touch, pics: [] }), view({ touch, pics: pics(REEL_CAP) }), view({ touch, pics: null }), view({ touch, progress: { done: 3, total: 12 } }), view({ touch, persistent: false }), view({ touch, confirmRemove: true })]) {
        const l = photosLayout(v);
        for (const r of [...l.buttons.map((b) => b.rect), ...l.thumbs.map((t) => t.rect)]) {
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(VIEW.width);
          expect(r.y + r.h).toBeLessThanOrEqual(VIEW.height - 11);
        }
        const rects = [...l.buttons.map((b) => b.rect), ...l.thumbs.map((t) => t.rect)];
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${i} ${j}`).toBe(true);
        }
        if (touch) for (const b of l.buttons) expect(textWidth(b.label), b.label).toBeLessThanOrEqual(b.rect.w - 4);
        if (v.pics && v.pics.length > 0 && v.persistent && !v.progress) expect(l.thumbs.length, "at least one thumbnail row").toBeGreaterThan(0);
      }
    }
  });

  it("the tap list equals the drawn buttons, and the buttons do not move when a message appears", async () => {
    setView(size);
    setTouchHints(true);
    const s = setup();
    await s.reel.store.add(pics(3));
    s.press("KeyL");
    s.press("KeyO");
    await s.tick();
    const drawn = photosLayout(s.internals.photosView()).buttons.map((b) => b.rect);
    expect(s.game.tapTargets().map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual(drawn);
    const withMessage = photosLayout({ ...s.internals.photosView(), message: ["a", "b"] }).buttons.map((b) => b.rect);
    expect(withMessage).toEqual(drawn);
  });

  it("touch: ADD PHOTOS opens the chooser in the tap, REMOVE ALL needs a second tap, another button disarms, BACK returns", async () => {
    setView(size);
    setTouchHints(true);
    const s = setup({ count: 2 });
    s.press("KeyL");
    const open = pauseButtons((s.feature as unknown as { view(): Parameters<typeof pauseButtons>[0] }).view()).find((b) => b.id === "photos")!;
    expect(s.tap(open.rect)).toBe(true);
    expect(s.internals.page).toBe("photos");
    const button = (id: string) => photosLayout(s.internals.photosView()).buttons.find((b) => b.id === id)!;
    expect(button("remove", ) ).toBeUndefined(); // nothing stored yet (the list is read at open)
    await s.tick();
    expect(s.tap(button("add").rect)).toBe(true);
    expect(s.photo.calls).toBe(1);
    await s.tick();
    expect(await s.reel.store.list()).toHaveLength(2);
    expect(button("remove").label).toBe("REMOVE ALL");
    s.tap(button("remove").rect);
    expect(button("remove").label).toBe("SURE? REMOVE ALL");
    s.tap(button("add").rect); // another button disarms it (and adds)
    await s.tick();
    expect(button("remove").label).toBe("REMOVE ALL");
    s.tap(button("remove").rect);
    s.tap(button("remove").rect);
    await s.tick();
    expect(await s.reel.store.list()).toHaveLength(0);
    expect(button("remove")).toBeUndefined();
    s.tap(button("back").rect);
    expect(s.internals.page).toBe("list");
  });

  it("the pause list's touch buttons (with the ad blocker and the voice) are eight in four rows and still fit above the achievements", () => {
    setView(size);
    const v = { achievements: [], unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP", touch: true } as never;
    const buttons = pauseButtons(v);
    expect(buttons).toHaveLength(8);
    const bottom = Math.max(...buttons.map((b) => b.rect.y + b.rect.h));
    expect(bottom).toBeLessThanOrEqual(89);
    const photos = buttons.find((b) => b.id === "photos")!;
    expect(textWidth(photos.label)).toBeLessThanOrEqual(photos.rect.w - 4);
  });

  it("the desktop pause screen shows the O key hint, in the free line, inside the picture and apart from the others", () => {
    // The desktop's hints are never drawn on the phone's narrow view.
    if (size !== DESKTOP_VIEW) return;
    setView(size);
    vi.mocked(drawText).mockClear();
    drawList(ctx, { achievements: [], unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP", touch: false });
    const calls = vi.mocked(drawText).mock.calls;
    const hints = ["P: SYNC", "I: THINGS", "O: PHOTOS", "T: TRANSFER SAVE"].map((t) => calls.find((c) => c[1] === t));
    expect(hints.every(Boolean)).toBe(true);
    const spans = hints.map((c) => [c![2] as number, (c![2] as number) + textWidth(String(c![1]))]);
    for (let i = 0; i < spans.length; i++) {
      expect(spans[i][0]).toBeGreaterThanOrEqual(6);
      expect(spans[i][1]).toBeLessThanOrEqual(VIEW.width - 6 + 1);
      if (i > 0) expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]);
    }
  });
});

describe("the page's words", () => {
  const lines = [PHOTOS_INTRO, PHOTOS_NONE, PHOTOS_NO_STORAGE, PHOTOS_REMOVED, "Making picture 3 of 12", "12 pictures on this device", "1 picture on this device"];
  it("use only letters the font has, and none speak of resolution, size or pixels, or of the game", () => {
    const all = [
      ...lines,
      ...summaryLines({ added: 12, duplicates: 2, full: 3, unreadable: 2, storageError: true }),
      "This browser could not read the pictures.",
      "This browser could not remove them all.",
      "REMOVE ALL", "SURE? REMOVE ALL", "ADD PHOTOS", "PHOTOS", "O: PHOTOS",
    ];
    for (const t of all) {
      expect(unsupportedChars(t), t).toEqual([]);
      expect(t).not.toMatch(/pixel|resolution|small|tiny|low|\bsize|game|sprite|palette|colou?r/i);
    }
  });

  it("every line fits the picture's width on both views, with the status in every state", () => {
    for (const size of [DESKTOP_VIEW, NARROW_VIEW]) {
      setView(size);
      for (const touch of [false, true]) {
        const base: PhotosView = { touch, pics: [], persistent: true, progress: null, message: summaryLines({ added: 12, duplicates: 2, full: 3, unreadable: 2, storageError: true }), confirmRemove: false };
        for (const v of [base, { ...base, pics: null }, { ...base, persistent: false }, { ...base, progress: { done: 12, total: 60 } }]) {
          for (const t of drawnTexts(v)) expect(textWidth(t), t).toBeLessThanOrEqual(VIEW.width - 12);
        }
      }
    }
  });

  it("the status line follows the state", () => {
    const v: PhotosView = { touch: false, pics: [], persistent: true, progress: null, message: [], confirmRemove: false };
    expect(statusText(v)).toBe(PHOTOS_NONE);
    expect(statusText({ ...v, persistent: false })).toBe(PHOTOS_NO_STORAGE);
    expect(statusText({ ...v, progress: { done: 3, total: 12 } })).toBe("Making picture 3 of 12");
    expect(statusText({ ...v, pics: null })).toBe("");
  });

  it("with no storage there is no ADD button and the page says so", () => {
    const v: PhotosView = { touch: true, pics: [], persistent: false, progress: null, message: [], confirmRemove: false };
    expect(photosLayout(v).buttons.map((b) => b.id)).toEqual(["back"]);
  });
});

describe("with no storage the keys do nothing but go back", () => {
  it("A does not open the chooser", async () => {
    const s = setup({ persistent: false });
    s.press("KeyL");
    s.press("KeyO");
    s.press("KeyA");
    expect(s.photo.calls).toBe(0);
  });
});
