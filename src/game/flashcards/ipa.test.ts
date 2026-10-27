import { describe, expect, it } from "vitest";
import { FLASHCARDS as F, FORMANTS, SOUND, SOURCE_F0 } from "../config";
import { DEMO_CARDS } from "./demo";
import { isGap, readIpa, type Phoneme } from "./ipa";
import { ipaScript, Mumble, spellingScript, VOICE_STYLES } from "./mumble";

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

  it("does not voice the optional (se) of a reflexive verb", () => {
    expect(symbols("iɾ(se)")).toEqual(["i", "ɾ"]);
    expect(symbols("ʝaˈmaɾ(se)")).toEqual(["ʝ", "a", "m", "a", "ɾ"]);
    expect(symbols("ˈa(")).toEqual(["a"]);
    expect(symbols("a)b")).toEqual(["a", "b"]);
    expect(readIpa("iɾ(se)").unknown).toEqual([]);
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

describe("the speech-like voice: formants, intonation and jitter", () => {
  const word = "ˈkasa";
  const at = (style: number, ipa = word) => ipaScript(ipa, style);

  it("part 1: vowels are told apart by timbre, at one pitch, and stress is length and loudness only", () => {
    const events = at(2);
    expect(events.map((e) => e.effect)).toEqual(["voiceStop", "voiceFormantAStress", "voiceHiss", "voiceFormantA"]);
    for (const v of ["a", "e", "i", "o", "u"]) {
      const [e] = ipaScript(v, 2);
      expect(e.effect).toBe(`voiceFormant${v.toUpperCase()}`);
      expect(e.pitch).toBe(1);
      expect(SOUND.effects[e.effect!].voices).toHaveLength(3);
      expect(SOUND.effects[`${e.effect}Stress`]).toBeDefined();
    }
    // Look-alike vowels use the formants of the vowel they sound like.
    expect(ipaScript("ɛ", 2)[0].effect).toBe("voiceFormantE");
    // A stressed vowel lasts longer: the next sound starts later.
    expect(at(2)[2].at - at(2)[1].at).toBeGreaterThan(at(2, "kasa")[2].at - at(2, "kasa")[1].at);
    // The original voice is untouched by the new styles.
    expect(at(1).map((e) => e.effect)).toEqual(["voiceStop", "voiceVowelStress", "voiceHiss", "voiceVowel"]);
  });

  it("the three sounds of a vowel are not a simple ratio of each other (no chord inside a vowel)", () => {
    const simple = (x: number, y: number): string | null => {
      const r = Math.max(x, y) / Math.min(x, y);
      for (const m of [1, 2, 3]) {
        for (let n = m; n <= 6 * m; n++) if (Math.abs(r - n / m) / r < 0.03) return `${n}:${m}`;
      }
      return null;
    };
    for (const vowel of Object.keys(FORMANTS)) {
      const freqs = SOUND.effects[`voiceFormant${vowel.toUpperCase()}`].voices.map((v) => ("freq" in v ? v.freq : 0));
      expect(freqs).toHaveLength(3);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(simple(freqs[i], freqs[j]), `${vowel} ${freqs[i]}/${freqs[j]}`).toBeNull();
      // Stress is the same sounds, longer and louder.
      expect(SOUND.effects[`voiceFormant${vowel.toUpperCase()}Stress`].voices.map((v) => ("freq" in v ? v.freq : 0))).toEqual(freqs);
    }
  });

  it("the formants stay near the textbook values", () => {
    const book: Record<string, [number, number]> = { a: [730, 1090], e: [530, 1840], i: [270, 2290], o: [570, 840], u: [300, 870] };
    for (const [v, [f1, f2]] of Object.entries(book)) {
      expect(Math.abs(FORMANTS[v].f1 / f1 - 1)).toBeLessThan(0.09);
      expect(Math.abs(FORMANTS[v].f2 / f2 - 1)).toBeLessThan(0.09);
    }
  });

  it("part 2: pitch drifts down over the phrase, the stressed vowel bumps up, the last vowel falls", () => {
    const flat = at(2);
    const sung = at(3);
    expect(sung.map((e) => e.at)).toEqual(flat.map((e) => e.at));
    const I = F.voice.intonation;
    const ratio = sung.map((e, i) => e.pitch / flat[i].pitch);
    // First sound is above the last by the declination, apart from the bump and the fall.
    expect(ratio[0]).toBeCloseTo(1 - I.declination / 2);
    expect(ratio[1]).toBeCloseTo((1 + I.declination * (1 / 3 - 0.5) + I.stressBump) * 1);
    expect(ratio[3]).toBeCloseTo(1 + I.declination / 2 + I.finalFall);
    // No sound moves by more than a few semitones.
    for (const r of ratio) expect(Math.abs(Math.log2(r) * 12)).toBeLessThan(3);
  });

  it("part 3: every sound is a few percent off, the same way every time, and no two vowels are alike", () => {
    const a = at(3, "aaaaaa");
    const b = at(4, "aaaaaa");
    expect(at(4, "aaaaaa")).toEqual(b);
    const ratios = b.map((e, i) => e.pitch / a[i].pitch);
    for (const r of ratios) expect(Math.abs(r - 1)).toBeLessThanOrEqual(F.voice.jitter + 1e-9);
    expect(new Set(ratios.map((r) => r.toFixed(5))).size).toBeGreaterThan(3);
  });

  it("the styles never throw, stay finite, and a short or empty transcription is fine", () => {
    for (const style of [0, 1, 2, 3, 4, 5, 6, 9, -3, 2.7, NaN]) {
      for (const ipa of ["", "a", "ˈ", "☃", "ˈbwenas ˈnotʃes", "a".repeat(500), "iɾ(se)", "el / ˈeʝa"]) {
        for (const e of ipaScript(ipa, style)) {
          expect(Number.isFinite(e.pitch) && e.pitch > 0, `${style} ${ipa}`).toBe(true);
          expect(Number.isFinite(e.at) && e.at >= 0).toBe(true);
          expect(SOUND.effects[e.effect!], e.effect).toBeDefined();
        }
      }
    }
    expect(VOICE_STYLES).toHaveLength(7);
  });
});

describe("the source-filter voice (styles 5 and 6)", () => {
  const at = (style: number, ipa = "ˈkasa") => ipaScript(ipa, style);

  it("vowels are the same source through different resonances, so every vowel has the same pitch", () => {
    for (const v of ["a", "e", "i", "o", "u"]) {
      const [e] = ipaScript(v, 5);
      expect(e.effect).toBe(`voiceFilt${v.toUpperCase()}`);
      expect(e.pitch).toBe(1);
      const voice = SOUND.effects[e.effect!].voices[0] as unknown as { source: string; freq: number; formants: { freq: number }[] };
      expect(voice.source).toBe("sawtooth");
      expect(voice.freq).toBe(SOURCE_F0);
      expect(voice.formants.map((f) => f.freq)).toEqual([FORMANTS[v].f1, FORMANTS[v].f2]);
      expect(SOUND.effects[`${e.effect}Stress`]).toBeDefined();
    }
    // One oscillator per vowel, whatever the number of formants.
    expect(SOUND.effects.voiceFiltA.voices).toHaveLength(1);
  });

  it("is slowed down by the configured factor, every sound stretched and every start later", () => {
    const fast = at(2);
    const slow = at(5);
    expect(slow.map((e) => e.effect)).toEqual(fast.map((e) => e.effect!.replace("Formant", "Filt")));
    expect(slow.every((e) => e.stretch === F.voice.slow)).toBe(true);
    expect(fast.every((e) => e.stretch === undefined)).toBe(true);
    slow.forEach((e, i) => expect(e.at).toBeCloseTo(fast[i].at * F.voice.slow));
    // A word gap is stretched too.
    expect(ipaScript("a e", 5)[1].at).toBeCloseTo((F.voice.symbols.a.length + F.voice.gap) * F.voice.slow);
  });

  it("style 5 has no intonation or jitter, and style 6 adds them to the same sounds", () => {
    expect(new Set(at(5, "aaaa").map((e) => e.pitch))).toEqual(new Set([1]));
    const six = at(6, "aaaa");
    expect(new Set(six.map((e) => e.pitch)).size).toBeGreaterThan(2);
    expect(six.map((e) => e.at)).toEqual(at(5, "aaaa").map((e) => e.at));
    for (const e of six) expect(Math.abs(Math.log2(e.pitch) * 12)).toBeLessThan(3);
  });
});

