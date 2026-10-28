import type {
  AudioContextLike,
  BufferLike,
  BufferSourceLike,
  CompressorLike,
  FilterLike,
  GainLike,
  OscillatorLike,
  ParamLike,
} from "./audio-types";

// A stand-in for the browser's AudioContext that records what it was asked
// to make, so tests can check the sound without a browser or a speaker.
export class FakeParam implements ParamLike {
  calls: { type: "set" | "linear" | "exp" | "cancel"; value: number; time: number }[] = [];
  constructor(public value = 0) {}
  setValueAtTime(value: number, time: number) {
    this.calls.push({ type: "set", value, time });
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.calls.push({ type: "linear", value, time });
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.calls.push({ type: "exp", value, time });
  }
  cancelScheduledValues(time: number) {
    this.calls.push({ type: "cancel", value: 0, time });
  }
}

export class FakeNode {
  connections: unknown[] = [];
  disconnected = false;
  connect(to: unknown) {
    this.connections.push(to);
  }
  disconnect() {
    this.disconnected = true;
  }
}

export class FakeGain extends FakeNode implements GainLike {
  gain = new FakeParam(1);
}

export class FakeOscillator extends FakeNode implements OscillatorLike {
  type = "sine";
  frequency = new FakeParam(440);
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(time = 0) {
    this.startedAt = time;
  }
  stop(time = 0) {
    this.stoppedAt = time;
  }
}

export class FakeFilter extends FakeNode implements FilterLike {
  type = "lowpass";
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
}

export class FakeCompressor extends FakeNode implements CompressorLike {
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);
}

export class FakeBufferSource extends FakeNode implements BufferSourceLike {
  buffer: BufferLike | null = null;
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(time = 0) {
    this.startedAt = time;
  }
  stop(time = 0) {
    this.stoppedAt = time;
  }
}

export class FakeAudioContext implements AudioContextLike {
  currentTime = 0;
  sampleRate = 8000;
  state = "suspended";
  resumed = 0;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  oscillators: FakeOscillator[] = [];
  filters: FakeFilter[] = [];
  compressors: FakeCompressor[] = [];
  sources: FakeBufferSource[] = [];
  buffers = 0;

  resume() {
    this.resumed++;
    this.state = "running";
    return Promise.resolve();
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createOscillator() {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o;
  }
  createBiquadFilter() {
    const f = new FakeFilter();
    this.filters.push(f);
    return f;
  }
  createDynamicsCompressor() {
    const c = new FakeCompressor();
    this.compressors.push(c);
    return c;
  }
  createBuffer(_channels: number, length: number): BufferLike {
    this.buffers++;
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const s = new FakeBufferSource();
    this.sources.push(s);
    return s;
  }

  // Everything that was started has been told to stop at or after this time.
  get started(): number {
    return this.oscillators.length + this.sources.length;
  }
  // Finishes every sound (as the browser does once it ends), so cleanup runs.
  endAll(): void {
    for (const n of [...this.oscillators, ...this.sources]) n.onended?.();
  }
}
