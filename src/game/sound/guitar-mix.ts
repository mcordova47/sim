import { MUSIC, SOUND } from "../config";

// An offline estimate of how loud a pile of effects gets at the output (issue 114a, the
// clipping check). It adds up the waveforms of the effects' voices the way the synth would
// (the same attack ramp and exponential release, then the master gain), at 16 kHz. A filtered
// noise burst is counted as unfiltered noise, which is louder than the real thing, so the peak
// is an upper estimate. The browser's output clips above 1.
export interface MixEvent {
  effect: string;
  time: number; // seconds
  pitch?: number;
  gain?: number;
  stretch?: number;
}

const RATE = 16000;
const FLOOR = 0.0001;

function wave(kind: string, phase: number): number {
  const p = phase - Math.floor(phase);
  if (kind === "sine") return Math.sin(2 * Math.PI * p);
  if (kind === "square") return p < 0.5 ? 1 : -1;
  if (kind === "sawtooth") return 2 * p - 1;
  return 1 - 4 * Math.abs(p - 0.5); // triangle
}

// The largest absolute sample of the sum, including the master gain.
export function mixPeak(events: MixEvent[], seconds?: number): number {
  type V = { t0: number; t1: number; peak: number; tone?: { wave: string; freq: number }; noise: boolean };
  const voices: V[] = [];
  for (const e of events) {
    const def = SOUND.effects[e.effect];
    const stretch = e.stretch ?? 1;
    for (const v of def.voices) {
      const t0 = e.time + (v.delay ?? 0) * stretch;
      const length = v.length * stretch;
      const peak = Math.max(FLOOR, v.gain * (e.gain ?? 1));
      if ("wave" in v) voices.push({ t0, t1: t0 + length, peak, tone: { wave: v.wave, freq: v.freq * (e.pitch ?? 1) }, noise: false });
      else if ("noise" in v) voices.push({ t0, t1: t0 + length, peak, noise: true });
    }
  }
  const end = seconds ?? Math.max(0, ...voices.map((v) => v.t1)) + 0.05;
  let seed = 12345;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  let max = 0;
  for (let i = 0; i < end * RATE; i++) {
    const t = i / RATE;
    let sum = 0;
    for (const v of voices) {
      if (t < v.t0 || t > v.t1) continue;
      const attack = Math.min(MUSIC.attack, (v.t1 - v.t0) / 2);
      const env = t < v.t0 + attack ? FLOOR + (v.peak - FLOOR) * ((t - v.t0) / attack) : v.peak * (FLOOR / v.peak) ** ((t - v.t0 - attack) / Math.max(1e-6, v.t1 - v.t0 - attack));
      sum += env * (v.noise ? rand() : wave(v.tone!.wave, v.tone!.freq * (t - v.t0)));
    }
    max = Math.max(max, Math.abs(sum));
  }
  return max * SOUND.master;
}
