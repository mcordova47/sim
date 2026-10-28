import { GUITAR_SKILL, MUSIC, SOUND } from "../config";
import { grooveBar, grooveChord, grooveSlotTime } from "./guitar-skill";
import type { Synth } from "./synth";

// The guitar's groove (issue 114b): a looping bass-and-harmony pattern on the music bus, played
// a little ahead of the audio clock exactly as the record player is (no timers; the game calls
// `update(synth)` every frame and it schedules what falls in the next `MUSIC.lookahead`
// seconds). The melody never waits for it: it only asks `chordAt` which chord is sounding.
export class GuitarGroove {
  // Context time of the first slot; null while stopped or waiting for the first update.
  private origin: number | null = null;
  private k = 0; // the next eighth to schedule
  private on = false;
  private effect = SOUND.guitarStrings.steel.string;
  private seed = 0;

  get running(): boolean {
    return this.on;
  }

  // Starts the loop from the next update. `effect` is the string tone it is played in (the instrument's).
  start(effect: string, seed = 0): void {
    this.on = true;
    this.effect = effect;
    this.seed = seed;
    this.origin = null;
    this.k = 0;
  }

  // Stops scheduling; notes already given to the audio clock ring out on their own decay.
  stop(): void {
    this.on = false;
    this.origin = null;
  }

  // Which chord is sounding at audio time `now` (the first one before the loop has begun).
  chordAt(now: number): string {
    if (this.origin === null) return grooveChord(0);
    return grooveChord(Math.max(0, Math.floor((now - this.origin) / grooveSlotTime(8, GUITAR_SKILL.tempo, 0))));
  }

  update(synth: Synth | null): void {
    if (!this.on || !synth) return;
    const now = synth.now;
    if (this.origin === null) this.origin = now + GUITAR_SKILL.groove.leadIn;
    const bars = (n: number) => grooveSlotTime(n * 8);
    // Fell far behind (the tab was in the background): jump forward whole bars, no burst.
    const behind = now - (this.origin + grooveSlotTime(this.k));
    if (behind > bars(1)) this.k += Math.floor(behind / bars(1)) * 8;
    for (let guard = 0; guard < 1000; guard++) {
      const time = this.origin + grooveSlotTime(this.k);
      if (time > now + MUSIC.lookahead) return;
      const bar = Math.floor(this.k / 8);
      const slot = this.k % 8;
      for (const note of grooveBar(bar, this.seed)) {
        if (note.slot !== slot) continue;
        const t = Math.max(this.origin, time + note.wobble);
        if (t >= now - MUSIC.skipLate) this.sound(synth, note.semis, note.gain, t);
      }
      this.k++;
    }
  }

  private sound(synth: Synth, semis: number, gain: number, time: number): void {
    const def = SOUND.effects[this.effect];
    if (!def) return;
    const options = { pitch: 2 ** (semis / 12), gain: gain * GUITAR_SKILL.groove.gain, stretch: GUITAR_SKILL.decay };
    for (const voice of def.voices) synth.voice(voice, time, options, "music");
  }
}
