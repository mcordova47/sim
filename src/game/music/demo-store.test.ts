import { describe, expect, it, vi } from "vitest";
import type { KeyValueStorage } from "../achievements/progress";
import { MAKE_TRACKS as M } from "../config";
import { DemoStore } from "./demo-store";
import { emptyGrid, placeNote, type DemoGrid } from "./demos";

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const KEY = M.storageKey;

// A grid with `notes` notes spread over the melody and the bass.
function grid(title: string, notes = 9): DemoGrid {
  const g = emptyGrid(title);
  for (let i = 0; i < notes; i++) placeNote(g, i % 2 ? "bass" : "melody", i, i % 2 ? 40 : 60, 1);
  return g;
}

const make = (storage: KeyValueStorage | null = memory(), reserved: string[] = ["Stop the music", "Morning (placeholder)"]) => {
  const log = vi.fn();
  return { store: new DemoStore(storage, KEY, { reserved: () => reserved, log }), log };
};

describe("saving tracks", () => {
  it("saves a track as .track text, lists it and gives it an id", () => {
    const { store } = make();
    const out = store.save(null, grid("Rainy Tuesday"));
    expect(out).toEqual({ ok: true, id: "demo-1", created: true });
    const [demo] = store.list();
    expect(demo.title).toBe("Rainy Tuesday");
    expect(demo.text.startsWith("title: Rainy Tuesday\ntempo: 100\n[melody square 0.6]")).toBe(true);
    expect(demo.track.id).toBe("demo-1");
    expect(demo.track.note).toBe("Your demo.");
    expect(store.tracks()).toHaveLength(1);
  });

  it("survives a reload: what was saved comes back", () => {
    const storage = memory();
    const { store } = make(storage);
    store.save(null, grid("One"));
    store.save(null, grid("Two"));
    const again = make(storage).store;
    expect(again.list().map((d) => d.title)).toEqual(["One", "Two"]);
    expect(again.save(null, grid("Three"))).toMatchObject({ id: "demo-3" });
  });

  it("changes a saved track in place and keeps its id", () => {
    const { store } = make();
    store.save(null, grid("One"));
    const g = grid("One renamed", 12);
    expect(store.save("demo-1", g)).toEqual({ ok: true, id: "demo-1", created: false });
    expect(store.list().map((d) => d.title)).toEqual(["One renamed"]);
    expect(store.count).toBe(1);
  });

  it("lets a track keep its own name when saved again", () => {
    const { store } = make();
    store.save(null, grid("One"));
    expect(store.save("demo-1", grid("One", 10)).ok).toBe(true);
    expect(store.save("demo-1", grid("one", 10)).ok).toBe(true);
  });

  it("never reuses an id, even after a delete", () => {
    const storage = memory();
    const { store } = make(storage);
    store.save(null, grid("One"));
    store.save(null, grid("Two"));
    expect(store.remove("demo-2")).toBe(true);
    expect(store.save(null, grid("Three"))).toMatchObject({ id: "demo-3" });
    // Nor after a reload.
    store.remove("demo-3");
    expect(make(storage).store.save(null, grid("Four"))).toMatchObject({ id: "demo-4" });
  });

  it("bumps its version when the list changes, so listeners can look again", () => {
    const { store } = make();
    const v = store.version;
    store.save(null, grid("One"));
    expect(store.version).toBe(v + 1);
    store.remove("demo-1");
    expect(store.version).toBe(v + 2);
    store.remove("demo-1");
    expect(store.version).toBe(v + 2);
  });

  it("clears the draft when it saves", () => {
    const { store } = make();
    store.setDraft(null, grid("Work"));
    store.save(null, grid("Work"));
    expect(store.draft()).toBeNull();
  });
});

