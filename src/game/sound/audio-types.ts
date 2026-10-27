// The small part of Web Audio the sound feature uses. The browser's real
// AudioContext fits these shapes, and tests pass a fake that records what was
// asked of it, so no test needs a browser.
export interface ParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
  // Forgets the changes scheduled from `time` on (a new ramp replaces an old one).
  cancelScheduledValues(time: number): unknown;
}

export interface NodeLike {
  connect(destination: NodeLike): unknown;
  disconnect(): void;
}

export interface GainLike extends NodeLike {
  gain: ParamLike;
}

export interface OscillatorLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  start(time?: number): void;
  stop(time?: number): void;
  onended: (() => void) | null;
}

export interface FilterLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  Q: ParamLike;
}

export interface BufferLike {
  getChannelData(channel: number): Float32Array;
}

export interface BufferSourceLike extends NodeLike {
  buffer: BufferLike | null;
  start(time?: number): void;
  stop(time?: number): void;
  onended: (() => void) | null;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: NodeLike;
  resume(): Promise<void>;
  createGain(): GainLike;
  createOscillator(): OscillatorLike;
  createBiquadFilter(): FilterLike;
  createBuffer(channels: number, length: number, sampleRate: number): BufferLike;
  createBufferSource(): BufferSourceLike;
}

// Makes the audio context, or null if there is none. It may also throw.
export type AudioFactory = () => AudioContextLike | null;

// The browser's AudioContext, if the page has one.
export const browserAudio: AudioFactory = () => {
  const w = globalThis as unknown as { AudioContext?: new () => unknown; webkitAudioContext?: new () => unknown };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? (new Ctor() as AudioContextLike) : null;
};
