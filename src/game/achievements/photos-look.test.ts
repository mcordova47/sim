import { afterEach, describe, expect, it } from "vitest";
import { textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { DESKTOP_VIEW, NARROW_VIEW, VIEW, setView } from "../config";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import type { DecodedImage, PhotoIO } from "../reel/photo-io";
import { createMemoryReelStore, type ReelStoreHandle } from "../reel/reel-store";
import { LOOK_SETTINGS_KEY, loadLook, type LookStorage } from "../reel/look-settings";
import { REEL_LOOKS, nextLookId } from "../reel/looks";
import { syntheticPic } from "../reel/synthetic-pic";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";
import { PHOTOS_LOOK_NOTE, PHOTOS_LOOK_NOTE_SHORT, PHOTOS_LOOK_NOT_KEPT, drawPhotos, lookLabel, photosLayout, type PhotosView } from "./photos-draw";
import { SoftCanvas, installSoftDocument } from "./soft-canvas";

// The LOOK switch on the PHOTOS page (issue 117d). Synthetic pictures only.

class FakeTarget<E> implements Listenable<E> {
  listeners = new Map<string, ((e: E) => void)[]>();
  addEventListener(type: string, fn: (e: E) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: E) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

class MemLook implements LookStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}
const blocked: LookStorage = { getItem: () => { throw new Error("no"); }, setItem: () => { throw new Error("no"); } };

const tick = async () => {
  for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 0));
};

const decoded = (seed: number, portrait = false): DecodedImage => {
  const [w, h] = portrait ? [90, 120] : [120, 90];
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = (i * (3 + seed) + seed * 17) % 256;
    rgba.set([v, (v * 3) % 256, 255 - v, 255], i * 4);
  }
  return { rgba, width: w, height: h };
};

function make(opts: { lookStorage?: LookStorage | null; persistent?: boolean; portrait?: boolean } = {}) {
  const keys = new FakeTarget<KeyEventLike>();
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const reel: ReelStoreHandle = { store: createMemoryReelStore(), persistent: opts.persistent ?? true };
  let n = 0;
  const io: PhotoIO = {
    pickImages: () => Promise.resolve([new Blob([`a${n}`])]),
    decode: async () => decoded(++n, opts.portrait),
    keepStorage: () => {},
  };
  const lookStorage = opts.lookStorage === undefined ? new MemLook() : opts.lookStorage;
  const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys, reel, photoIO: io, lookStorage });
  const press = (code: string) => keys.fire("keydown", { code });
  const internals = feature as unknown as { page: string; photosView(): PhotosView };
  return { game, feature, keys, press, reel, lookStorage, internals, view: () => internals.photosView(), layout: () => photosLayout(internals.photosView()), tap: (r: { x: number; y: number; w: number; h: number }) => game.tapAt(r.x + r.w / 2, r.y + r.h / 2) };
}

async function open(s: ReturnType<typeof make>, pre = 0) {
  if (pre) await s.reel.store.add(Array.from({ length: pre }, (_, i) => { const p = syntheticPic(48, 36, i + 1); return { w: 48, h: 36, px: p.px }; }));
  s.press("KeyL");
  s.press("KeyO");
  await tick();
}

const sizes = async (s: ReturnType<typeof make>) => (await s.reel.store.list()).map((p) => `${p.w}x${p.h}${p.look ? ":" + p.look : ""}`);

afterEach(() => {
  setTouchHints(false);
  setView(DESKTOP_VIEW);
});

