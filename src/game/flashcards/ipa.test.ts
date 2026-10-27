import { describe, expect, it } from "vitest";
import { BURST_GAIN, DIPHTHONG_SHAPE, FLASHCARDS as F, FORMANTS, GLIDE_TARGET, GLIDE_TIME, SOUND, SOURCE_F0, VOWEL_TIME } from "../config";
import { DEMO_CARDS } from "./demo";
import { isGap, readIpa, type Phoneme } from "./ipa";
import { ipaScript, Mumble, spellingScript, VOICE_CYCLE, VOICE_STYLES } from "./mumble";

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
    const all = [...Object.values(F.voice.symbols), ...Object.values(F.voice.murmurs), F.voice.stress];
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
      expect(script[script.length - 1].at, c.slug).toBeLessThan(c.slug === "fox" || c.slug === "chico" ? 9 : 4);
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
    for (const style of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 99, -3, 2.7, NaN]) {
      for (const ipa of ["", "a", "ˈ", "☃", "ˈbwenas ˈnotʃes", "a".repeat(500), "iɾ(se)", "el / ˈeʝa"]) {
        for (const e of ipaScript(ipa, style)) {
          expect(Number.isFinite(e.pitch) && e.pitch > 0, `${style} ${ipa}`).toBe(true);
          expect(Number.isFinite(e.at) && e.at >= 0).toBe(true);
          expect(SOUND.effects[e.effect!], e.effect).toBeDefined();
        }
      }
    }
    expect(VOICE_STYLES).toHaveLength(13);
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

