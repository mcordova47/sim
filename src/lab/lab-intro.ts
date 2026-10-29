import { ENCOUNTERS, MUSIC, SOUND, TIMESTEP } from "../game/config";

// "Play with the encounter intro" (issue 123): the real entrance schedule `ENCOUNTERS.entrance.sounds`
// played through the lab's engine, then the lab track starting on the hit. Nothing is copied: the
// schedule, the cue names (`SOUND.cues`), the effects and the semitone pitch rule all come from the game's
// config, and a frame is TIMESTEP seconds (the game steps at 60 a second).

export type IntroSound = readonly (readonly [number, string, number])[];

export interface IntroEvent {
  // Seconds after the start of the entrance.
  at: number;
  // The effect (a key of SOUND.effects) the cue names, or null if the cue is unknown (the game then plays nothing).
  effect: string | null;
  // Frequency multiplier, or undefined for the cue's own pitch (the game's rule: semitones 0 is left alone).
  pitch: number | undefined;
}

export interface IntroPlan {
  events: IntroEvent[];
  // Seconds from the start to the hit (the frame the card appears and the music starts).
  hitAt: number;
}

export const frameSeconds = (frame: number): number => frame * TIMESTEP;

// The entrance's sounds as times and effects, in schedule order.
export function introPlan(
  sounds: IntroSound = ENCOUNTERS.entrance.sounds,
  cues: Record<string, string> = SOUND.cues,
  startFrame: number = hitFrame(sounds),
): IntroPlan {
  return {
    events: sounds.map(([frame, cue, semitones]) => ({
      at: frameSeconds(frame),
      effect: cues[cue] ?? null,
      pitch: semitones === 0 ? undefined : 2 ** (semitones / 12),
    })),
    hitAt: frameSeconds(startFrame),
  };
}

// The frame of the hit chord (the last sound of the entrance).
export function hitFrame(sounds: IntroSound = ENCOUNTERS.entrance.sounds): number {
  return sounds.find(([, cue]) => cue === "encounter-hit")?.[0] ?? Math.max(...sounds.map(([f]) => f));
}

export interface IntroHooks {
  // Plays an effect after `delay` seconds; false if it was left out.
  playAt(effect: string, pitch: number | undefined, delay: number): void;
  // The loop starts now (the first note lands about 0.05 s later, as everywhere in the lab).
  startLoop(): void;
}

// Runs one preview on the audio clock: each cue is handed to the engine a little before it is due
// (like the music player's lookahead, so the voice cap sees only what is about to sound) and the loop is
// started a hair before the hit so its first note lands on it.
export class IntroPreview {
  private plan: IntroPlan | null = null;
  private t0 = 0;
  private next = 0;
  private looped = false;

  constructor(
    private readonly hooks: IntroHooks,
    private readonly lookahead: number = MUSIC.lookahead,
    // The player begins its first note this long after `start` (see MusicPlayer.update).
    private readonly startDelay: number = 0.05,
  ) {}

  get running(): boolean {
    return this.plan !== null;
  }

  // True while the entrance has not reached its hit yet.
  get inEntrance(): boolean {
    return this.plan !== null && !this.looped;
  }

  start(plan: IntroPlan, now: number): void {
    this.plan = plan;
    this.t0 = now;
    this.next = 0;
    this.looped = false;
    this.tick(now);
  }

  tick(now: number): void {
    const plan = this.plan;
    if (!plan) return;
    while (this.next < plan.events.length && this.t0 + plan.events[this.next].at <= now + this.lookahead) {
      const e = plan.events[this.next++];
      if (e.effect) this.hooks.playAt(e.effect, e.pitch, Math.max(0, this.t0 + e.at - now));
    }
    if (!this.looped && now >= this.t0 + plan.hitAt - this.startDelay) {
      this.looped = true;
      this.hooks.startLoop();
    }
  }

  stop(): void {
    this.plan = null;
    this.looped = false;
  }
}

