import { describe, expect, it } from "vitest";
import {
  REEL_CAP,
  REEL_DB_NAME,
  REEL_STORE_NAME,
  createIndexedDbBackend,
  createMemoryReelStore,
  createReelStore,
  openReelStore,
  type ReelPicInput,
  type ReelStore,
} from "./reel-store";

// Synthetic pictures only: a flat fill of one palette index, with a marker so
// each seed gives different pixels.
function pic(seed: number, w = 48, h = 36): ReelPicInput {
  const px = new Uint8Array(w * h).fill(seed % 22);
  px[0] = Math.floor(seed / 22) % 22;
  px[1] = Math.floor(seed / 484) % 22;
  return { w, h, px };
}

// A minimal fake IndexedDB: just what the backend uses.
function fakeIdb() {
  const rows = new Map<number, unknown>();
  let nextId = 1;
  let upgraded = 0;
  let opened = 0;
  const req = <T,>(run: () => T) => {
    const r: any = { result: undefined, error: null };
    queueMicrotask(() => {
      r.result = run();
      r.onsuccess?.();
    });
    return r;
  };
  const store = (tx: any) => ({
    add: (v: any) =>
      req(() => {
        const id = nextId++;
        rows.set(id, { ...v, id, px: new Uint8Array(v.px) });
        tx.pending++;
        queueMicrotask(() => tx.finish());
        return id;
      }),
    getAll: () => req(() => [...rows.values()]),
    delete: (id: number) => {
      rows.delete(id);
      tx.pending++;
      queueMicrotask(() => tx.finish());
    },
    clear: () => {
      rows.clear();
      tx.pending++;
      queueMicrotask(() => tx.finish());
    },
  });
  const db: any = {
    createObjectStore: (name: string, opts: any) => {
      expect(name).toBe(REEL_STORE_NAME);
      expect(opts).toEqual({ keyPath: "id", autoIncrement: true });
    },
    transaction: () => {
      const tx: any = { pending: 0 };
      tx.finish = () => {
        if (--tx.pending <= 0) tx.oncomplete?.();
      };
      tx.objectStore = () => store(tx);
      // Reads need a no-op completion too.
      return tx;
    },
  };
  const factory = {
    open: (name: string, version: number) => {
      expect(name).toBe(REEL_DB_NAME);
      expect(version).toBe(1);
      opened++;
      const r: any = { result: db, error: null };
      queueMicrotask(() => {
        if (opened === 1) {
          upgraded++;
          r.onupgradeneeded?.();
        }
        r.onsuccess?.();
      });
      return r;
    },
  } as unknown as IDBFactory;
  return { factory, rows, counts: () => ({ upgraded, opened }) };
}

function suite(name: string, make: () => ReelStore) {
  describe(name, () => {
    it("starts empty", async () => {
      expect(await make().list()).toEqual([]);
    });

    it("adds and lists in order with ids and palette 1", async () => {
      const s = make();
      const r = await s.add([pic(1), pic(2), pic(3)]);
      expect(r).toEqual({ added: 3, duplicates: 0, full: 0, invalid: 0 });
      const list = await s.list();
      expect(list.map((p) => p.px[2])).toEqual([1, 2, 3]);
      expect(new Set(list.map((p) => p.id)).size).toBe(3);
      expect(list.every((p) => p.palette === 1 && p.w === 48 && p.h === 36)).toBe(true);
      expect(Object.keys(list[0]).sort()).toEqual(["h", "id", "palette", "px", "w"]);
    });

    it("stores portrait pictures", async () => {
      const s = make();
      await s.add([pic(4, 36, 48)]);
      const [p] = await s.list();
      expect([p.w, p.h]).toEqual([36, 48]);
    });

    it("removes one and keeps the rest", async () => {
      const s = make();
      await s.add([pic(1), pic(2), pic(3)]);
      const list = await s.list();
      await s.remove(list[1].id);
      expect((await s.list()).map((p) => p.px[2])).toEqual([1, 3]);
      await s.remove(9999); // unknown id is harmless
      expect(await s.list()).toHaveLength(2);
    });

    it("clear empties the store, and it can be filled again", async () => {
      const s = make();
      await s.add([pic(1), pic(2)]);
      await s.clear();
      expect(await s.list()).toEqual([]);
      expect((await s.add([pic(1)])).added).toBe(1);
    });

    it("skips duplicates, across calls and inside one batch", async () => {
      const s = make();
      await s.add([pic(1), pic(2)]);
      const r = await s.add([pic(2), pic(3), pic(3)]);
      expect(r).toEqual({ added: 1, duplicates: 2, full: 0, invalid: 0 });
      expect(await s.list()).toHaveLength(3);
    });

    it("same pixels in a different size are not duplicates", async () => {
      const s = make();
      await s.add([{ w: 48, h: 36, px: new Uint8Array(1728) }]);
      const r = await s.add([{ w: 36, h: 48, px: new Uint8Array(1728) }]);
      expect(r.added).toBe(1);
    });

    it("caps at 60 and keeps the first that fit", async () => {
      const s = make();
      const batch = Array.from({ length: 65 }, (_, i) => pic(i));
      const r = await s.add(batch);
      expect(r).toEqual({ added: REEL_CAP, duplicates: 0, full: 5, invalid: 0 });
      const list = await s.list();
      expect(list).toHaveLength(60);
      expect(Array.from(list[59].px)).toEqual(Array.from(pic(59).px));
      expect((await s.add([pic(100)])).full).toBe(1);
      await s.remove(list[0].id);
      expect((await s.add([pic(100)])).added).toBe(1);
    });

    it("rejects invalid pictures", async () => {
      const s = make();
      const r = await s.add([
        { w: 10, h: 10, px: new Uint8Array(100) },
        { w: 48, h: 36, px: new Uint8Array(5) },
        { w: 48, h: 36, px: new Uint8Array(1728).fill(22) },
        pic(7),
      ]);
      expect(r).toEqual({ added: 1, duplicates: 0, full: 0, invalid: 3 });
    });

    it("does not alias the caller's pixel array", async () => {
      const s = make();
      const p = pic(5);
      await s.add([p]);
      p.px.fill(0);
      expect((await s.list())[0].px[2]).toBe(5);
    });

    it("overlapping adds still respect the cap", async () => {
      const s = make();
      const a = s.add(Array.from({ length: 40 }, (_, i) => pic(i)));
      const b = s.add(Array.from({ length: 40 }, (_, i) => pic(100 + i)));
      const [ra, rb] = await Promise.all([a, b]);
      expect(ra.added + rb.added).toBe(60);
      expect(await s.list()).toHaveLength(60);
    });
  });
}

suite("memory store", () => createMemoryReelStore());
suite("IndexedDB store (fake factory)", () => createReelStore(createIndexedDbBackend(fakeIdb().factory)));

describe("IndexedDB details", () => {
  it("creates the object store once and persists across store instances", async () => {
    const { factory, counts } = fakeIdb();
    await createReelStore(createIndexedDbBackend(factory)).add([pic(1)]);
    const again = createReelStore(createIndexedDbBackend(factory));
    expect(await again.list()).toHaveLength(1);
    expect(counts().upgraded).toBe(1);
  });
});

describe("openReelStore", () => {
  it("falls back to memory, flagged not persistent, with no IndexedDB", async () => {
    const h = openReelStore(null);
    expect(h.persistent).toBe(false);
    expect((await h.store.add([pic(1)])).added).toBe(1);
  });
  it("uses IndexedDB when given one", () => {
    expect(openReelStore(fakeIdb().factory).persistent).toBe(true);
  });
});