describe("refusing bad input", () => {
  const code = (r: ReturnType<DemoStore["save"]>) => (r.ok ? "ok" : r.code);

  it("refuses an empty track, and bad names", () => {
    const { store } = make();
    expect(code(store.save(null, emptyGrid("Empty")))).toBe("empty");
    expect(code(store.save(null, grid("")))).toBe("name");
    expect(code(store.save(null, grid("   ")))).toBe("name");
    expect(code(store.save(null, grid("x".repeat(M.nameMax + 1))))).toBe("name");
    expect(code(store.save(null, grid("a:b")))).toBe("name");
    expect(code(store.save(null, grid("a#b")))).toBe("name");
    expect(store.count).toBe(0);
  });

  it("refuses a name that is taken: by a saved track, a record or the menu", () => {
    const { store } = make();
    store.save(null, grid("One"));
    expect(code(store.save(null, grid("one ")))).toBe("taken");
    expect(code(store.save(null, grid("Stop the music")))).toBe("taken");
    expect(code(store.save(null, grid("morning (placeholder)")))).toBe("taken");
    expect(store.count).toBe(1);
  });

  it("refuses a 13th track, but still lets an old one be changed", () => {
    const { store } = make();
    for (let i = 1; i <= M.maxTracks; i++) expect(store.save(null, grid(`T${i}`)).ok).toBe(true);
    const out = store.save(null, grid("One more"));
    expect(out).toMatchObject({ ok: false, code: "full" });
    expect(store.count).toBe(M.maxTracks);
    expect(store.save("demo-3", grid("T3", 20)).ok).toBe(true);
    // Deleting one makes room.
    store.remove("demo-1");
    expect(store.save(null, grid("One more")).ok).toBe(true);
  });

  it("treats a changed id that no longer exists as a new track", () => {
    const { store } = make();
    expect(store.save("demo-9", grid("Ghost"))).toMatchObject({ ok: true, created: true });
  });

  it("names nothing it refuses in a way that breaks the font", () => {
    const { store } = make();
    const out = store.save(null, grid(""));
    expect(out.ok).toBe(false);
  });

  it("starts new tracks as Untitled N", () => {
    const { store } = make();
    expect(store.nextName()).toBe("Untitled 1");
    store.save(null, grid("Untitled 1"));
    expect(store.nextName()).toBe("Untitled 2");
    store.setDraft(null, grid("Untitled 2"));
    expect(store.nextName()).toBe("Untitled 3");
  });
});

describe("deleting", () => {
  it("removes the track and leaves the others", () => {
    const { store } = make();
    store.save(null, grid("One"));
    store.save(null, grid("Two"));
    expect(store.remove("demo-1")).toBe(true);
    expect(store.list().map((d) => d.id)).toEqual(["demo-2"]);
    expect(store.remove("demo-1")).toBe(false);
    expect(store.remove("nope")).toBe(false);
  });

  it("turns a draft of a deleted track into a draft of a new one", () => {
    const { store } = make();
    store.save(null, grid("One"));
    store.setDraft("demo-1", grid("One"));
    store.remove("demo-1");
    expect(store.draft()!.id).toBeNull();
  });
});

describe("the draft", () => {
  it("is kept and read back, including after a reload", () => {
    const storage = memory();
    const { store } = make(storage);
    const g = grid("Work in progress");
    g.steps = 32;
    expect(store.setDraft("demo-4", g)).toBe(true);
    const again = make(storage).store.draft()!;
    expect(again.id).toBe("demo-4");
    expect(again.grid.steps).toBe(32);
  });

  it("keeps the id of the track being edited", () => {
    const storage = memory();
    const { store } = make(storage);
    store.save(null, grid("One"));
    store.setDraft("demo-1", grid("One changed"));
    const d = make(storage).store.draft()!;
    expect(d.id).toBe("demo-1");
    expect(d.grid.title).toBe("One changed");
  });

  it("is not listed as a demo and plays nowhere", () => {
    const { store } = make();
    store.setDraft(null, grid("Only a draft"));
    expect(store.list()).toEqual([]);
    expect(store.tracks()).toEqual([]);
  });

  it("returns a copy, so changing it does not change the saved draft", () => {
    const { store } = make();
    store.setDraft(null, grid("D"));
    store.draft()!.grid.title = "Changed";
    expect(store.draft()!.grid.title).toBe("D");
  });

  it("is forgotten with null", () => {
    const { store } = make();
    store.setDraft(null, grid("D"));
    store.setDraft(null, null);
    expect(store.draft()).toBeNull();
  });
});

