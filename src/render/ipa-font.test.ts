import { describe, expect, it, vi } from "vitest";
import { DEMO_CARDS } from "../game/flashcards/demo";
import { FLASHCARDS as F } from "../game/config";
import { IPA_GLYPHS, IPA_H, IPA_W, drawIpa, ipaWidth, unsupportedIpa } from "./ipa-font";

describe("the IPA font", () => {
  it("has well-formed glyphs", () => {
    for (const [ch, rows] of Object.entries(IPA_GLYPHS)) {
      expect(rows, ch).toHaveLength(IPA_H);
      for (const row of rows) expect(row, ch).toMatch(new RegExp(`^[#.]{${IPA_W}}$`));
    }
  });

  it("draws every symbol the practice deck and the voice use", () => {
    for (const c of DEMO_CARDS) expect(unsupportedIpa(c.ipa!), c.slug).toEqual([]);
    for (const symbol of Object.keys(F.voice.symbols)) expect(unsupportedIpa(symbol), symbol).toEqual([]);
    for (const symbol of Object.keys(F.voice.like)) void symbol; // look-alikes need not be drawn
  });

  it("draws the real deck's symbols (the set the app's es-MX column uses)", () => {
    expect(unsupportedIpa("ˈaeioupt kbdɡfsxmnɲlɾrjwʝʃ ()/")).toEqual([]);
  });

  it("tells r (a trill) from ɾ (a tap), n from ɲ, and g from nothing else", () => {
    expect(IPA_GLYPHS.r).not.toEqual(IPA_GLYPHS.ɾ);
    expect(IPA_GLYPHS.n).not.toEqual(IPA_GLYPHS.ɲ);
    expect(IPA_GLYPHS.j).not.toEqual(IPA_GLYPHS.ʝ);
    const names = Object.keys(IPA_GLYPHS).filter((c) => c !== "ɡ" && c !== "g");
    const shapes = new Set(names.map((c) => IPA_GLYPHS[c].join("|")));
    expect(shapes.size).toBe(names.length);
  });

  it("reports what it cannot draw, and measures text", () => {
    expect(unsupportedIpa("a☃b☃日")).toEqual(["☃", "日"]);
    expect(ipaWidth("")).toBe(0);
    expect(ipaWidth("ab")).toBe(11);
    expect(ipaWidth("ˈtʃ")).toBe(17);
  });

  it("draws one image for each symbol but a space, a box for an unknown one, and never throws", () => {
    const calls: unknown[][] = [];
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) });
    const ctx = new Proxy({}, { get: (_t, fn: string) => (...args: unknown[]) => calls.push([fn, ...args]), set: () => true }) as unknown as CanvasRenderingContext2D;
    drawIpa(ctx, "a b☃", 10, 20);
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(3);
    calls.length = 0;
    drawIpa(ctx, "", 0, 0);
    drawIpa(ctx, "ˈ", 100, 5, { align: "center" });
    drawIpa(ctx, "ab", 100, 5, { align: "right" });
    expect(calls.filter((c) => c[0] === "drawImage").length).toBe(3);
    vi.unstubAllGlobals();
  });
});