describe("glides and murmurs in the source-filter voice (styles 7 and 8)", () => {
  const effects = (ipa: string, style: number) => ipaScript(ipa, style).map((e) => e.effect);

  it("a glide before a vowel is the resonances moving into that vowel's", () => {
    expect(effects("ˈbjen", 7)).toEqual(["voiceVoicedStop", "voiceGlideJToE", "voiceFiltEStress", "voiceNasal"]);
    expect(effects("ˈaɡwa", 7)).toEqual(["voiceFiltAStress", "voiceVoicedStop", "voiceGlideWToA", "voiceFiltA"]);
    expect(effects("ˈdjos", 7)).toEqual(["voiceVoicedStop", "voiceGlideJToO", "voiceFiltOStress", "voiceHiss"]);
  });

  it("a glide after a vowel is the resonances moving out of that vowel's, a triphthong has both", () => {
    expect(effects("ˈoj", 7)).toEqual(["voiceFiltOStress", "voiceGlideJFromO"]);
    expect(effects("ˈkawsa", 7).slice(0, 3)).toEqual(["voiceStop", "voiceFiltAStress", "voiceGlideWFromA"]);
    const tri = effects("estuˈdjajs", 7);
    expect(tri).toContain("voiceGlideJToA");
    expect(tri).toContain("voiceGlideJFromA");
  });

  it("two vowels in a row are not glides (día, río), and a lone glide keeps its old sound", () => {
    expect(effects("ˈdia", 7).some((e) => e!.startsWith("voiceGlide"))).toBe(false);
    expect(effects("ˈj", 7)).toEqual(["voiceGlideDown"]);
    expect(effects("ˈʝo", 7)).toEqual(["voiceGlideJToO", "voiceFiltOStress"]);
  });

  it("glides are only changed from style 7, and only in the filtered voice", () => {
    for (const style of [1, 2, 3, 4, 5, 6]) expect(effects("ˈbjen", style).some((e) => e!.startsWith("voiceGlideJ")), String(style)).toBe(false);
    expect(effects("ˈbjen", 6)).toContain("voiceGlideDown");
  });

  it("a glide is short, and takes the configured time on the timeline", () => {
    const [b, j, e] = ipaScript("ˈbjen", 7);
    expect(j.at - b.at).toBeCloseTo(F.voice.symbols.b.length * F.voice.slow);
    expect(e.at - j.at).toBeCloseTo(F.voice.glideLength.to * F.voice.slow);
  });

  it("a glide effect slides each resonance from one vowel's frequency to the other's", () => {
    const voice = SOUND.effects.voiceGlideJToE.voices[0] as unknown as { formants: { freq: number; endFreq: number }[] };
    expect(voice.formants.map((f) => [f.freq, f.endFreq])).toEqual([[FORMANTS.i.f1, FORMANTS.e.f1], [FORMANTS.i.f2, FORMANTS.e.f2]]);
    const out = SOUND.effects.voiceGlideWFromA.voices[0] as unknown as { formants: { freq: number; endFreq: number }[] };
    expect(out.formants.map((f) => [f.freq, f.endFreq])).toEqual([[FORMANTS.a.f1, FORMANTS.u.f1], [FORMANTS.a.f2, FORMANTS.u.f2]]);
    for (const g of ["J", "W"]) for (const v of ["A", "E", "I", "O", "U"]) {
      expect(SOUND.effects[`voiceGlide${g}To${v}`], `${g}${v}`).toBeDefined();
      expect(SOUND.effects[`voiceGlide${g}From${v}`], `${g}${v}`).toBeDefined();
    }
  });

  it("the nasals and voiced stops come from the vowels' own source from style 8, and not before", () => {
    expect(effects("ˈmana", 7)).toEqual(["voiceNasal", "voiceFiltAStress", "voiceNasal", "voiceFiltA"]);
    expect(effects("ˈmana", 8)).toEqual(["voiceFiltM", "voiceFiltAStress", "voiceFiltN", "voiceFiltA"]);
    expect(effects("ˈaɲa", 8)[1]).toBe("voiceFiltNY");
    expect(effects("ˈaba", 8)[1]).toBe("voiceFiltB");
    expect(effects("ˈada", 8)[1]).toBe("voiceFiltD");
    expect(effects("ˈaɡa", 8)[1]).toBe("voiceFiltG");
    // Look-alikes (β ð ɣ) take their twin's sound; the unvoiced stops and the rest are unchanged.
    expect(effects("ˈaβa", 8)[1]).toBe("voiceFiltB");
    expect(effects("ˈapa", 8)).toEqual(effects("ˈapa", 7));
    expect(effects("ˈasa", 8)).toEqual(effects("ˈasa", 7));
  });

  it("the murmur sounds sit at the voice's pitch: one source at SOURCE_F0, through a resonance, never a low tone", () => {
    for (const name of ["voiceFiltM", "voiceFiltN", "voiceFiltNY", "voiceFiltB", "voiceFiltD", "voiceFiltG"]) {
      const source = SOUND.effects[name].voices[0] as unknown as { source: string; freq: number };
      expect(source.source, name).toBe("sawtooth");
      expect(source.freq, name).toBe(SOURCE_F0);
    }
    // And no oscillator of the new consonants is a plain tone far below the voice.
    for (const name of ["voiceFiltM", "voiceFiltN", "voiceFiltNY", "voiceFiltB", "voiceFiltD", "voiceFiltG"]) {
      for (const v of SOUND.effects[name].voices) expect("wave" in v, name).toBe(false);
    }
  });

  it("all 1000-style words stay sane in styles 7 and 8: finite, ordered, every effect real", () => {
    for (const ipa of ["ˈbjen", "ˈaɡwa", "estuˈdjajs", "uɾuˈɡwaj", "ˈdia", "ˈʝo", "ˈmana", "ˈaɲa", "ˈabada", "ˈbwenas ˈnotʃes"]) {
      for (const style of [7, 8]) {
        let last = -1;
        for (const e of ipaScript(ipa, style)) {
          expect(Number.isFinite(e.pitch) && e.pitch > 0, ipa).toBe(true);
          expect(e.at, ipa).toBeGreaterThanOrEqual(last);
          last = e.at;
          expect(SOUND.effects[e.effect!], `${ipa} ${e.effect}`).toBeDefined();
        }
      }
    }
  });
});

