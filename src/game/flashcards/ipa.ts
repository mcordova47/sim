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

const lookup = (symbol: string) => V.symbols[symbol] ?? (V.like[symbol] ? V.symbols[V.like[symbol]] : undefined);

export function readIpa(ipa: string): Reading {
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
    const entry = lookup(symbol);
    if (!entry) {
      unknown.add(symbol);
      continue;
    }
    phonemes++;
    if (entry.vowel && stressed) {
      units.push({ symbol, effect: V.stress.effect, pitch: entry.pitch * V.stress.pitch, length: V.stress.length });
      stressed = false;
    } else {
      units.push({ symbol, effect: entry.effect, pitch: entry.pitch, length: entry.length });
    }
  }
  while (units.length && isGap(units[units.length - 1])) units.pop();
  return { units, unknown: [...unknown] };
}
