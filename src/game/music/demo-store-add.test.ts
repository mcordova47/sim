import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "../achievements/progress";
import { MAKE_TRACKS as M } from "../config";
import { trackText } from "../sync/gen";
import { DemoStore } from "./demo-store";
import { emptyGrid, placeNote } from "./demos";
import { trackBody } from "./track-body";

function memory(limit = Infinity): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > limit) throw new Error("full");
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}
const make = (storage: KeyValueStorage | null = memory()) => new DemoStore(storage, M.storageKey, { reserved: () => ["Stop the music"], log: () => {} });

describe("DemoStore.add (a track from another device)", () => {
  it("adds a valid track under the next id and bumps the version", () => {
    const store = make();
    const v = store.version;
    expect(store.add(trackText("Foo", 1), 77)).toBe("added");
    expect(store.version).toBe(v + 1);
    expect(store.list().map((d) => [d.id, d.title, d.made])).toEqual([["demo-1", "Foo", 77]]);
  });

  it("the same text twice, or the same body under another title, adds once", () => {
    const store = make();
    expect(store.add(trackText("Foo", 1), 1)).toBe("added");
    const v = store.version;
    expect(store.add(trackText("Foo", 1), 2)).toBe("present");
    expect(store.add(trackText("Renamed", 1), 2)).toBe("present");
    expect(store.count).toBe(1);
    expect(store.version).toBe(v);
  });

  it("a taken title (any case, or a reserved name) gets a number, and the body stays the identity", () => {
    const store = make();
    store.add(trackText("Foo", 1), 1);
    expect(store.add(trackText("FOO", 2), 1)).toBe("added");
    expect(store.add(trackText("foo", 3), 1)).toBe("added");
    expect(store.add(trackText("Stop the music", 4), 1)).toBe("added");
    expect(store.list().map((d) => d.title)).toEqual(["Foo", "FOO 2", "foo 3", "Stop the music 2"]);
    expect(trackBody(store.list()[1].text)).toBe(trackBody(trackText("FOO", 2)));
    // Adding the renamed copy again is not new.
    expect(store.add(store.list()[1].text, 1)).toBe("present");
  });

  it("a long title is cut to fit its number", () => {
    const store = make();
    const long = "A".repeat(M.nameMax);
    store.add(trackText(long, 1), 1);
    expect(store.add(trackText(long, 2), 1)).toBe("added");
    expect(store.list()[1].title).toBe("A".repeat(M.nameMax - 2) + " 2");
  });

  it("at the limit the extra is not added and nothing is replaced", () => {
    const store = make();
    for (let i = 0; i < M.maxTracks; i++) expect(store.add(trackText(`T${i}`, i), i)).toBe("added");
    const before = store.list().map((d) => d.text);
    expect(store.add(trackText("One more", 99), 1)).toBe("full");
    expect(store.list().map((d) => d.text)).toEqual(before);
  });

  it("ids are never reused, even after a delete", () => {
    const store = make();
    store.add(trackText("A", 1), 1);
    store.add(trackText("B", 2), 1);
    store.remove("demo-2");
    store.add(trackText("C", 3), 1);
    expect(store.list().map((d) => d.id)).toEqual(["demo-1", "demo-3"]);
  });

  it("refuses hostile text like save does: not a track, over the size, a bad name, junk types", () => {
    const store = make();
    for (const text of ["", "nonsense", trackText("Bad:Name", 1), trackText("X", 1) + "# " + "y".repeat(M.maxTextBytes), trackText("", 1), "title: Only\n"]) {
      expect(store.add(text, 1)).toBe("invalid");
    }
    expect(store.add(5 as unknown as string, 1)).toBe("invalid");
    expect(store.count).toBe(0);
  });

  it("when the write fails nothing is added and the id is not used up", () => {
    const store = make(memory(10));
    expect(store.add(trackText("Foo", 1), 1)).toBe("storage");
    expect(store.count).toBe(0);
    const ok = make();
    expect(ok.add(trackText("Foo", 1), 1)).toBe("added");
  });

  it("a bad made becomes 0 and the record player's reference and the draft still point at their own ids", () => {
    const store = make();
    store.save(null, (() => {
      const g = emptyGrid("Mine");
      for (let i = 0; i < 9; i++) placeNote(g, i % 2 ? "bass" : "melody", i, i % 2 ? 40 : 60, 1);
      return g;
    })());
    store.setDraft("demo-1", emptyGrid("Draft"));
    store.add(trackText("Theirs", 1), Number.NaN);
    expect(store.get("demo-1")?.title).toBe("Mine");
    expect(store.draft()?.id).toBe("demo-1");
    expect(store.get("demo-2")?.made).toBe(0);
  });
});