describe("storage failures", () => {
  it("works in memory-less mode: nothing saves, nothing throws", () => {
    const { store } = make(null);
    expect(store.list()).toEqual([]);
    expect(store.save(null, grid("One"))).toMatchObject({ ok: false, code: "storage" });
    expect(store.count).toBe(0);
    expect(store.setDraft(null, grid("D"))).toBe(false);
    expect(store.draft()).not.toBeNull(); // kept for the session
    expect(store.remove("demo-1")).toBe(false);
  });

  it("tolerates getItem and setItem that throw", () => {
    const throwing: KeyValueStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };
    const { store, log } = make(throwing);
    expect(log).toHaveBeenCalled();
    expect(store.list()).toEqual([]);
    const out = store.save(null, grid("One"));
    expect(out).toMatchObject({ ok: false, code: "storage" });
    expect(store.count).toBe(0);
    expect(store.setDraft(null, grid("D"))).toBe(false);
    expect(store.claimReward(grid("R"))).toMatchObject({ paid: true });
  });

  it("puts everything back when a save fails to write, so the list matches storage", () => {
    const storage = memory();
    const { store } = make(storage);
    store.save(null, grid("One"));
    let full = true;
    const real = storage.setItem.bind(storage);
    storage.setItem = (k, v) => {
      if (full) throw new Error("quota");
      real(k, v);
    };
    expect(store.save(null, grid("Two"))).toMatchObject({ code: "storage" });
    expect(store.save("demo-1", grid("One edited"))).toMatchObject({ code: "storage" });
    expect(store.remove("demo-1")).toBe(false);
    expect(store.list().map((d) => d.title)).toEqual(["One"]);
    full = false;
    // The next id was not used up by the failed save.
    expect(store.save(null, grid("Two"))).toMatchObject({ id: "demo-2" });
  });

  it("starts empty on bad JSON, a wrong shape or a wrong type, without throwing", () => {
    for (const text of ["not json", "[]", "null", "5", '{"tracks":5}', '{"version":1}', ""]) {
      const storage = memory();
      storage.data.set(KEY, text);
      const { store } = make(storage);
      expect(store.list(), text).toEqual([]);
      // A first successful save writes a good one over it.
      expect(store.save(null, grid("One")).ok).toBe(true);
      expect(make(storage).store.list()).toHaveLength(1);
    }
  });

  it("drops bad entries one by one and keeps the good ones", () => {
    const storage = memory();
    const good = new DemoStore(memory(), KEY, { reserved: () => [] });
    good.save(null, grid("Good"));
    storage.data.set(
      KEY,
      JSON.stringify({
        version: 1,
        tracks: [
          { id: "demo-1", text: good.list()[0].text, made: 5 },
          { id: "demo-1", text: "dup", made: 5 },
          { id: "bad id", text: "x", made: 5 },
          { id: "demo-2" },
          null,
          7,
          { id: "demo-3", text: good.list()[0].text.replace("Good", "Third"), made: "x" },
        ],
        nextId: -3,
      }),
    );
    const { store } = make(storage);
    expect(store.list().map((d) => d.id)).toEqual(["demo-1", "demo-3"]);
    expect(store.save(null, grid("New"))).toMatchObject({ id: "demo-4" });
  });

  it("skips a saved track that no longer parses, logs it, and keeps it in storage untouched", () => {
    const storage = memory();
    const good = new DemoStore(memory(), KEY, { reserved: () => [] });
    good.save(null, grid("Good"));
    const broken = { id: "demo-2", text: "title: Broken\n[a square]\nZZ:1", made: 1 };
    storage.data.set(KEY, JSON.stringify({ version: 1, tracks: [{ id: "demo-1", text: good.list()[0].text, made: 1 }, broken], nextId: 3 }));
    const { store, log } = make(storage);
    expect(store.list().map((d) => d.id)).toEqual(["demo-1"]);
    expect(log).toHaveBeenCalledTimes(1);
    store.list();
    expect(log).toHaveBeenCalledTimes(1); // reported once
    store.save(null, grid("Another"));
    const saved = JSON.parse(storage.data.get(KEY)!);
    expect(saved.tracks.find((t: { id: string }) => t.id === "demo-2")).toEqual(broken);
  });

  it("refuses to write a save over the size limit", () => {
    const storage = memory();
    const { store } = make(storage);
    const g = grid("Big");
    expect(store.setDraft(null, g)).toBe(true);
    const huge = { ...g, title: "x".repeat(M.maxSaveBytes) };
    expect(store.setDraft(null, huge)).toBe(false);
  });
});

