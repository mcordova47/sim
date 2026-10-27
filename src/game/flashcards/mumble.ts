import { FLASHCARDS as F } from "../config";
import { isGap, readIpa, type Phoneme } from "./ipa";

// How the Spanish side of a card is "spoken" (issue 026): never with the
// browser's text-to-speech, but as a run of short chiptune sounds. Two voices:
//
// - the IPA voice, one sound per phoneme of the card's transcription, so the
//   rhythm is how the word is said (`ipaScript`);
// - the spelling voice, one blip per letter, for anything with no transcription
//   (`spellingScript`).
//
// Both are deterministic: a word always sounds the same. A script is a list of
// sounds with the time each starts; `Mumble` plays one over time.

// One sound: which effect from `SOUND.effects`, how high, and how loud (1 is as written).
export interface VoiceSound {
  effect?: string;
  pitch: number;
  gain?: number;
  // Stretches the sound's length (2 is twice as long).
  stretch?: number;
}

export interface VoiceEvent extends VoiceSound {
  // Seconds from the start of the script.
  at: number;
}

// A note per character: a pitch (a multiple of the base blip) for a letter, or
// null for a rest (a space or a mark).
export function mumbleNotes(text: string): (number | null)[] {
  const notes: (number | null)[] = [];
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  for (const ch of plain) {
    if (notes.length >= F.mumble.maxChars) break;
    if (!/[a-z]/.test(ch)) {
      notes.push(null);
      continue;
    }
    const vowel = F.mumble.vowelPitch[ch];
    const pitches = F.mumble.consonantPitches;
    notes.push(vowel ?? pitches[(ch.charCodeAt(0) - 97) % pitches.length]);
  }
  return notes;
}

export function spellingScript(text: string): VoiceEvent[] {
  const step = 1 / F.mumble.lettersPerSecond;
  const events: VoiceEvent[] = [];
  mumbleNotes(text).forEach((pitch, i) => {
    if (pitch !== null) events.push({ at: i * step, effect: "mumble", pitch });
  });
  return events;
}

// A number from -1 to 1 that depends only on its inputs, so the same word always
// gets the same wobble.
function wobble(index: number, symbol: string): number {
  let h = (index + 1) * 374761393 + symbol.codePointAt(0)! * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 2001) / 1000 - 1;
}

// The voice styles, each adding to the one before: 1 `ipa` (one tone per vowel),
// 2 `formants` (vowels by timbre), 3 `intonation`, 4 `jitter`. (Style 0 is the
// spelling voice, which has no transcription to read.)
export const VOICE_STYLES = ["spelling", "ipa", "formants", "intonation", "jitter", "filtered", "filtered+", "glides", "murmurs", "diphthongs", "longer", "faster", "consfast"] as const;

// The order V steps through every voice in (`&voices=all` in the practice deck):
// the diphthong voice and the three timing variants (longer vowels, faster,
// quicker consonants), then each earlier voice, down to spelling. V goes on from
// wherever the current voice is in this list.
export const VOICE_CYCLE: readonly number[] = [9, 10, 11, 12, 8, 7, 6, 5, 4, 3, 2, 1, 0];

// What each style does, on top of reading the transcription: how vowels are
// made, whether pitch follows intonation, whether each sound is a little off, and
// whether it is slowed down.
const RECIPES = [
  null,
  { vowels: "pitch", intonation: false, jitter: false, slow: false, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  { vowels: "tones", intonation: false, jitter: false, slow: false, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  { vowels: "tones", intonation: true, jitter: false, slow: false, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  { vowels: "tones", intonation: true, jitter: true, slow: false, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  { vowels: "filtered", intonation: false, jitter: false, slow: true, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: false, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  // Style 7: filtered+ with the glides made by the resonances moving.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: false, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  // Style 8: and the nasals and voiced stops made from the vowels' own source.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: true, diphthongs: false, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  // Style 9: and each diphthong one sound whose resonances move, not a glide and a vowel.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: true, diphthongs: true, held: false, speed: 1, vowelScale: 1, consonantScale: 1 },
  // Style 10: the single vowels longer and held at full level like a diphthong, to sit with them.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: true, diphthongs: true, held: true, speed: 1, vowelScale: F.voice.variants.longerVowels, consonantScale: 1 },
  // Style 11: and everything a little faster.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: true, diphthongs: true, held: true, speed: F.voice.variants.faster, vowelScale: F.voice.variants.longerVowels, consonantScale: 1 },
  // Style 12: instead, only the consonants a little faster.
  { vowels: "filtered", intonation: true, jitter: true, slow: true, glides: true, murmurs: true, diphthongs: true, held: true, speed: 1, vowelScale: F.voice.variants.longerVowels, consonantScale: F.voice.variants.quickConsonants },
] as const;

export function ipaScript(ipa: string, style = 1): VoiceEvent[] {
  const recipe = RECIPES[Math.min(Math.max(Math.trunc(style) || 1, 1), RECIPES.length - 1)] ?? RECIPES[1];
  const { units } = readIpa(ipa, recipe.vowels, { glides: recipe.glides, murmurs: recipe.murmurs, diphthongs: recipe.diphthongs, held: recipe.held });
  // How slow the whole voice is, and the part of it that is a single vowel or a
  // consonant (a diphthong, being one sound of its own, is neither).
  const k = (recipe.slow ? F.voice.slow : 1) * recipe.speed;
  const sounds = units.filter((u): u is Phoneme => !isGap(u));
  const lastVowel = sounds.map((s) => s.vowel).lastIndexOf(true);
  const events: VoiceEvent[] = [];
  let at = 0;
  let n = 0;
  for (const unit of units) {
    if (isGap(unit)) {
      at += unit.gap * k;
      continue;
    }
    let pitch = unit.pitch;
    if (recipe.intonation) {
      const I = F.voice.intonation;
      const along = sounds.length > 1 ? n / (sounds.length - 1) : 0.5;
      pitch *= 1 + I.declination * (along - 0.5) + (unit.stressed ? I.stressBump : 0) + (n === lastVowel ? I.finalFall : 0);
    }
    if (recipe.jitter) pitch *= 1 + F.voice.jitter * wobble(n, unit.symbol);
    // A single vowel and a consonant can each be scaled in time, the sound with the
    // time it takes, so that a longer vowel is a longer sound and not a gap.
    const own = unit.diphthong ? 1 : unit.vowel ? recipe.vowelScale : recipe.consonantScale;
    const stretch = k * own;
    events.push({ at, effect: unit.effect, pitch, ...(unit.gain !== undefined ? { gain: unit.gain } : {}), ...(recipe.slow || own !== 1 ? { stretch } : {}) });
    at += unit.length * stretch;
    n++;
  }
  return events;
}

// Plays a script over time through `voice`; `update` is called every frame.
export class Mumble {
  private events: VoiceEvent[] = [];
  private next = 0;
  private clock = 0;

  constructor(private readonly voice: (sound: VoiceSound) => void) {}

  // Plays the spelling voice for `text`.
  say(text: string): void {
    this.play(spellingScript(text));
  }

  play(script: VoiceEvent[]): void {
    this.events = [...script].sort((a, b) => a.at - b.at);
    this.next = 0;
    this.clock = 0;
  }

  stop(): void {
    this.events = [];
    this.next = 0;
  }

  get speaking(): boolean {
    return this.next < this.events.length;
  }

  update(dt: number): void {
    if (!this.speaking) return;
    this.clock += dt;
    while (this.speaking && this.clock >= this.events[this.next].at) {
      const { at: _at, ...sound } = this.events[this.next++];
      this.voice(sound);
    }
  }
}
