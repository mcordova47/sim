import { describe, expect, it } from "vitest";
import { LAB_KEY, loadLab, saveLab, type StoreLike } from "./lab-store";

const mem = (): StoreLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

describe("lab store", () => {
  it("round trips", () => {
    const s = mem();
    saveLab(s, { text: "x", mode: "loop", live: false, tweaks: { gains: { "loop.a": 0.3 }, muted: ["intro.b"], tempo: 100, master: 0.4 } });
    expect(loadLab(s)).toEqual({ text: "x", mode: "loop", live: false, tweaks: { gains: { "loop.a": 0.3 }, muted: ["intro.b"], tempo: 100, master: 0.4, encounterGain: undefined } });
  });
  it("is null for nothing, junk, or storage that throws", () => {
    expect(loadLab(null)).toBeNull();
    expect(loadLab(mem())).toBeNull();
    const s = mem();
    s.data[LAB_KEY] = "{not json";
    expect(loadLab(s)).toBeNull();
    s.data[LAB_KEY] = JSON.stringify({ text: 5 });
    expect(loadLab(s)).toBeNull();
    expect(loadLab({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} })).toBeNull();
    expect(() => saveLab({ getItem: () => null, setItem: () => { throw new Error("full"); } }, { text: "", mode: "both", live: true, tweaks: { gains: {}, muted: [] } })).not.toThrow();
  });
  it("repairs bad fields", () => {
    const s = mem();
    s.data[LAB_KEY] = JSON.stringify({ text: "t", mode: "nope", tweaks: { gains: { a: "x", b: 0.2 }, muted: [1, "m"], tempo: "fast" } });
    const l = loadLab(s)!;
    expect(l.mode).toBe("both");
    expect(l.tweaks.gains).toEqual({ b: 0.2 });
    expect(l.tweaks.muted).toEqual(["m"]);
    expect(l.tweaks.tempo).toBeUndefined();
  });
});
