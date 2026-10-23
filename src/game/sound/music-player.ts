import { MUSIC } from "../config";
import type { Track, TrackNote } from "../music/track";
import type { Synth } from "./synth";

interface Event {
  // Beats from the start of the loop.
  start: number;
  length: number;
  note: TrackNote;
  wave: string;
  volume: number;
}

// Plays one track at a time, looping, a little ahead of the audio clock. It
// holds no timers: the game calls `update(synth)` every frame and it schedules
// the notes that fall in the next `MUSIC.lookahead` seconds. With no synth
// (audio not started yet, or unavailable) it just remembers what to play, and
// starts as soon as there is one.
export class MusicPlayer {
  private current: Track | null = null;
  private events: Event[] = [];
  private cursor = 0;
  private loop = 0;
  // Context time at which the first loop began; null until it can be set.
  private origin: number | null = null;

  get track(): Track | null {
    return this.current;
  }

  play(track: Track | null): void {
    this.current = track;
    this.cursor = 0;
    this.loop = 0;
    this.origin = null;
    this.events = track
      ? track.channels
          .flatMap((c) => c.notes.map((note) => ({ start: note.start, length: note.length, note, wave: c.wave, volume: c.volume })))
          .sort((a, b) => a.start - b.start)
      : [];
  }

  stop(): void {
    this.play(null);
  }

  update(synth: Synth | null): void {
    const track = this.current;
    if (!track || !synth || this.events.length === 0) return;
    const now = synth.now;
    const seconds = 60 / track.tempo;
    const loopLength = track.beats * seconds;
    if (this.origin === null) this.origin = now + 0.05;
    // Fell far behind (the tab was in the background): jump forward whole loops.
    const behind = now - (this.origin + this.loop * loopLength);
    if (behind > loopLength) {
      const skip = Math.floor(behind / loopLength);
      this.loop += skip;
      this.cursor = 0;
    }
    for (let guard = 0; guard < 10000; guard++) {
      const e = this.events[this.cursor];
      const time = this.origin + this.loop * loopLength + e.start * seconds;
      if (time > now + MUSIC.lookahead) return;
      if (time >= now - MUSIC.skipLate) this.sound(synth, e, time, seconds);
      this.cursor++;
      if (this.cursor >= this.events.length) {
        this.cursor = 0;
        this.loop++;
      }
    }
  }

  private sound(synth: Synth, e: Event, time: number, seconds: number): void {
    const gain = MUSIC.noteGain * e.volume;
    if (e.note.drum) {
      for (const voice of MUSIC.drums[e.note.drum] ?? []) synth.voice(voice, time, { gain: gain * 0.6 }, "music");
      return;
    }
    synth.voice(
      { wave: e.wave as "square", freq: e.note.freq!, length: e.length * seconds * MUSIC.legato, gain },
      time,
      {},
      "music",
    );
  }
}
