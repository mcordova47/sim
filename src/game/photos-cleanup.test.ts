import { describe, expect, it } from "vitest";
import { CLEANUP_DONE_KEY, OLD_LOOK_KEY, OLD_REEL_DB, removeOldPhotos, type CleanupStorage } from "./photos-cleanup";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const s: CleanupStorage & { data: Map<string, string> } = {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
  return s;
}

// A fake IndexedDB factory: deleteDatabase answers on the next microtask with the chosen outcome.
function fakeIdb(outcome: "success" | "error" | "blocked" | "throws" = "success") {
  const deleted: string[] = [];
  return {
    deleted,
    deleteDatabase(name: string) {
      if (outcome === "throws") throw new Error("denied");
      deleted.push(name);
      const req: any = {};
      queueMicrotask(() => (outcome === "success" ? req.onsuccess?.() : outcome === "error" ? req.onerror?.() : req.onblocked?.()));
      return req;
    },
  } as any;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("removeOldPhotos (issue 180)", () => {
  it("deletes the database and the look key, then remembers it is done", async () => {
    const storage = fakeStorage({ [OLD_LOOK_KEY]: '{"look":"crisp"}', "life.progress.v1": "keep me" });
    const idb = fakeIdb();
    removeOldPhotos({ storage, indexedDB: idb });
    await tick();
    expect(idb.deleted).toEqual([OLD_REEL_DB]);
    expect(storage.data.has(OLD_LOOK_KEY)).toBe(false);
    expect(storage.data.get(CLEANUP_DONE_KEY)).toBe("1");
    expect(storage.data.get("life.progress.v1")).toBe("keep me");
  });

  it("does nothing the second time", async () => {
    const storage = fakeStorage();
    const idb = fakeIdb();
    removeOldPhotos({ storage, indexedDB: idb });
    await tick();
    storage.data.set(OLD_LOOK_KEY, "x");
    removeOldPhotos({ storage, indexedDB: idb });
    await tick();
    expect(idb.deleted).toHaveLength(1);
    expect(storage.data.get(OLD_LOOK_KEY)).toBe("x");
  });

  it("tries again next load when the browser cannot confirm the delete (blocked or an error)", async () => {
    for (const outcome of ["blocked", "error"] as const) {
      const storage = fakeStorage();
      removeOldPhotos({ storage, indexedDB: fakeIdb(outcome) });
      await tick();
      expect(storage.data.has(CLEANUP_DONE_KEY)).toBe(false);
    }
  });

  it("never throws: blocked storage, a throwing IndexedDB, nothing at all", () => {
    const angry: CleanupStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    const writeOnly: CleanupStorage = { ...fakeStorage(), setItem: () => { throw new Error("full"); } };
    expect(() => removeOldPhotos({ storage: angry, indexedDB: fakeIdb() })).not.toThrow();
    expect(() => removeOldPhotos({ storage: writeOnly, indexedDB: fakeIdb() })).not.toThrow();
    expect(() => removeOldPhotos({ storage: fakeStorage(), indexedDB: fakeIdb("throws") })).not.toThrow();
    expect(() => removeOldPhotos({ storage: null, indexedDB: null })).not.toThrow();
    expect(() => removeOldPhotos({})).not.toThrow();
  });

  it("with no IndexedDB there is nothing to delete, so it is done at once", () => {
    const storage = fakeStorage({ [OLD_LOOK_KEY]: "x" });
    removeOldPhotos({ storage, indexedDB: null });
    expect(storage.data.has(OLD_LOOK_KEY)).toBe(false);
    expect(storage.data.get(CLEANUP_DONE_KEY)).toBe("1");
  });

  it("the default environment (no browser here) does not throw", () => {
    expect(() => removeOldPhotos()).not.toThrow();
  });
});
