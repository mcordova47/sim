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
  // The key of the symbol's entry in `FLASHCARDS.voice.symbols` (a look-alike has
  // its twin's), and for a glide the vowel it aims at ("i" for j, "u" for w).
  key: string;
  glide?: string;
  // How loud, if not as the effect is written (see `FLASHCARDS.voice.murmurs`).
  gain?: number;
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

// Further changes to the source-filter voice: `glides` makes /j/ and /w/ the
// resonances moving between the neighbouring vowel and the /i/ or /u/ they aim at
// (style 7), and `murmurs` makes the nasals and the voiced stops from the same
// source as the vowels (style 8).
export interface Extras {
  glides?: boolean;
  murmurs?: boolean;
  // Makes a vowel and the glide or glides touching it one sound whose resonances
  // move from the first to the second (style 9), instead of separate sounds.
  diphthongs?: boolean;
}

export function readIpa(ipa: string, vowels: VowelMaker | boolean = "pitch", extras: Extras = {}): Reading {
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
        key,
      });
    } else if (stress) {
      units.push({ symbol, effect: V.stress.effect, pitch: entry.pitch * V.stress.pitch, length: V.stress.length, vowel, stressed: true, key });
    } else {
      const murmur = maker === "filtered" && extras.murmurs ? V.murmurs[key] : undefined;
      const sound = murmur ?? entry;
      const gain = murmur?.gain;
      units.push({
        symbol,
        effect: sound.effect,
        pitch: sound.pitch,
        length: sound.length,
        vowel,
        stressed: false,
        key,
        ...(entry.glide ? { glide: entry.glide } : {}),
        ...(gain !== undefined ? { gain } : {}),
      });
    }
  }
  while (units.length && isGap(units[units.length - 1])) units.pop();
  if (maker === "filtered" && extras.diphthongs) mergeDiphthongs(units);
  else if (maker === "filtered" && extras.glides) {
    units.forEach((u, k) => {
      if (isGap(u) || !u.glide) return;
      const next = units[k + 1];
      const prev = units[k - 1];
      const name = `voiceGlide${u.key.toUpperCase()}`;
      if (next && !isGap(next) && next.vowel) {
        u.effect = `${name}To${next.key.toUpperCase()}`;
        u.length = V.glideLength.to;
      } else if (prev && !isGap(prev) && prev.vowel) {
        u.effect = `${name}From${prev.key.toUpperCase()}`;
        u.length = V.glideLength.from;
      } else return;
      u.pitch = 1;
    });
  }
  return { units, unknown: [...unknown] };
}

// Makes each diphthong one sound. A vowel with a glide just before it (bien) or
// just after it (aire), or both (the triphthong of estudiáis), becomes one
// phoneme whose effect is `voiceDiph` plus the glide, the vowel and the glide,
// and whose length is theirs added up. A glide between two vowels goes with the
// vowel after it (it starts that syllable), and a glide next to no vowel is left
// alone. Two vowels in a row are a hiatus, and stay two sounds.
function mergeDiphthongs(units: Unit[]): void {
  const sound = (k: number): Phoneme | null => (k >= 0 && k < units.length && !isGap(units[k]) ? (units[k] as Phoneme) : null);
  for (let k = 0; k < units.length; k++) {
    const vowel = sound(k);
    if (!vowel || !vowel.vowel) continue;
    const before = sound(k - 1);
    const after = sound(k + 1);
    const afterThat = sound(k + 2);
    const on = before?.glide ? before : null;
    // A glide after the vowel belongs to it unless a vowel follows the glide.
    const off = after?.glide && !afterThat?.vowel ? after : null;
    if (!on && !off) continue;
    const name = `voiceDiph${on ? on.key.toUpperCase() : ""}${vowel.key.toUpperCase()}${off ? off.key.toUpperCase() : ""}${vowel.stressed ? "Stress" : ""}`;
    const length = (on ? V.glideLength.to : 0) + (vowel.stressed ? V.formants.stressLength : V.formants.length) + (off ? V.glideLength.from : 0);
    const merged: Phoneme = { ...vowel, symbol: `${on?.symbol ?? ""}${vowel.symbol}${off?.symbol ?? ""}`, effect: name, pitch: 1, length };
    const first = on ? k - 1 : k;
    const count = (on ? 1 : 0) + 1 + (off ? 1 : 0);
    units.splice(first, count, merged);
    k = first;
  }
}
