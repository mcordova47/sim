import { describe, expect, it } from "vitest";
import { FakeStorage } from "./fake-storage";
import { ProgressStore, parseWorld, type KeyValueStorage } from "./progress";
import { Stats } from "./stats";

const world = { vars: { dishes: 3, energy: 40 }, room: "kitchen", col: 4, row: 2, facing: "left" as const };

describe("ProgressStore", () => {
  it("saves and loads unlocks, stats and the world", () => {
    const storage = new FakeStorage();
    const stats = new Stats();
    stats.stepped();
    const store = new ProgressStore(storage, "k");
    expect(store.save(["a", "b"], stats.toJSON(), world)).toBe(true);
    const loaded = new ProgressStore(storage, "k").load();
    expect(loaded.unlocked).toEqual(["a", "b"]);
    expect(new Stats(loaded.stats).number("steps")).toBe(1);
    expect(loaded.world).toEqual(world);
  });

  it("stores under the key it was given, with a version in the saved value", () => {
    const storage = new FakeStorage();
    new ProgressStore(storage, "life.progress.v1").save([], new Stats().toJSON(), null);
    expect([...storage.data.keys()]).toEqual(["life.progress.v1"]);
    expect(JSON.parse(storage.data.get("life.progress.v1")!).version).toBe(1);
  });

  it("loads an empty start when nothing is saved", () => {
    expect(new ProgressStore(new FakeStorage(), "k").load()).toEqual({ unlocked: [], stats: undefined, world: null });
  });

  it.each(["{not json", "[]", "null", "42", '"text"', '{"version":99,"unlocked":["a"]}', '{"unlocked":["a"]}'])(
    "ignores a corrupt or foreign saved value: %s",
    (text) => {
      const storage = new FakeStorage();
      storage.setItem("k", text);
      expect(new ProgressStore(storage, "k").load()).toEqual({ unlocked: [], stats: undefined, world: null });
    },
  );

  it("keeps the good fields of a half-damaged save", () => {
    const storage = new FakeStorage();
    storage.setItem("k", JSON.stringify({ version: 1, unlocked: ["a", 5, null], stats: { steps: 9 }, world: "bad" }));
    const loaded = new ProgressStore(storage, "k").load();
    expect(loaded.unlocked).toEqual(["a"]);
    expect(new Stats(loaded.stats).number("steps")).toBe(9);
    expect(loaded.world).toBeNull();
  });

  it("works with no storage at all", () => {
    const store = new ProgressStore(null, "k");
    expect(store.load().unlocked).toEqual([]);
    expect(store.save([], new Stats().toJSON(), null)).toBe(false);
    expect(() => store.clear()).not.toThrow();
  });

  it("survives storage that throws on every call", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = new ProgressStore(broken, "k");
    expect(store.load().unlocked).toEqual([]);
    expect(store.save(["a"], new Stats().toJSON(), null)).toBe(false);
    expect(() => store.clear()).not.toThrow();
  });

  it("clears what it saved", () => {
    const storage = new FakeStorage();
    const store = new ProgressStore(storage, "k");
    store.save(["a"], new Stats().toJSON(), null);
    store.clear();
    expect(store.load().unlocked).toEqual([]);
  });
});

describe("parseWorld", () => {
  it("needs a room, whole-number tile and a real direction", () => {
    expect(parseWorld(world)).toEqual(world);
    expect(parseWorld({ ...world, room: 3 })).toBeNull();
    expect(parseWorld({ ...world, col: 1.5 })).toBeNull();
    expect(parseWorld({ ...world, row: "2" })).toBeNull();
    expect(parseWorld({ ...world, facing: "sideways" })).toBeNull();
    expect(parseWorld(null)).toBeNull();
  });

  it("keeps only numeric variables", () => {
    const w = parseWorld({ ...world, vars: { a: 1, b: "2", c: NaN, d: null } });
    expect(w?.vars).toEqual({ a: 1 });
    expect(parseWorld({ ...world, vars: 5 })?.vars).toEqual({});
  });
});
