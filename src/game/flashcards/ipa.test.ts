import { describe, expect, it } from "vitest";
import { FLASHCARDS as F, SOUND } from "../config";
import { DEMO_CARDS } from "./demo";
import { isGap, readIpa, type Phoneme } from "./ipa";
import { ipaScript, Mumble, spellingScript } from "./mumble";

const phonemes = (ipa: string) => readIpa(ipa).units.filter((u): u is Phoneme => !isGap(u));
const symbols = (ipa: string) => phonemes(ipa).map((p) => p.symbol);

describe("readIpa", () => {
  it("makes one sound per phoneme, not per letter", () => {
    expect(symbols("ˈkasa")).toEqual(["k", "a", "s", "a"]);
    expect(symbols("ˈnotʃes")).toEqual(["n", "o", "tʃ", "e", "s"]); // ch is one sound
    expect(symbols("ˈniɲo")).toEqual(["n", "i", "ɲ", "o"]);
  });

  it("makes only the stressed vowel longer, louder-effect and higher", () => {
    const [k, a1, s, a2] = phonemes("ˈkasa");
    expect(a1.effect).toBe(F.voice.stress.effect);
    expect(a1.length).toBe(F.voice.stress.length);
    expect(a1.pitch).toBeCloseTo(F.voice.symbols.a.pitch * F.voice.stress.pitch);
    expect(a2.effect).toBe("voiceVowel");
    expect([k.effect, s.effect]).not.toContain(F.voice.stress.effect);
    // The mark applies to the next vowel, wherever the syllable starts.
    expect(phonemes("kaˈfe")[3].effect).toBe(F.voice.stress.effect);
    expect(phonemes("kaˈfe")[1].effect).toBe("voiceVowel");
  });

  it("reads affricates written with or without a tie bar, and other marks", () => {
    expect(symbols("t͡ʃa")).toEqual(["tʃ", "a"]);
    expect(symbols("tʃa")).toEqual(["tʃ", "a"]);
    expect(symbols("dʒa")).toEqual(["dʒ", "a"]);
    expect(phonemes("dʒa")[0].effect).toBe(F.voice.symbols["tʃ"].effect);
    expect(symbols("te")).toEqual(["t", "e"]);
    expect(symbols("a.ˌe")).toEqual(["a", "e"]);
    expect(symbols("a̩e")).toEqual(["a", "e"]);
  });

  it("lengthens a long vowel", () => {
    const [short] = phonemes("a");
    const [long] = phonemes("aː");
    expect(long.length).toBeCloseTo(short.length * F.voice.longer);
  });

  it("puts a pause between words, drops slashes and brackets, and no trailing pause", () => {
    const { units } = readIpa("/ˈasta ˈlweɡo/");
    expect(units.filter(isGap)).toHaveLength(1);
    expect(isGap(units[units.length - 1])).toBe(false);
    expect(isGap(units[0])).toBe(false);
    expect(readIpa("  a   e ").units.filter(isGap)).toHaveLength(1);
  });

  it("maps look-alike symbols and skips and reports what it does not know", () => {
    expect(symbols("ʝoɣoβ")).toEqual(["ʝ", "o", "ɣ", "o", "β"]);
    expect(phonemes("ʝ")[0].effect).toBe(F.voice.symbols.j.effect);
    const r = readIpa("a☃b日");
    expect(r.unknown.sort()).toEqual(["☃", "日"].sort());
    expect(r.units.filter((u) => !isGap(u))).toHaveLength(2);
    expect(readIpa("")).toEqual({ units: [], unknown: [] });
  });

  it("is cut at the longest run", () => {
    expect(phonemes("a".repeat(500))).toHaveLength(F.voice.maxPhonemes);
  });

  it("never names an effect that does not exist, and every table entry is sane", () => {
    const all = [...Object.values(F.voice.symbols), F.voice.stress];
    for (const e of all) {
      expect(SOUND.effects[e.effect], e.effect).toBeDefined();
      expect(e.pitch).toBeGreaterThan(0);
      expect(e.length).toBeGreaterThan(0);
    }
    for (const [from, to] of Object.entries(F.voice.like)) expect(F.voice.symbols[to], `${from} -> ${to}`).toBeDefined();
  });

  it("knows every symbol the practice deck uses", () => {
    for (const c of DEMO_CARDS) expect(readIpa(c.ipa ?? "").unknown, c.slug).toEqual([]);
  });
});

describe("ipaScript and spellingScript", () => {
  it("times the sounds from the phoneme lengths, in order", () => {
    const script = ipaScript("ˈola");
    expect(script.map((e) => e.effect)).toEqual([F.voice.stress.effect, "voiceLiquid", "voiceVowel"]);
    expect(script[0].at).toBe(0);
    expect(script[1].at).toBeCloseTo(F.voice.stress.length);
    expect(script[2].at).toBeCloseTo(F.voice.stress.length + F.voice.symbols.l.length);
  });

  it("a gap delays the next word", () => {
    const [, b] = ipaScript("a e");
    expect(b.at).toBeCloseTo(F.voice.symbols.a.length + F.voice.gap);
  });

  it("is the same every time and is empty for nothing", () => {
    expect(ipaScript("ˈkasa")).toEqual(ipaScript("ˈkasa"));
    expect(ipaScript("")).toEqual([]);
    expect(ipaScript("☃")).toEqual([]);
  });

  it("the spelling voice names the mumble effect", () => {
    const script = spellingScript("ab");
    expect(script.map((e) => e.effect)).toEqual(["mumble", "mumble"]);
  });

  it("every practice card gets a non-empty, time-ordered, short script", () => {
    for (const c of DEMO_CARDS) {
      const script = ipaScript(c.ipa!);
      expect(script.length, c.slug).toBeGreaterThan(0);
      for (let i = 1; i < script.length; i++) expect(script[i].at, c.slug).toBeGreaterThanOrEqual(script[i - 1].at);
      expect(script[script.length - 1].at, c.slug).toBeLessThan(4);
    }
  });
});

describe("Mumble playing a script", () => {
  it("passes the effect and pitch through, at the right times, and a big step plays each once", () => {
    const got: { effect?: string; pitch: number }[] = [];
    const m = new Mumble((s) => got.push(s));
    m.play(ipaScript("ˈola"));
    m.update(0);
    expect(got.map((s) => s.effect)).toEqual([F.voice.stress.effect]);
    m.update(F.voice.stress.length + 0.001);
    expect(got).toHaveLength(2);
    m.update(1e6);
    expect(got).toHaveLength(3);
    expect(m.speaking).toBe(false);
  });

  it("a new play replaces the old and stop silences it", () => {
    const got: unknown[] = [];
    const m = new Mumble((s) => got.push(s));
    m.play(ipaScript("aaaaaaaa"));
    m.update(0.1);
    m.stop();
    m.update(5);
    expect(got.length).toBeLessThanOrEqual(2);
  });
});
