import { GUITAR_SKILL, MUSIC } from "../config";
import type { Track, TrackNote } from "../music/track";
import type { Bus, Synth } from "./synth";

interface Event {
  // Beats from the start of the loop.
  start: number;
  length: number;
  note: TrackNote;
  wave: string;
  volume: number;
}

function eventsOf(track: Track): Event[] {
  return track.channels
    .flatMap((c) => c.notes.map((note) => ({ start: note.start, length: note.length, note, wave: c.wave, volume: c.volume })))
    .sort((a, b) => a.start - b.start);
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
  // A track waiting for the end of the loop that is playing (see `swap`).
  private pending: Track | null = null;
  // The record's level while a guitar groove plays (1 is as written): `duck` is where it is going
  // and `level` where it is now, moving by `duckFade` seconds for the whole way (issue 114b).
  duck = 1;
  private level = 1;
  private levelAt: number | null = null;

  // `bus` is where the notes go: the record player's is "music"; the sleep
  // lullaby's player uses "sleep".
  constructor(private readonly bus: Bus = "music") {}

  get track(): Track | null {
    return this.current;
  }

  play(track: Track | null): void {
    this.current = track;
    this.pending = null;
    this.cursor = 0;
    this.loop = 0;
    this.origin = null;
    this.events = track ? eventsOf(track) : [];
  }

  // Changes the track that is playing without a break: the new one takes over
  // when the current loop ends, on the beat (the track editor changing a track
  // while it plays). With nothing playing it just starts.
  swap(track: Track): void {
    if (!this.current || this.origin === null) this.play(track);
    else this.pending = track;
  }

  stop(): void {
    this.play(null);
  }

  update(synth: Synth | null): void {
    if (synth) this.fade(synth.now);
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
        const next = this.pending;
        if (next) {
          // The new track starts where the next loop would have. Its tempo and
          // length are used from the next call.
          this.origin += this.loop * loopLength;
          this.loop = 0;
          this.current = next;
          this.events = eventsOf(next);
          this.pending = null;
          return;
        }
      }
    }
  }

  // How far the record is turned down now (1 is not at all).
  get ducked(): number {
    return this.level;
  }

  private fade(now: number): void {
    const dt = this.levelAt === null ? 0 : Math.max(0, now - this.levelAt);
    this.levelAt = now;
    const step = dt / Math.max(0.001, GUITAR_SKILL.groove.duckFade);
    this.level = this.level < this.duck ? Math.min(this.duck, this.level + step) : Math.max(this.duck, this.level - step);
  }

  private sound(synth: Synth, e: Event, time: number, seconds: number): void {
    const gain = MUSIC.noteGain * e.volume * this.level;
    if (e.note.drum) {
      for (const voice of MUSIC.drums[e.note.drum] ?? []) synth.voice(voice, time, { gain: gain * 0.6 }, this.bus);
      return;
    }
    synth.voice(
      { wave: e.wave as "square", freq: e.note.freq!, length: e.length * seconds * MUSIC.legato, gain },
      time,
      {},
      this.bus,
    );
  }
}
