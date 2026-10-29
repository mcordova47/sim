import { describe, expect, it, vi } from "vitest";
import { addPhotos, summaryLines } from "./photo-add";
import type { DecodedImage, PhotoIO } from "./photo-io";
import { REEL_CAP, createMemoryReelStore, type ReelStore } from "./reel-store";

// Synthetic images only: a gradient whose slope depends on the seed. Never a real picture.
function image(seed: number, width = 200, height = 150): DecodedImage {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const v = ((x * (1 + (seed % 7)) + y * (1 + (seed % 5)) + seed * 13) * 3) % 256;
      rgba[o] = v;
      rgba[o + 1] = (v * 2 + seed) % 256;
      rgba[o + 2] = 255 - v;
      rgba[o + 3] = 255;
    }
  return { rgba, width, height };
}

function fakeIO(images: Map<Blob, DecodedImage | null | "throw">) {
  const decoded: Blob[] = [];
  const io: PhotoIO = {
    pickImages: async () => null,
    decode: async (f) => {
      decoded.push(f);
      const v = images.get(f);
      if (v === "throw") throw new Error("bad");
      return v ?? null;
    },
    keepStorage: vi.fn(),
  };
  return { io, decoded };
}

const files = (n: number) => Array.from({ length: n }, (_, i) => new Blob([`f${i}`]));

describe("adding pictures", () => {
  it("many files: each is decoded one at a time, made small and stored; progress is reported", async () => {
    const f = files(5);
    const { io } = fakeIO(new Map(f.map((b, i) => [b, image(i)])));
    const store = createMemoryReelStore();
    const progress: Array<[number, number]> = [];
    const s = await addPhotos(f, io, store, (d, t) => progress.push([d, t]));
    expect(s).toEqual({ added: 5, duplicates: 0, full: 0, unreadable: 0, storageError: false });
    expect((await store.list()).length).toBe(5);
    expect(progress).toEqual([[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]);
    expect(io.keepStorage).toHaveBeenCalledTimes(1);
  });

  it("one that cannot be decoded (null or a throw) is skipped and counted", async () => {
    const f = files(4);
    const { io } = fakeIO(new Map<Blob, DecodedImage | null | "throw">([[f[0], image(0)], [f[1], null], [f[2], "throw"], [f[3], image(3)]]));
    const store = createMemoryReelStore();
    const s = await addPhotos(f, io, store);
    expect(s.added).toBe(2);
    expect(s.unreadable).toBe(2);
    expect(summaryLines(s)).toEqual(["2 pictures added.", "2 could not be read."]);
  });

  it("over the cap: the first that fit are kept, the rest are not even decoded, and the page says so", async () => {
    const store = createMemoryReelStore();
    const first = files(58);
    await addPhotos(first, fakeIO(new Map(first.map((b, i) => [b, image(i)]))).io, store);
    expect((await store.list()).length).toBe(58);
    const more = files(5);
    const { io, decoded } = fakeIO(new Map(more.map((b, i) => [b, image(100 + i)])));
    const s = await addPhotos(more, io, store);
    expect(s.added).toBe(2);
    expect(s.full).toBe(3);
    expect(decoded.length).toBe(2);
    expect((await store.list()).length).toBe(REEL_CAP);
    expect(summaryLines(s)).toEqual(["2 pictures added.", `Room for ${REEL_CAP}. The rest stayed where they were.`]);
  });

  it("a full reel decodes nothing", async () => {
    const store = createMemoryReelStore(2);
    const a = files(2);
    await addPhotos(a, fakeIO(new Map(a.map((b, i) => [b, image(i)]))).io, store);
    // The default cap is 60, so use a store that is really full.
    const full = createMemoryReelStore();
    const many = files(REEL_CAP);
    await addPhotos(many, fakeIO(new Map(many.map((b, i) => [b, image(i)]))).io, full);
    const extra = files(3);
    const { io, decoded } = fakeIO(new Map(extra.map((b, i) => [b, image(500 + i)])));
    const s = await addPhotos(extra, io, full);
    expect(decoded).toEqual([]);
    expect(s.full).toBe(3);
    expect(io.keepStorage).not.toHaveBeenCalled();
  });

  it("the same picture twice is stored once", async () => {
    const f = files(2);
    const { io } = fakeIO(new Map([[f[0], image(1)], [f[1], image(1)]]));
    const store = createMemoryReelStore();
    const s = await addPhotos(f, io, store);
    expect(s.added).toBe(1);
    expect(s.duplicates).toBe(1);
    expect(summaryLines(s)).toEqual(["1 picture added.", "1 was already here."]);
  });

  it("nothing but palette indices reaches the store: the decoded bytes are not in any record", async () => {
    const f = files(3);
    const images = f.map((_, i) => image(i, 300, 225));
    const { io } = fakeIO(new Map(f.map((b, i) => [b, images[i]])));
    const store = createMemoryReelStore();
    await addPhotos(f, io, store);
    for (const rec of await store.list()) {
      expect(Object.keys(rec).sort()).toEqual(["h", "id", "palette", "px", "w"]);
      expect([rec.w, rec.h]).toEqual([48, 36]);
      expect(rec.px.length).toBe(48 * 36);
      expect(Math.max(...rec.px)).toBeLessThanOrEqual(21);
      for (const raw of images) expect(rec.px.length).toBeLessThan(raw.rgba.length);
    }
  });

  it("a portrait picture is stored 36 x 48", async () => {
    const f = files(1);
    const { io } = fakeIO(new Map([[f[0], image(2, 150, 200)]]));
    const store = createMemoryReelStore();
    await addPhotos(f, io, store);
    const [rec] = await store.list();
    expect([rec.w, rec.h]).toEqual([36, 48]);
  });

  it("a storage error in the middle of the add is caught and the count comes from a fresh list", async () => {
    const f = files(3);
    const { io } = fakeIO(new Map(f.map((b, i) => [b, image(i)])));
    const inner = createMemoryReelStore();
    const flaky: ReelStore = {
      ...inner,
      add: async (pics) => {
        await inner.add(pics.slice(0, 2));
        throw new Error("quota");
      },
    };
    const s = await addPhotos(f, io, flaky);
    expect(s.storageError).toBe(true);
    expect(s.added).toBe(2);
    expect(summaryLines(s)).toEqual(["2 pictures added.", "This browser could not keep them all."]);
  });

  it("a store that cannot even be listed gives an error summary, not a throw", async () => {
    const f = files(1);
    const { io } = fakeIO(new Map([[f[0], image(0)]]));
    const broken: ReelStore = { list: async () => Promise.reject(new Error("x")), add: async () => Promise.reject(new Error("x")), remove: async () => {}, clear: async () => {} };
    const s = await addPhotos(f, io, broken);
    expect(s.storageError).toBe(true);
    expect(s.added).toBe(0);
  });

  it("every line of text avoids resolution, size and pixels", () => {
    const all = summaryLines({ added: 3, duplicates: 2, full: 1, unreadable: 1, storageError: true }).concat(summaryLines({ added: 0, duplicates: 0, full: 0, unreadable: 0, storageError: false }));
    for (const line of all) expect(line).not.toMatch(/pixel|resolution|small|tiny|low|size/i);
  });
});