describe("LOOK switch: behaviour", () => {
  it("starts at Soft and S cycles Soft, Chunky, Crisp, Soft", async () => {
    const s = make();
    await open(s, 2);
    expect(s.view().look).toBe("soft");
    expect(s.layout().buttons.find((b) => b.id === "look")!.label).toBe("LOOK: SOFT");
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      s.press("KeyS");
      seen.push(s.view().look!);
    }
    expect(seen).toEqual(["chunky", "crisp", "soft", "chunky"]);
    expect(nextLookId("crisp")).toBe("soft");
    expect(nextLookId("nonsense")).toBe("chunky");
  });

  it("new pictures use the chosen look; ones already kept keep theirs", async () => {
    const s = make();
    await open(s);
    s.press("KeyA");
    await tick();
    s.press("KeyS"); // chunky
    s.press("KeyA");
    await tick();
    s.press("KeyS"); // crisp
    s.press("KeyA");
    await tick();
    expect(await sizes(s)).toEqual(["48x36", "32x24:chunky", "64x48:crisp"]);
    // Switching back does not touch any of them.
    s.press("KeyS");
    expect(await sizes(s)).toEqual(["48x36", "32x24:chunky", "64x48:crisp"]);
  });

  it("a portrait picture takes the swapped size of the chosen look", async () => {
    const s = make({ portrait: true });
    await open(s);
    s.press("KeyA");
    await tick();
    s.press("KeyS");
    s.press("KeyA");
    await tick();
    s.press("KeyS");
    s.press("KeyA");
    await tick();
    expect(await sizes(s)).toEqual(["36x48", "24x32:chunky", "48x64:crisp"]);
  });

  it("works on the empty page and is offered there", async () => {
    const s = make();
    await open(s);
    expect(s.layout().mode).toBe("list");
    expect(s.layout().buttons.map((b) => b.id)).toContain("look");
    s.press("KeyS");
    expect(s.view().look).toBe("chunky");
    expect(s.layout().note.map((l) => l.text).join(" ")).toBe(PHOTOS_LOOK_NOTE);
  });

  it("is kept in its own key, read again by a new session, and untouched by reset and the save", async () => {
    const s = make();
    await open(s, 1);
    s.press("KeyS");
    expect(s.lookStorage && (s.lookStorage as MemLook).data.get(LOOK_SETTINGS_KEY)).toBe('{"look":"chunky"}');
    s.feature.save();
    s.feature.reset();
    expect(loadLook(s.lookStorage)).toBe("chunky");
    // The save and the sync document hold nothing of it.
    expect(JSON.stringify((s.feature as unknown as { doc(): unknown }).doc())).not.toMatch(/look|chunky/i);
    const t = make({ lookStorage: s.lookStorage });
    await open(t, 1);
    expect(t.view().look).toBe("chunky");
    // Remove all does not forget it either.
    t.press("KeyR");
    t.press("KeyR");
    await tick();
    expect(t.view().look).toBe("chunky");
    expect(loadLook(t.lookStorage)).toBe("chunky");
  });

  it("junk in the key reads as Soft; a blocked storage holds the choice for the session and says so", async () => {
    const m = new MemLook();
    m.data.set(LOOK_SETTINGS_KEY, "{not json");
    const a = make({ lookStorage: m });
    await open(a, 1);
    expect(a.view().look).toBe("soft");
    const b = make({ lookStorage: blocked });
    await open(b, 1);
    expect(b.view().look).toBe("soft");
    b.press("KeyS");
    expect(b.view().look).toBe("chunky");
    expect(b.view().message).toEqual([PHOTOS_LOOK_NOT_KEPT]);
    // Leaving and coming back keeps what this session chose.
    b.press("Escape");
    b.press("KeyO");
    await tick();
    expect(b.view().look).toBe("chunky");
    const c = make({ lookStorage: null });
    await open(c, 1);
    c.press("KeyS");
    expect(c.view().look).toBe("chunky");
  });

  it("is not offered, and S does nothing, in the close-up, while making a picture, or with no storage", async () => {
    const s = make();
    await open(s, 3);
    s.press("KeyE");
    expect(s.layout().mode).toBe("closeup");
    expect(s.layout().buttons.map((b) => b.id)).not.toContain("look");
    expect(s.layout().note).toEqual([]);
    s.press("KeyS");
    expect(s.view().look).toBe("soft");
    s.press("Escape");
    // While a picture is being made.
    (s.feature as unknown as { photoProgress: unknown }).photoProgress = { done: 0, total: 1 };
    expect(s.layout().buttons.map((b) => b.id)).toEqual(["back"]);
    expect(s.layout().note).toEqual([]);
    s.press("KeyS");
    expect(s.view().look).toBe("soft");
    const n = make({ persistent: false });
    await open(n);
    expect(n.layout().buttons.map((b) => b.id)).not.toContain("look");
    expect(n.layout().note).toEqual([]);
    n.press("KeyS");
    expect(n.view().look).toBe("soft");
  });

  it("S asking REMOVE ALL only cancels the question as any other key does, and changes the look", async () => {
    const s = make();
    await open(s, 2);
    s.press("KeyR");
    expect(s.view().confirmRemove).toBe(true);
    s.press("KeyS");
    expect(s.view().confirmRemove).toBe(false);
    expect((await s.reel.store.list()).length).toBe(2);
  });

  it("changes no picture, and the reel keeps its count", async () => {
    const s = make();
    await open(s, 4);
    const before = JSON.stringify((await s.reel.store.list()).map((p) => [p.id, p.w, p.h, Array.from(p.px)]));
    s.press("KeyS");
    s.press("KeyS");
    expect(JSON.stringify((await s.reel.store.list()).map((p) => [p.id, p.w, p.h, Array.from(p.px)]))).toBe(before);
  });
});