describe("diphthongs as one continuous sound (style 9), l, and levels", () => {
  const sounds = (ipa: string, style = 9) => ipaScript(ipa, style);
  const names = (ipa: string, style = 9) => sounds(ipa, style).map((e) => e.effect);

  it("a glide and its vowel are one sound whose name says the path: bien, aire, and the triphthong", () => {
    expect(names("ˈbjen")).toEqual(["voiceFiltB", "voiceDiphJEStress", "voiceFiltN"]);
    expect(names("ˈajɾe")).toEqual(["voiceDiphAJStress", "voiceTap", "voiceFiltE"]);
    expect(names("ˈaɡwa")).toEqual(["voiceFiltAStress", "voiceFiltG", "voiceDiphWA"]);
    const tri = names("estuˈdjajs");
    expect(tri).toContain("voiceDiphJAJStress");
    expect(names("uɾuˈɡwaj")).toContain("voiceDiphWAJStress");
  });

  it("is one event, the length of its parts added up, and no gap or glide event is left", () => {
    const [e] = sounds("ˈbjen").slice(1);
    const [, , next] = sounds("ˈbjen");
    expect(next.at - e.at).toBeCloseTo((GLIDE_TIME.to + VOWEL_TIME.stress) * F.voice.slow);
    const two = sounds("ˈajɾe");
    expect(two[1].at - two[0].at).toBeCloseTo((VOWEL_TIME.stress + GLIDE_TIME.from) * F.voice.slow);
    expect(names("ˈbjen").some((n) => n!.startsWith("voiceGlide"))).toBe(false);
    // Total time is the same as style 8 (separate glide and vowel).
    expect(sounds("ˈbjen").at(-1)!.at).toBeCloseTo(sounds("ˈbjen", 8).at(-1)!.at);
  });

  it("a hiatus stays two separate sounds, and a glide between vowels belongs to the vowel after it", () => {
    expect(names("ˈdia")).toEqual(["voiceFiltD", "voiceFiltIStress", "voiceFiltA"]);
    expect(names("ˈrio")).toEqual(["voiceTrill", "voiceFiltIStress", "voiceFiltO"]);
    expect(names("ˈaʝa")).toEqual(["voiceFiltAStress", "voiceDiphJA"]);
    expect(names("ˈʝo")).toEqual(["voiceDiphJOStress"]);
  });

  it("a glide with no vowel next to it, and two glides together, are left as they were", () => {
    expect(names("ˈj")).toEqual(["voiceGlideDown"]);
    expect(names("ˈjw")).toEqual(["voiceGlideDown", "voiceGlideUp"]);
  });

  it("styles below 9 do not merge, and style 9 changes only the diphthongs", () => {
    for (const style of [1, 2, 3, 4, 5, 6, 7, 8]) expect(names("ˈbjen", style).some((n) => n!.startsWith("voiceDiph")), String(style)).toBe(false);
    for (const ipa of ["ˈkasa", "ˈmana", "ˈabada", "ˈdia", "ˈasta ˈlego"]) expect(names(ipa, 9)).toEqual(names(ipa, 8));
  });

  it("a diphthong effect is on the move for most of its length: into the vowel, or out of it, with the movement heard at full level", () => {
    const S = DIPHTHONG_SHAPE;
    const into = SOUND.effects.voiceDiphJE.voices[0] as unknown as { formants: { freq: number; path: [number, number][] }[]; hold: number; length: number };
    expect(into.length).toBeCloseTo(GLIDE_TIME.to + VOWEL_TIME.plain);
    expect(into.formants.map((f) => f.freq)).toEqual([FORMANTS.i.f1, FORMANTS.i.f2]);
    expect(into.formants[0].path).toEqual([[S.onReach, FORMANTS.e.f1]]);
    expect(into.formants[1].path).toEqual([[S.onReach, FORMANTS.e.f2]]);
    const out = SOUND.effects.voiceDiphAJ.voices[0] as unknown as { formants: { freq: number; path: [number, number][] }[]; hold: number };
    expect(out.formants[1].freq).toBe(FORMANTS.a.f2);
    expect(out.formants[1].path).toEqual([[S.offLeave, FORMANTS.a.f2], [1, FORMANTS[GLIDE_TARGET.j].f2]]);
    const tri = SOUND.effects.voiceDiphJAJ.voices[0] as unknown as { formants: { freq: number; path: [number, number][] }[] };
    expect(tri.formants[0].freq).toBe(FORMANTS.i.f1);
    expect(tri.formants[0].path).toEqual([[S.triReach, FORMANTS.a.f1], [S.triLeave, FORMANTS.a.f1], [1, FORMANTS.i.f1]]);
    // The movement is most of the sound, and it is still at full level when it ends.
    expect(S.onReach).toBeGreaterThanOrEqual(0.5);
    expect(S.offLeave).toBeLessThanOrEqual(0.4);
    expect(S.triLeave - S.triReach).toBeLessThanOrEqual(0.4);
    for (const v of [into, out]) expect(v.hold).toBeGreaterThanOrEqual(0.8);
    // Path fractions run forward in time for every combination.
    for (const [name, def] of Object.entries(SOUND.effects).filter(([n]) => n.startsWith("voiceDiph"))) {
      for (const f of (def.voices[0] as unknown as { formants: { path: [number, number][] }[] }).formants) {
        for (let i = 1; i < f.path.length; i++) expect(f.path[i][0], name).toBeGreaterThan(f.path[i - 1][0]);
        expect(f.path.at(-1)![0], name).toBeLessThanOrEqual(1);
      }
    }
    // Every combination exists, with its stressed twin.
    for (const on of ["", "J", "W"]) for (const off of ["", "J", "W"]) for (const v of ["A", "E", "I", "O", "U"]) {
      if (!on && !off) continue;
      expect(SOUND.effects[`voiceDiph${on}${v}${off}`], `${on}${v}${off}`).toBeDefined();
      expect(SOUND.effects[`voiceDiph${on}${v}${off}Stress`]).toBeDefined();
    }
  });

  it("a diphthong is set between a third and three quarters of the gain of a plain stressed vowel (it is held longer, so it need not be as loud)", () => {
    const plain = SOUND.effects.voiceFiltEStress.voices[0] as unknown as { gain: number };
    for (const name of ["voiceDiphJEStress", "voiceDiphAJStress", "voiceDiphJAJStress", "voiceDiphWA"]) {
      const d = SOUND.effects[name].voices[0] as unknown as { gain: number };
      const ratio = d.gain / (name.endsWith("Stress") ? plain.gain : plain.gain / 1.4);
      expect(ratio, name).toBeLessThan(0.75);
      expect(ratio, name).toBeGreaterThan(0.3);
    }
  });

  it("the /l/ is made from the vowels' source from style 8 (not before), at the same level as a vowel", () => {
    expect(names("ˈala", 7)).toEqual(["voiceFiltAStress", "voiceLiquid", "voiceFiltA"]);
    expect(names("ˈala", 8)).toEqual(["voiceFiltAStress", "voiceFiltL", "voiceFiltA"]);
    const l = SOUND.effects.voiceFiltL.voices[0] as unknown as { source: string; freq: number; formants: { freq: number }[] };
    expect(l.source).toBe("sawtooth");
    expect(l.freq).toBe(SOURCE_F0);
    expect(l.formants.map((f) => f.freq)).toEqual([360, 1300]);
  });

  it("the nasals carry a level, the other sounds do not, and the burst level is one named number", () => {
    const [m] = sounds("ˈmana");
    expect(m.gain).toBe(F.voice.murmurs.m.gain);
    expect(m.gain).toBeLessThan(1);
    expect(sounds("ˈasa").every((e) => e.gain === undefined)).toBe(true);
    expect(sounds("ˈaba")[1].gain).toBeUndefined();
    const burst = SOUND.effects.voiceFiltB.voices[1] as unknown as { gain: number };
    expect(burst.gain).toBe(BURST_GAIN);
  });

  it("V steps from the best voice down to spelling, and every voice is in the cycle once", () => {
    expect(VOICE_CYCLE.slice(0, 4)).toEqual([9, 10, 11, 12]);
    expect(VOICE_CYCLE.at(-1)).toBe(0);
    expect([...VOICE_CYCLE].sort((a, b) => a - b)).toEqual(VOICE_STYLES.map((_, i) => i));
    expect(F.voice.style).toBe(VOICE_CYCLE[0]);
  });

  it("every word of the practice sets is sane in style 9: finite, ordered, real effects", () => {
    for (const c of DEMO_CARDS) {
      let last = -1;
      for (const e of ipaScript(c.ipa!, 9)) {
        expect(Number.isFinite(e.pitch) && e.pitch > 0, c.slug).toBe(true);
        expect(e.at, c.slug).toBeGreaterThanOrEqual(last);
        last = e.at;
        expect(SOUND.effects[e.effect!], `${c.slug} ${e.effect}`).toBeDefined();
      }
    }
  });
});

