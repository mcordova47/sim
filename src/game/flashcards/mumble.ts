import { FLASHCARDS as F } from "../config";
import { isGap, readIpa } from "./ipa";

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

export function ipaScript(ipa: string): VoiceEvent[] {
  const events: VoiceEvent[] = [];
  let at = 0;
  for (const unit of readIpa(ipa).units) {
    if (isGap(unit)) {
      at += unit.gap;
      continue;
    }
    events.push({ at, effect: unit.effect, pitch: unit.pitch });
    at += unit.length;
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