const VIEWS = [
  ["wide keyboard", DESKTOP_VIEW, false],
  ["wide touch", DESKTOP_VIEW, true],
  ["narrow touch", NARROW_VIEW, true],
  ["narrow keyboard", NARROW_VIEW, false],
] as const;

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe.each(VIEWS)("LOOK switch: layout, %s", (_name, view, touch) => {
  for (const pre of [0, 1, 7, 12]) {
    for (const look of ["crisp", "soft", "chunky"]) {
      it(`${pre} pictures, ${look}: the note and the button fit and clear everything`, async () => {
        setView(view);
        setTouchHints(touch);
        const s = make();
        await open(s, pre);
        while (s.view().look !== look) s.press("KeyS");
        for (const armed of [false, true]) {
          if (armed && pre) s.press("KeyR");
          const l = s.layout();
          const b = l.buttons.find((x) => x.id === "look")!;
          expect(b.label).toBe(lookLabel(look));
          for (const r of [b.rect]) {
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.x + r.w).toBeLessThanOrEqual(VIEW.width);
            expect(r.y + r.h).toBeLessThanOrEqual(VIEW.height);
          }
          // No button over another, a cell, or a text line; the note stays in view and clear of text and buttons.
          for (const o of l.buttons) if (o !== b) expect(overlap(b.rect, o.rect)).toBe(false);
          for (const t of l.thumbs) expect(overlap(b.rect, t.rect)).toBe(false);
          expect(l.note.length).toBeGreaterThan(0);
          for (const n of l.note) {
            expect(n.x).toBeGreaterThanOrEqual(0);
            expect(n.x + textWidth(n.text)).toBeLessThanOrEqual(VIEW.width);
            expect(n.y + 7).toBeLessThanOrEqual(VIEW.height);
            const nr = { x: n.x, y: n.y, w: textWidth(n.text), h: 7 };
            for (const o of l.buttons) expect(overlap(nr, o.rect)).toBe(false);
            for (const t of l.thumbs) expect(overlap(nr, t.rect)).toBe(false);
            for (const o of [...l.status, ...l.message]) expect(overlap(nr, { x: 6, y: o.y, w: textWidth(o.text), h: 7 })).toBe(false);
          }
          if (touch) expect(b.rect.h).toBeGreaterThanOrEqual(16);
        }
      });
    }
  }

  it.runIf(touch)("a tap on the LOOK button cycles the look and reaches no other target", async () => {
    setView(view);
    setTouchHints(touch);
    const s = make();
    await open(s, 7);
    const before = s.view().look;
    const b = s.layout().buttons.find((x) => x.id === "look")!;
    s.tap(b.rect);
    expect(s.view().look).toBe(nextLookId(before));
    expect(s.view().gallery!.view).toBe("grid");
    expect(s.internals.page).toBe("photos");
    for (const c of [{ x: b.rect.x + 1, y: b.rect.y + 1 }, { x: b.rect.x + b.rect.w - 2, y: b.rect.y + b.rect.h - 2 }]) {
      const prev = s.view().look;
      s.game.tapAt(c.x, c.y);
      expect(s.view().look).toBe(nextLookId(prev));
    }
  });

  it("renders with no text off the view and the new lines are in the font", async () => {
    setView(view);
    setTouchHints(touch);
    installSoftDocument();
    const s = make();
    await open(s, 7);
    const c = new SoftCanvas(VIEW.width, VIEW.height);
    drawPhotos(c.getContext() as unknown as CanvasRenderingContext2D, s.view());
    expect(unsupportedChars([PHOTOS_LOOK_NOTE, PHOTOS_LOOK_NOTE_SHORT, PHOTOS_LOOK_NOT_KEPT, ...REEL_LOOKS.map((l) => lookLabel(l.id))].join(" "))).toEqual([]);
  });
});
