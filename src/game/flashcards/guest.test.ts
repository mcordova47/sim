import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { FLASHCARDS as F } from "../config";
import type { Core } from "./core";
import { clearGuestCards, guestBackend, guestStorageKey } from "./guest";
import { StudyStore } from "./key";
import type { StudySession } from "./study";

const KEY = "abcdefghij0123456789abcdefghij01";

// The same stand-in as real.test.ts: progress is a JSON string {slug: seen}.
function fakeCore(overrides: Partial<Core> = {}): Core {
  const read = (p: string | null): Record<string, number> => (p ? JSON.parse(p) : {});
  return {
    version: 1,
    session: (p) => ["a", "b", "c"].filter((s) => !(s in read(p))),
    card: (_p, slug) => ({ slug, prompt: slug.toUpperCase(), answers: [`${slug}1`], example: "", direction: "recognition" }),
    grade: (p, slug) => JSON.stringify({ ...read(p), [slug]: (read(p)[slug] ?? 0) + 1 }),
    merge: () => {
      throw new Error("a guest never merges");
    },
    requeue: (slug, position, queue) => [...queue.slice(0, position + 1), slug, ...queue.slice(position + 1)],
    ...overrides,
  };
}

const guest = (storage: FakeStorage | null, core: Core = fakeCore()) => guestBackend({ core: async () => core, storage, now: () => 1000 });
const session = async (storage: FakeStorage | null, core?: Core) => (await guest(storage, core).open("")) as StudySession;

afterEach(() => vi.unstubAllGlobals());

describe("the guest backend", () => {
  it("studies end to end with a fake storage, and the next visit remembers it", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const storage = new FakeStorage();
    const s1 = await session(storage);
    expect(s1.queue()).toEqual(["a", "b", "c"]);
    expect(s1.card("a").prompt).toBe("A");
    expect(await s1.grade("a", "gotit")).toBe(true);
    expect(s1.unsaved).toBe(false);
    expect(storage.getItem(guestStorageKey())).toBe('{"a":1}');
    // A second visit, on the same storage, starts after the card already seen.
    expect((await session(storage)).queue()).toEqual(["b", "c"]);
    // No request of any kind: the guest backend never touches the network itself.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps its blob under a key that carries the language, apart from the sync key record", async () => {
    expect(guestStorageKey()).toBe(`life.flashcards.guest.${F.language}.v1`);
    expect(guestStorageKey()).not.toBe(F.storageKey);
  });

  it("says unreadable when the core refuses the saved cards, and leaves them untouched", async () => {
    const storage = new FakeStorage();
    storage.setItem(guestStorageKey(), "from the future");
    const refusing = fakeCore({
      session: (p) => {
        if (p === "from the future") throw new Error("newer format");
        return [];
      },
    });
    expect(await guest(storage, refusing).open("")).toBe("unreadable");
    expect(storage.getItem(guestStorageKey())).toBe("from the future");
    guest(storage, refusing).forget!();
    expect(storage.getItem(guestStorageKey())).toBeNull();
    expect((await guest(storage, refusing).open("")) as StudySession).toHaveProperty("queue");
  });

  it("is offline when the core cannot be loaded", async () => {
    const backend = guestBackend({ core: async () => Promise.reject(new Error("down")), storage: new FakeStorage() });
    expect(await backend.open("")).toBe("offline");
  });

  it("studies unsaved when there is no storage, or when reading it throws, and reports it", async () => {
    const none = await session(null);
    expect(none.unsaved).toBe(true);
    expect(await none.grade("a", "gotit")).toBe(true);
    // The session still moves on from memory.
    expect(none.card("b").prompt).toBe("B");
    const throwing = new FakeStorage();
    throwing.getItem = () => {
      throw new Error("blocked");
    };
    expect((await session(throwing)).unsaved).toBe(true);
  });

  it("becomes unsaved when the write fails part-way (a full or blocked store)", async () => {
    const storage = new FakeStorage();
    const s = await session(storage);
    expect(s.unsaved).toBe(false);
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(await s.grade("a", "gotit")).toBe(true);
    expect(s.unsaved).toBe(true);
  });

  it("never touches the sync key record", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const before = storage.getItem(F.storageKey);
    await (await session(storage)).grade("a", "again");
    expect(storage.getItem(F.storageKey)).toBe(before);
  });

  it("clearGuestCards never throws", () => {
    const bad = new FakeStorage();
    bad.removeItem = () => {
      throw new Error("blocked");
    };
    expect(() => clearGuestCards(bad)).not.toThrow();
    expect(() => clearGuestCards(null)).not.toThrow();
  });
});
