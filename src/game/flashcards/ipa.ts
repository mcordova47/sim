import { FLASHCARDS as F } from "../config";

// Reads a broad IPA transcription (no slashes or brackets, stress marked with
// ˈ before the stressed syllable, as the flashcards app's `IPA es-MX` column
// will hold) into the phonemes the voice sounds. It never throws: a symbol it
// does not know is skipped and reported, so the voice does not stop.

export interface Phoneme {
  symbol: string;
  // The effect, pitch and timeline length from `FLASHCARDS.voice`.
  effect: string;
  pitch: number;
  length: number;
  // Whether it is a vowel, and whether it carries the stress mark. The speech-like
  // voice shapes its pitch from these.
  vowel: boolean;
  stressed: boolean;
}

// A pause between words.
export interface Gap {
  gap: number;
}

export type Unit = Phoneme | Gap;

export const isGap = (u: Unit): u is Gap => "gap" in u;

export interface Reading {
  units: Unit[];
  unknown: string[];
}

const V = F.voice;
const TIE = /[͜͡]/;
const MARKS = /[̀-ͯ]/;
const BREAKS = /[\s/\[\]|‖]/;

const lookup = (symbol: string) => {
  const key = V.symbols[symbol] ? symbol : V.like[symbol];
  const entry = key ? V.symbols[key] : undefined;
  return entry ? { key: key!, entry } : undefined;
};

// How a vowel is made: "pitch" (the original voice: a tone at its own pitch, a
// little higher when stressed), "tones" (two tones at its formants over a buzz,
// at one pitch) or "filtered" (a source at one pitch through resonances at its
// formants). With the last two, stress is only length and loudness.
export type VowelMaker = "pitch" | "tones" | "filtered";

export function readIpa(ipa: string, vowels: VowelMaker | boolean = "pitch"): Reading {
  const maker: VowelMaker = vowels === true ? "tones" : vowels === false ? "pitch" : vowels;
  const units: Unit[] = [];
  const unknown = new Set<string>();
  const chars = [...ipa.normalize("NFC")];
  let stressed = false;
  let phonemes = 0;
  for (let i = 0; i < chars.length && phonemes < V.maxPhonemes; i++) {
    const ch = chars[i];
    if (BREAKS.test(ch)) {
      if (units.length && !isGap(units[units.length - 1])) units.push({ gap: V.gap });
      stressed = false;
      continue;
    }
    if (ch === "ˈ") {
      stressed = true;
      continue;
    }
    if (ch === "ˌ" || ch === ".") continue;
    // `(se)` on a reflexive verb is the optional part: it is not voiced.
    if (ch === "(") {
      while (i < chars.length && chars[i] !== ")") i++;
      continue;
    }
    if (ch === ")") continue;
    if (TIE.test(ch) || MARKS.test(ch)) continue;
    if (ch === "ː") {
      const last = units[units.length - 1];
      if (last && !isGap(last)) last.length *= V.longer;
      continue;
    }
    // An affricate, written tʃ or t͡ʃ (and dʒ).
    let symbol = ch;
    if (ch === "t" || ch === "d") {
      const next = chars[i + 1];
      const tied = next !== undefined && TIE.test(next);
      const second = tied ? chars[i + 2] : next;
      if (second === "ʃ" || second === "ʒ") {
        symbol = ch + second;
        i += tied ? 2 : 1;
      }
    }
    const found = lookup(symbol);
    if (!found) {
      unknown.add(symbol);
      continue;
    }
    const { key, entry } = found;
    phonemes++;
    const vowel = entry.vowel === true;
    const stress = vowel && stressed;
    if (stress) stressed = false;
    if (maker !== "pitch" && vowel) {
      const name = `${maker === "filtered" ? "voiceFilt" : "voiceFormant"}${key.toUpperCase()}`;
      units.push({
        symbol,
        effect: stress ? `${name}Stress` : name,
        pitch: 1,
        length: stress ? V.formants.stressLength : V.formants.length,
        vowel,
        stressed: stress,
      });
    } else if (stress) {
      units.push({ symbol, effect: V.stress.effect, pitch: entry.pitch * V.stress.pitch, length: V.stress.length, vowel, stressed: true });
    } else {
      units.push({ symbol, effect: entry.effect, pitch: entry.pitch, length: entry.length, vowel, stressed: false });
    }
  }
  while (units.length && isGap(units[units.length - 1])) units.pop();
  return { units, unknown: [...unknown] };
}
