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
export type Bus = "effects" | "music" | "sleep";

const NOISE_SECONDS = 0.5;
const FLOOR = 0.0001;

// Dev only (issue 115): `?limiter=off` leaves the limiter out for the visit, to compare.
// A built game ignores it.
export function devLimiter(search = typeof location === "undefined" ? "" : location.search, dev = import.meta.env?.DEV): boolean {
  if (!dev) return true;
  return new URLSearchParams(search).get("limiter") !== "off";
}

const isNoise = (v: Voice): v is NoiseVoice => "noise" in v;
const isFormant = (v: Voice): v is FormantVoice => "formants" in v;

// Makes the sounds. It owns the master volume and the two buses, turns a voice
// description (config.ts) into oscillators and gains, stops them when they are
// done and refuses new effect voices past the cap, so a pile-up can't clip or
// swamp the page. It only talks to the `AudioContextLike` it is given.
export class Synth {
  private readonly master: GainLike;
  private readonly buses: Partial<Record<Bus, GainLike>>;
  // Where each bus's level is going: it left `from` at `t0` and reaches `to` at `t1`
  // (context seconds), so its level at any moment is known without asking the node.
  private readonly ramps: Record<Bus, { from: number; to: number; t0: number; t1: number }>;
  private noise: BufferLike | null = null;
  // End times (context seconds) of the effect voices still playing.
  private active: number[] = [];
  private isMuted = false;

  constructor(
    private readonly ctx: AudioContextLike,
    private readonly random: () => number = Math.random,
    limiter: boolean = SOUND.limiter.enabled && devLimiter(),
  ) {
    this.master = ctx.createGain();
    this.master.gain.value = SOUND.master;
    // master -> limiter -> speakers (or master -> speakers with no limiter)
    const comp = limiter ? ctx.createDynamicsCompressor?.() : undefined;
    if (comp) {
      const L = SOUND.limiter;
      comp.threshold.value = L.threshold;
      comp.knee.value = L.knee;
      comp.ratio.value = L.ratio;
      comp.attack.value = L.attack;
      comp.release.value = L.release;
      this.master.connect(comp);
      comp.connect(ctx.destination);
    } else this.master.connect(ctx.destination);
    const effects = ctx.createGain();
    const music = ctx.createGain();
    effects.gain.value = 1;
    music.gain.value = SOUND.musicLevel;
    effects.connect(this.master);
    music.connect(this.master);
    this.buses = { effects, music };
    const rest = (to: number) => ({ from: to, to, t0: 0, t1: 0 });
    this.ramps = { effects: rest(1), music: rest(SOUND.musicLevel), sleep: rest(0) };
  }

  // A bus's gain node. The lullaby's `sleep` bus (issue 078) is made the first
  // time it is used, silent until it is ramped up, so a game that never sleeps
  // makes exactly the nodes it always did.
  private bus(bus: Bus): GainLike {
    let node = this.buses[bus];
    if (!node) {
      node = this.ctx.createGain();
      node.gain.value = 0;
      node.connect(this.master);
      this.buses[bus] = node;
    }
    return node;
  }

  // The level a bus has right now (a ramp in progress is read part of the way).
  busLevel(bus: Bus): number {
    const r = this.ramps[bus];
    const now = this.ctx.currentTime;
    if (now >= r.t1) return r.to;
    if (now <= r.t0) return r.from;
    return r.from + ((r.to - r.from) * (now - r.t0)) / (r.t1 - r.t0);
  }

  // Moves a bus to `level` in a straight line over `seconds`, from wherever it is
  // now, replacing a ramp already going. Only the bus changes, never the notes on
  // it, and never the master (so mute is not touched).
  rampBus(bus: Bus, level: number, seconds: number): void {
    const now = this.ctx.currentTime;
    const from = this.busLevel(bus);
    const gain = this.bus(bus).gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(from, now);
    if (seconds > 0) gain.linearRampToValueAtTime(level, now + seconds);
    else gain.setValueAtTime(level, now);
    this.ramps[bus] = { from, to: level, t0: now, t1: now + Math.max(0, seconds) };
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
    // A voice with `hold` stays at full level for that fraction of its length first.
    if (isFormant(voice) && voice.hold !== undefined) env.gain.setValueAtTime(peak, t0 + voice.hold * length);
    env.gain.exponentialRampToValueAtTime(FLOOR, t1);
    env.connect(this.bus(bus));

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
        if (formant.path !== undefined) {
          filter.frequency.setValueAtTime(formant.freq, t0);
          for (const [fraction, hz] of formant.path) filter.frequency.exponentialRampToValueAtTime(hz, t0 + fraction * (t1 - t0));
        } else if (formant.endFreq !== undefined) {
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
