import { MUSIC, SOUND, type EffectDef, type FormantVoice, type NoiseVoice, type ToneVoice, type Voice } from "../config";
import type { AudioContextLike, BufferLike, GainLike, NodeLike } from "./audio-types";

export interface PlayOptions {
  // Multiplies every frequency (1 is as written).
  pitch?: number;
  // Multiplies every voice's loudness.
  gain?: number;
  // Multiplies every voice's length and delay (2 is twice as slow). The slowed
  // speech-like voice uses it.
  stretch?: number;
}

// Which bus a voice goes to. Music voices are not counted against the effect voice cap.
export type Bus = "effects" | "music";

const NOISE_SECONDS = 0.5;
const FLOOR = 0.0001;

const isNoise = (v: Voice): v is NoiseVoice => "noise" in v;
const isFormant = (v: Voice): v is FormantVoice => "formants" in v;

// Makes the sounds. It owns the master volume and the two buses, turns a voice
// description (config.ts) into oscillators and gains, stops them when they are
// done and refuses new effect voices past the cap, so a pile-up can't clip or
// swamp the page. It only talks to the `AudioContextLike` it is given.
export class Synth {
  private readonly master: GainLike;
  private readonly buses: Record<Bus, GainLike>;
  private noise: BufferLike | null = null;
  // End times (context seconds) of the effect voices still playing.
  private active: number[] = [];
  private isMuted = false;

  constructor(
    private readonly ctx: AudioContextLike,
    private readonly random: () => number = Math.random,
  ) {
    this.master = ctx.createGain();
    this.master.gain.value = SOUND.master;
    this.master.connect(ctx.destination);
    const effects = ctx.createGain();
    const music = ctx.createGain();
    effects.gain.value = 1;
    music.gain.value = SOUND.musicLevel;
    effects.connect(this.master);
    music.connect(this.master);
    this.buses = { effects, music };
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  set muted(value: boolean) {
    this.isMuted = value;
    const gain = this.master.gain;
    gain.setValueAtTime(value ? 0 : SOUND.master, this.ctx.currentTime);
  }

  // How many effect voices are playing at the moment.
  get voices(): number {
    this.prune();
    return this.active.length;
  }

  private prune(): void {
    const now = this.ctx.currentTime;
    this.active = this.active.filter((end) => end > now);
  }

  // Plays an effect now (or after `delay` seconds). Returns false if it was
  // left out because too many voices were playing.
  play(def: EffectDef, options: PlayOptions = {}, delay = 0): boolean {
    this.prune();
    const limit = SOUND.maxVoices - (def.priority === "low" ? SOUND.lowReserve : 0);
    // The whole effect or none of it, so a chime is never half a chime.
    if (this.active.length + def.voices.length > limit) return false;
    const start = this.ctx.currentTime + delay;
    for (const voice of def.voices) this.voice(voice, start, options, "effects");
    return true;
  }

  // Plays one voice at an absolute context time. Music uses this directly.
  voice(voice: Voice, start: number, options: PlayOptions = {}, bus: Bus = "effects", length = voice.length * (options.stretch ?? 1)): void {
    const t0 = start + (voice.delay ?? 0) * (options.stretch ?? 1);
    const t1 = t0 + length;
    const peak = Math.max(FLOOR, voice.gain * (options.gain ?? 1));
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(FLOOR, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + Math.min(MUSIC.attack, length / 2));
    env.gain.exponentialRampToValueAtTime(FLOOR, t1);
    env.connect(this.buses[bus]);

    let source: { start(t?: number): void; stop(t?: number): void; onended: (() => void) | null } & NodeLike;
    const extras: NodeLike[] = [];
    if (isFormant(voice)) {
      // A source at one pitch through resonances: the pitch is the source's alone
      // (`options.pitch` moves it), and the resonances, which make the vowel, stay
      // where they are. That is how the vowel changes with no change of pitch.
      const osc = this.ctx.createOscillator();
      osc.type = voice.source;
      osc.frequency.setValueAtTime(voice.freq * (options.pitch ?? 1), t0);
      for (const formant of voice.formants) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        if (formant.endFreq !== undefined) {
          filter.frequency.setValueAtTime(formant.freq, t0);
          filter.frequency.exponentialRampToValueAtTime(formant.endFreq, t1);
        } else {
          filter.frequency.value = formant.freq;
        }
        filter.Q.value = formant.q;
        const level = this.ctx.createGain();
        level.gain.value = formant.gain;
        osc.connect(filter);
        filter.connect(level);
        level.connect(env);
        extras.push(filter, level);
      }
      source = osc;
    } else if (isNoise(voice)) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = voice.noise;
      filter.frequency.value = voice.freq * (options.pitch ?? 1);
      filter.Q.value = voice.q ?? 0.7;
      src.connect(filter);
      filter.connect(env);
      source = src;
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = voice.wave;
      const pitch = options.pitch ?? 1;
      osc.frequency.setValueAtTime(voice.freq * pitch, t0);
      if ((voice as ToneVoice).endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime((voice as ToneVoice).endFreq! * pitch, t1);
      }
      osc.connect(env);
      source = osc;
    }
    source.start(t0);
    source.stop(t1 + 0.02);
    source.onended = () => {
      source.disconnect();
      for (const node of extras) node.disconnect();
      env.disconnect();
    };
    if (bus === "effects") this.active.push(t1 + 0.02);
  }

  private noiseBuffer(): BufferLike {
    if (!this.noise) {
      const length = Math.floor(this.ctx.sampleRate * NOISE_SECONDS);
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = this.random() * 2 - 1;
    }
    return this.noise;
  }
}
