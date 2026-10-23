import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { SettingsStore } from "./settings";

const KEY = "k";

describe("SettingsStore", () => {
  it("round-trips the settings", () => {
    const storage = new FakeStorage();
    const store = new SettingsStore(storage, KEY);
    expect(store.save({ muted: true, track: "02-b" })).toBe(true);
    expect(new SettingsStore(storage, KEY).load()).toEqual({ muted: true, track: "02-b" });
  });

  it("gives the defaults with nothing saved, with no storage and with damaged data", () => {
    const defaults = { muted: false, track: null };
    expect(new SettingsStore(new FakeStorage(), KEY).load()).toEqual(defaults);
    expect(new SettingsStore(null, KEY).load()).toEqual(defaults);
    for (const text of ["{", "null", "[]", "5", '"x"', '{"muted":"yes","track":5}']) {
      const storage = new FakeStorage();
      storage.setItem(KEY, text);
      expect(new SettingsStore(storage, KEY).load(), text).toEqual(defaults);
    }
  });

  it("fails silently when storage throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    const store = new SettingsStore({ getItem: boom, setItem: boom, removeItem: boom }, KEY);
    expect(store.load()).toEqual({ muted: false, track: null });
    expect(store.save({ muted: true, track: null })).toBe(false);
    expect(new SettingsStore(null, KEY).save({ muted: true, track: null })).toBe(false);
  });
});
