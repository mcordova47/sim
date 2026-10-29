import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { addPhotos } from "./photo-add";
import type { PhotoIO } from "./photo-io";
import { DEFAULT_LOOK_ID, REEL_LOOKS, isLookId, lookById, lookSizes } from "./looks";
import { LOOK_SETTINGS_KEY, loadLook, saveLook } from "./look-settings";
import { pixelate } from "./pixelate";
import { REEL_SIZES, createMemoryBackend, createMemoryReelStore, createReelStore, isValidPic } from "./reel-store";

// Synthetic pictures only (a gradient with seeded noise). Never a real picture.
function synth(w: number, h: number): Uint8ClampedArray {
  const a = new Uint8ClampedArray(w * h * 4);
  let s = 12345;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const i = (y * w + x) * 4;
      a[i] = (x * 255) / w;
      a[i + 1] = (y * 255) / h;
      a[i + 2] = (s >> 16) & 255;
      a[i + 3] = 255;
    }
  return a;
}
// FNV-1a over the bytes, twice with different seeds (no node types in this project).
function sha(px: Uint8Array): string {
  const h = (seed: number) => {
    let x = seed;
    for (const b of px) x = Math.imul(x ^ b, 16777619) >>> 0;
    return x.toString(16).padStart(8, "0");
  };
  return `${px.length}:${h(2166136261)}${h(84696351)}`;
}

describe("the default look is exactly what 113 made (golden)", () => {
  // Recorded from the code before 117a changed anything (cross-checked then against sha256 of the same pixels).
  const GOLDEN: Array<[number, number, number, number, string]> = [
    [200, 150, 48, 36, "1728:f09abe5d15d7e607"],
    [150, 200, 36, 48, "1728:c116ea3a5712b8ec"],
    [100, 100, 48, 36, "1728:331f5bfda783d3bf"],
  ];
  for (const [w, h, ow, oh, hash] of GOLDEN) {
    it(`pixelate with no options, ${w} x ${h}`, () => {
      const r = pixelate(synth(w, h), w, h);
      expect([r.w, r.h, sha(r.px)]).toEqual([ow, oh, hash]);
    });
    it(`pixelate with the Soft preset gives the same pixels, ${w} x ${h}`, () => {
      const soft = lookById("soft");
      const r = pixelate(synth(w, h), w, h, { size: { w: soft.w, h: soft.h }, dither: soft.dither });
      expect([r.w, r.h, sha(r.px)]).toEqual([ow, oh, hash]);
    });
  }
  it("addPhotos with no look argument stores the golden pixels, with no look field (absent reads as soft)", async () => {
    const f = new Blob(["a"]);
    const io: PhotoIO = { pickImages: async () => null, decode: async () => ({ rgba: synth(200, 150), width: 200, height: 150 }), keepStorage: () => {} };
    const store = createMemoryReelStore();
    await addPhotos([f], io, store);
    const [pic] = await store.list();
    expect([pic.w, pic.h, sha(pic.px), pic.look]).toEqual([48, 36, GOLDEN[0][4], undefined]);
  });
});

describe("looks", () => {
  it("presets are as designed and the default is soft", () => {
    expect(REEL_LOOKS.map((l) => [l.id, l.w, l.h, l.dither])).toEqual([["crisp", 64, 48, 10], ["soft", 48, 36, 20], ["chunky", 32, 24, 30]]);
    expect(DEFAULT_LOOK_ID).toBe("soft");
    expect(isLookId("crisp")).toBe(true);
    expect(isLookId("nope")).toBe(false);
    expect(isLookId(undefined)).toBe(false);
    expect(lookById("nope").id).toBe("soft");
  });
  it("sizes are derived from the presets, with portrait twins, and still include today's two", () => {
    expect(REEL_SIZES).toEqual(lookSizes());
    expect(REEL_SIZES).toHaveLength(6);
    expect(REEL_SIZES).toContainEqual({ w: 48, h: 36 });
    expect(REEL_SIZES).toContainEqual({ w: 36, h: 48 });
    expect(REEL_SIZES).toContainEqual({ w: 48, h: 64 });
    expect(REEL_SIZES).toContainEqual({ w: 24, h: 32 });
  });
  for (const l of REEL_LOOKS) {
    it(`pixelate makes ${l.name} pictures in both orientations`, () => {
      const a = pixelate(synth(200, 150), 200, 150, { size: l, dither: l.dither });
      const b = pixelate(synth(150, 200), 150, 200, { size: l, dither: l.dither });
      expect([a.w, a.h, a.px.length]).toEqual([l.w, l.h, l.w * l.h]);
      expect([b.w, b.h, b.px.length]).toEqual([l.h, l.w, l.w * l.h]);
      expect(isValidPic(a)).toBe(true);
      expect(isValidPic(b)).toBe(true);
    });
  }
  it("pixelate rejects a bad size", () => {
    expect(() => pixelate(synth(10, 10), 10, 10, { size: { w: 0, h: 4 } })).toThrow();
    expect(() => pixelate(synth(10, 10), 10, 10, { size: { w: 4.5, h: 4 } })).toThrow();
  });
});

