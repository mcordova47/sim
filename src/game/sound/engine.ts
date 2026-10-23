import { SOUND } from "../config";
import type { AudioContextLike, AudioFactory } from "./audio-types";
import { MusicPlayer } from "./music-player";
import { Synth, type PlayOptions } from "./synth";

// The audio side of the sound feature, with no knowledge of the game. Browsers
// only allow audio after a key press, so nothing is made until `unlock()`; until
// then (and if audio is missing or throws) every call quietly does nothing.
export class SoundEngine {
  readonly music = new MusicPlayer();
  private ctx: AudioContextLike | null = null;
  private synth: Synth | null = null;
  private broken = false;
  private isMuted = false;

  constructor(
    private readonly factory: AudioFactory,
    private readonly random: () => number = Math.random,
  ) {}

  get ready(): boolean {
    return this.synth !== null;
  }

  // True once audio has been tried and is not available.
  get unavailable(): boolean {
    return this.broken;
  }

  // Creates (or resumes) the audio context. Safe to call on every key press.
  unlock(): void {
    if (this.broken) return;
    try {
      if (!this.ctx) {
        const ctx = this.factory();
        if (!ctx) {
          this.broken = true;
          return;
        }
        this.ctx = ctx;
        this.synth = new Synth(ctx, this.random);
        this.synth.muted = this.isMuted;
      }
      // Browsers start the context suspended until a key press allows it.
      if (this.ctx.state === "suspended") void Promise.resolve(this.ctx.resume()).catch(() => {});
    } catch {
      this.broken = true;
      this.synth = null;
    }
  }

  get muted(): boolean {
    return this.isMuted;
  }

  set muted(value: boolean) {
    this.isMuted = value;
    if (this.synth) this.synth.muted = value;
  }

  // Plays the named effect from config.ts (an unknown name does nothing).
  play(name: string, options?: PlayOptions): void {
    const def = SOUND.effects[name];
    if (!def || !this.synth || this.isMuted) return;
    try {
      this.synth.play(def, options);
    } catch {
      // A sound that fails to play must never break the game.
    }
  }

  // Call every frame: schedules the next notes of the music.
  update(): void {
    if (!this.synth) return;
    try {
      this.music.update(this.synth);
    } catch {
      // Same: no sound is worth an error.
    }
  }
}
