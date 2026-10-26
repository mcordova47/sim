import { FLASHCARDS as F } from "../config";

// Mumblespeak (issue 026): instead of real speech, Spanish is "spoken" as a run
// of short blips, one per letter, in the manner of Animal Crossing. It is
// deterministic, so a word always sounds the same.

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

// Plays a run of notes over time through `voice`; `update` is called every frame.
export class Mumble {
  private notes: (number | null)[] = [];
  private next = 0;
  private clock = 0;

  constructor(private readonly voice: (pitch: number) => void) {}

  say(text: string): void {
    this.notes = mumbleNotes(text);
    this.next = 0;
    this.clock = 0;
  }

  stop(): void {
    this.notes = [];
    this.next = 0;
  }

  get speaking(): boolean {
    return this.next < this.notes.length;
  }

  update(dt: number): void {
    if (!this.speaking) return;
    this.clock += dt;
    const step = 1 / F.mumble.lettersPerSecond;
    while (this.speaking && this.clock >= this.next * step) {
      const pitch = this.notes[this.next++];
      if (pitch !== null) this.voice(pitch);
    }
  }
}