describe("the store and looks", () => {
  const pic = (w: number, h: number, fill = 3, look?: string) => ({ w, h, px: new Uint8Array(w * h).fill(fill), look });
  it("an old record with no look stays valid and lists with no look (read as soft)", async () => {
    const backend = createMemoryBackend();
    await backend.put({ w: 48, h: 36, px: new Uint8Array(48 * 36) });
    const store = createReelStore(backend);
    const [p] = await store.list();
    expect(p.look).toBeUndefined();
    expect(Object.keys(p).sort()).toEqual(["h", "id", "palette", "px", "w"]);
    expect(lookById(p.look).id).toBe("soft");
    expect(isValidPic(p)).toBe(true);
  });
  it("add keeps a known look and drops an unknown one; the pixel size, not the look, decides validity", async () => {
    const store = createMemoryReelStore();
    const r = await store.add([pic(64, 48, 1, "crisp"), pic(24, 32, 2, "chunky"), pic(48, 36, 3, "bogus"), pic(48, 36, 4)]);
    expect(r).toEqual({ added: 4, duplicates: 0, full: 0, invalid: 0 });
    const l = await store.list();
    expect(l.map((p) => p.look)).toEqual(["crisp", "chunky", undefined, undefined]);
    expect(l.every((p) => p.palette === 1)).toBe(true);
  });
  it("a hand-made record of another size is still invalid, whatever its look", async () => {
    const store = createMemoryReelStore();
    const r = await store.add([pic(65, 48, 1, "crisp"), pic(48, 48, 1), pic(96, 72, 1, "soft")]);
    expect(r.invalid).toBe(3);
    expect(r.added).toBe(0);
  });
  it("the same photo at two looks is two pictures; counts against the cap of 60 by record", async () => {
    const store = createMemoryReelStore(2);
    const r = await store.add([pic(48, 36, 5), pic(64, 48, 5), pic(32, 24, 5)]);
    expect(r).toEqual({ added: 2, duplicates: 0, full: 1, invalid: 0 });
  });
  it("remove deletes one picture and leaves the rest", async () => {
    const store = createMemoryReelStore();
    await store.add([pic(48, 36, 1), pic(64, 48, 2), pic(32, 24, 3)]);
    const [a, b, c] = await store.list();
    await store.remove(b.id);
    expect((await store.list()).map((p) => p.id)).toEqual([a.id, c.id]);
    await store.remove(9999);
    expect(await store.list()).toHaveLength(2);
  });
  it("addPhotos at each look stores that size and look id (soft is stored as absent); an unknown look id falls back to soft", async () => {
    for (const l of REEL_LOOKS) {
      const io: PhotoIO = { pickImages: async () => null, decode: async () => ({ rgba: synth(120, 160), width: 120, height: 160 }), keepStorage: () => {} };
      const store = createMemoryReelStore();
      const s = await addPhotos([new Blob(["x"])], io, store, () => {}, l.id);
      expect(s.added).toBe(1);
      const [p] = await store.list();
      expect([p.w, p.h, p.look]).toEqual([l.h, l.w, l.id === "soft" ? undefined : l.id]);
    }
    const io: PhotoIO = { pickImages: async () => null, decode: async () => ({ rgba: synth(120, 160), width: 120, height: 160 }), keepStorage: () => {} };
    const store = createMemoryReelStore();
    await addPhotos([new Blob(["x"])], io, store, () => {}, "bogus");
    const [p] = await store.list();
    expect([p.w, p.h, p.look]).toEqual([36, 48, undefined]);
  });
});

describe("look settings", () => {
  it("defaults to soft when nothing, junk or an unknown look is stored", () => {
    const s = new FakeStorage();
    expect(loadLook(s)).toBe("soft");
    s.setItem(LOOK_SETTINGS_KEY, "not json");
    expect(loadLook(s)).toBe("soft");
    s.setItem(LOOK_SETTINGS_KEY, JSON.stringify({ look: "huge" }));
    expect(loadLook(s)).toBe("soft");
    s.setItem(LOOK_SETTINGS_KEY, "null");
    expect(loadLook(s)).toBe("soft");
    expect(loadLook(null)).toBe("soft");
  });
  it("round trips under its own key only", () => {
    const s = new FakeStorage();
    expect(saveLook("chunky", s)).toBe(true);
    expect(loadLook(s)).toBe("chunky");
    expect([...s.data.keys()]).toEqual(["life.reel.look.v1"]);
    expect(saveLook("bogus", s)).toBe(false);
    expect(loadLook(s)).toBe("chunky");
  });
  it("survives storage that throws", () => {
    const bad = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
    expect(loadLook(bad)).toBe("soft");
    expect(saveLook("crisp", bad)).toBe(false);
    expect(saveLook("crisp", null)).toBe(false);
  });
});