describe("the reward", () => {
  const minutes = (n: number) => () => n;

  it("pays for a track with enough notes on enough channels, once, then again after the cooldown", () => {
    const { store } = make();
    let now = 0;
    store.clock = () => now;
    expect(store.claimReward(grid("A"))).toEqual({ paid: true, points: 90, mood: 6 });
    expect(store.claimReward(grid("A"))).toEqual({ paid: false, why: "cooldown" });
    now = M.reward.cooldownHours * 60 - 1;
    expect(store.claimReward(grid("A"))).toEqual({ paid: false, why: "cooldown" });
    expect(store.rewardLeft()).toBeCloseTo(1);
    now = M.reward.cooldownHours * 60;
    expect(store.rewardLeft()).toBe(0);
    expect(store.claimReward(grid("A"))).toMatchObject({ paid: true });
    expect(store.rewardTimes).toBe(2);
  });

  it("does not pay for too few notes or a single channel, and does not start the cooldown then", () => {
    const { store } = make();
    store.clock = minutes(0);
    expect(store.claimReward(grid("A", 7))).toEqual({ paid: false, why: "notes" });
    const one = emptyGrid("One");
    for (let i = 0; i < 10; i++) placeNote(one, "melody", i, 60, 1);
    expect(store.claimReward(one)).toEqual({ paid: false, why: "notes" });
    expect(store.claimReward(grid("A", 8))).toMatchObject({ paid: true });
  });

  it("counts notes the way they will be written: notes past the end or overlapped do not count", () => {
    const { store } = make();
    const g = grid("A", 9);
    g.steps = 4;
    expect(store.claimReward(g)).toEqual({ paid: false, why: "notes" });
  });

  it("keeps the cooldown across a reload (counted from the first look in the new session)", () => {
    const storage = memory();
    const first = make(storage).store;
    first.clock = minutes(100);
    first.claimReward(grid("A"));
    first.clock = minutes(160); // an hour later, written with the next save
    first.setDraft(null, grid("D"));
    const again = make(storage).store;
    again.clock = minutes(0);
    expect(again.rewardLeft()).toBeCloseTo(M.reward.cooldownHours * 60 - 60);
    expect(again.claimReward(grid("A"))).toEqual({ paid: false, why: "cooldown" });
    again.clock = minutes(M.reward.cooldownHours * 60);
    expect(again.claimReward(grid("A"))).toMatchObject({ paid: true });
  });

  it("is not moved backwards by a clock that goes back", () => {
    const { store } = make();
    let now = 500;
    store.clock = () => now;
    store.claimReward(grid("A"));
    now = 0;
    expect(store.rewardLeft()).toBe(M.reward.cooldownHours * 60);
  });

  it("starts with no cooldown from a damaged save", () => {
    const storage = memory();
    storage.data.set(KEY, JSON.stringify({ version: 1, tracks: [], reward: { cooldownLeft: "lots", times: -4 } }));
    const { store } = make(storage);
    expect(store.rewardLeft()).toBe(0);
    expect(store.rewardTimes).toBe(0);
  });
});