describe("timing variants (styles 10 to 12)", () => {
  const V = F.voice.variants;
  const words = ["ˈkasa", "ˈbjen", "ˈmana", "ˈasta ˈlego", "estuˈdjajs", "ˈabada"];
  const isDiph = (e?: string) => !!e && e.startsWith("voiceDiph");
  const isVowel = (e?: string) => !!e && /^voice(Filt|Held)[AEIOU](Stress)?$/.test(e);

  it("styles 10 to 12 sound the same things in the same order as style 9", () => {
    for (const ipa of words) for (const style of [10, 11, 12]) {
      // The single vowels are the held ones from style 10 on; everything else is the same effect.
      expect(ipaScript(ipa, style).map((e) => e.effect!.replace("voiceHeld", "voiceFilt")), `${ipa} ${style}`).toEqual(ipaScript(ipa, 9).map((e) => e.effect));
      expect(ipaScript(ipa, style).map((e) => e.pitch), `${ipa} ${style}`).toEqual(ipaScript(ipa, 9).map((e) => e.pitch));
    }
  });

  it("style 10: single vowels last longer, in both the sound and the time it takes; nothing else changes", () => {
    for (const ipa of words) {
      const nine = ipaScript(ipa, 9);
      const ten = ipaScript(ipa, 10);
      nine.forEach((e, i) => {
        if (isVowel(e.effect)) expect(ten[i].stretch, `${ipa} ${e.effect}`).toBeCloseTo(F.voice.slow * V.longerVowels);
        else expect(ten[i].stretch, `${ipa} ${e.effect}`).toBeCloseTo(e.stretch!);
      });
      // A diphthong keeps its length: the time it takes, between it and the next sound, is the same.
      nine.forEach((e, i) => {
        if (isDiph(e.effect) && nine[i + 1] && ten[i + 1]) expect(ten[i + 1].at - ten[i].at).toBeCloseTo(nine[i + 1].at - nine[i].at);
      });
    }
    // The vowel's own time on the timeline is longer by the factor: 'kasa' = k a s a.
    const nine = ipaScript("ˈkasa", 9);
    const ten = ipaScript("ˈkasa", 10);
    expect(ten[2].at - ten[1].at).toBeCloseTo((nine[2].at - nine[1].at) * V.longerVowels);
    expect(ten[1].at - ten[0].at).toBeCloseTo(nine[1].at - nine[0].at);
  });

  it("style 11 is style 10 with every time scaled by the speed factor, pauses included", () => {
    for (const ipa of words) {
      const ten = ipaScript(ipa, 10);
      const eleven = ipaScript(ipa, 11);
      ten.forEach((e, i) => {
        expect(eleven[i].at).toBeCloseTo(e.at * V.faster);
        expect(eleven[i].stretch).toBeCloseTo(e.stretch! * V.faster);
      });
    }
    expect(V.faster).toBeLessThan(1);
    expect(V.faster).toBeGreaterThan(0.7);
  });

  it("style 12 is style 10 with only the consonants scaled; vowels, diphthongs and pauses keep their time", () => {
    for (const ipa of words) {
      const ten = ipaScript(ipa, 10);
      const twelve = ipaScript(ipa, 12);
      ten.forEach((e, i) => {
        if (isVowel(e.effect) || isDiph(e.effect)) expect(twelve[i].stretch, `${ipa} ${e.effect}`).toBeCloseTo(e.stretch!);
        else expect(twelve[i].stretch, `${ipa} ${e.effect}`).toBeCloseTo(e.stretch! * V.quickConsonants);
      });
    }
    // The pause between words is unchanged, so the word break is the same length.
    const ten = ipaScript("a e", 10);
    const twelve = ipaScript("a e", 12);
    expect(twelve[1].at - twelve[0].at).toBeCloseTo(ten[1].at - ten[0].at);
    // A word with consonants is shorter than style 10; one with only vowels is the same.
    expect(ipaScript("ˈkasa", 12).at(-1)!.at).toBeLessThan(ipaScript("ˈkasa", 10).at(-1)!.at);
    expect(ipaScript("ˈaeiou", 12).at(-1)!.at).toBeCloseTo(ipaScript("ˈaeiou", 10).at(-1)!.at);
  });

  it("styles 0 to 9 are not changed by the new knobs", () => {
    for (const style of [5, 6, 7, 8, 9]) for (const e of ipaScript("ˈbwenas ˈnotʃes", style)) expect(e.stretch).toBeCloseTo(F.voice.slow);
    for (const style of [1, 2, 3, 4]) for (const e of ipaScript("ˈbwenas ˈnotʃes", style)) expect(e.stretch).toBeUndefined();
  });

  it("single vowels are the held ones from style 10 on, and only the single vowels", () => {
    for (const style of [10, 11, 12]) {
      const eff = ipaScript("ˈbwenas ˈdias ˈkasa", style).map((e) => e.effect!);
      expect(eff.filter((e) => e.startsWith("voiceHeld")).length, String(style)).toBeGreaterThan(3);
      expect(eff.some((e) => /^voiceFilt[AEIOU]/.test(e)), String(style)).toBe(false);
      expect(eff.some((e) => e.startsWith("voiceDiph")), String(style)).toBe(true);
    }
    for (const style of [5, 6, 7, 8, 9]) expect(ipaScript("ˈkasa", style).some((e) => e.effect!.startsWith("voiceHeld")), String(style)).toBe(false);
  });

  it("a held vowel has the diphthong's level and hold, a plain vowel's resonances, and the plain vowel's time", () => {
    const S = DIPHTHONG_SHAPE;
    for (const v of ["A", "E", "I", "O", "U"]) {
      const plain = SOUND.effects[`voiceFilt${v}`].voices[0] as unknown as { formants: { freq: number }[]; length: number };
      const held = SOUND.effects[`voiceHeld${v}`].voices[0] as unknown as { formants: { freq: number; path?: unknown }[]; hold: number; gain: number; length: number };
      expect(held.formants.map((f) => f.freq)).toEqual(plain.formants.map((f) => f.freq));
      expect(held.formants.every((f) => f.path === undefined)).toBe(true);
      expect(held.hold).toBe(S.hold);
      expect(held.gain).toBeCloseTo(S.level);
      expect(held.length).toBeCloseTo(VOWEL_TIME.plain);
      const stress = SOUND.effects[`voiceHeld${v}Stress`].voices[0] as unknown as { gain: number; length: number };
      expect(stress.gain).toBeCloseTo(S.level * 1.4);
      expect(stress.length).toBeCloseTo(VOWEL_TIME.stress);
    }
    // It is the same level as a diphthong's vowel, which is the point.
    const diph = SOUND.effects.voiceDiphJE.voices[0] as unknown as { gain: number; hold: number };
    expect((SOUND.effects.voiceHeldE.voices[0] as unknown as { gain: number }).gain).toBe(diph.gain);
  });

  it("every sound ends about when its slot does: it does not run into the next sound by more than a few ms, in styles 9 to 12", () => {
    for (const style of [9, 10, 11, 12]) {
      for (const ipa of ["ˈbwenas ˈdias", "ˈkasa ˈmana", "estuˈdjajs", "ˈaɾa ˈara ˈatʃa ˈaɡa"]) {
        const script = ipaScript(ipa, style);
        script.slice(0, -1).forEach((e, i) => {
          const slot = script[i + 1].at - e.at;
          // The longest voice of the effect, counting its delay (the burst of a stop, a pulse of the trill).
          const end = Math.max(...SOUND.effects[e.effect!].voices.map((v) => ((v as { delay?: number }).delay ?? 0) * (e.stretch ?? 1) + v.length * (e.stretch ?? 1)));
          expect(end - slot, `${style} ${ipa} ${e.effect}`).toBeLessThan(0.012);
        });
      }
    }
  });

  it("the variant numbers are sane and in config", () => {
    expect(V.longerVowels).toBeGreaterThan(1);
    expect(V.longerVowels).toBeLessThanOrEqual(2);
    expect(V.quickConsonants).toBeGreaterThan(0.4);
    expect(V.quickConsonants).toBeLessThan(1);
  });
});

