import { describe, expect, it } from "vitest";
import { SOUND, type EffectDef } from "../config";
import { FakeAudioContext } from "./fake-audio";
import { Synth } from "./synth";

const tone = (length = 0.1, extra = {}): EffectDef => ({ voices: [{ wave: "square", freq: 440, length, gain: 0.2, ...extra }] });

function setup() {
  const ctx = new FakeAudioContext();
  const synth = new Synth(ctx, () => 0.5);
  return { ctx, synth };
}

describe("Synth", () => {
  it("routes everything through a master gain at the configured volume", () => {
    const { ctx } = setup();
    // master, effects bus and music bus
    expect(ctx.gains).toHaveLength(3);
    expect(ctx.gains[0].gain.value).toBe(SOUND.master);
    expect(ctx.gains[0].connections).toContain(ctx.destination);
  });

  it("plays a tone as an oscillator with an envelope, started now and stopped after it ends", () => {
    const { ctx, synth } = setup();
    ctx.currentTime = 2;
    expect(synth.play(tone(0.1))).toBe(true);
    const [osc] = ctx.oscillators;
    expect(osc.type).toBe("square");
    expect(osc.startedAt).toBe(2);
    expect(osc.stoppedAt).toBeGreaterThanOrEqual(2.1);
    expect(osc.frequency.calls[0]).toEqual({ type: "set", value: 440, time: 2 });
    const env = ctx.gains[3];
    expect(env.gain.calls.at(-1)!.time).toBeCloseTo(2.1, 9);
    expect(Math.max(...env.gain.calls.map((c) => c.value))).toBeCloseTo(0.2, 9);
    // The envelope never asks for exactly 0 (an exponential ramp can't).
    expect(env.gain.calls.every((c) => c.value > 0)).toBe(true);
  });

  it("applies pitch and gain multipliers", () => {
    const { ctx, synth } = setup();
    synth.play(tone(0.1), { pitch: 2, gain: 0.5 });
    expect(ctx.oscillators[0].frequency.calls[0].value).toBe(880);
    expect(Math.max(...ctx.gains[3].gain.calls.map((c) => c.value))).toBeCloseTo(0.1, 9);
  });

  it("glides to an end frequency", () => {
    const { ctx, synth } = setup();
    synth.play(tone(0.2, { freq: 300, endFreq: 150 }), { pitch: 2 });
    expect(ctx.oscillators[0].frequency.calls.at(-1)).toMatchObject({ type: "exp", value: 300, time: 0.2 });
  });

  it("delays a later voice of an effect", () => {
    const { ctx, synth } = setup();
    synth.play({ voices: [{ wave: "sine", freq: 1, length: 0.1, gain: 1 }, { wave: "sine", freq: 2, delay: 0.3, length: 0.1, gain: 1 }] }, {}, 1);
    expect(ctx.oscillators.map((o) => o.startedAt)).toEqual([1, 1.3]);
  });

  it("makes noise through a filter, sharing one buffer", () => {
    const { ctx, synth } = setup();
    const def: EffectDef = { voices: [{ noise: "bandpass", freq: 1000, q: 2, length: 0.05, gain: 0.2 }] };
    synth.play(def);
    synth.play(def, { pitch: 1.5 });
    expect(ctx.buffers).toBe(1);
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.filters[0]).toMatchObject({ type: "bandpass" });
    expect(ctx.filters[0].frequency.value).toBe(1000);
    expect(ctx.filters[1].frequency.value).toBe(1500);
    expect(ctx.filters[0].Q.value).toBe(2);
    expect(ctx.sources[0].startedAt).toBe(0);
    expect(ctx.sources[0].stoppedAt).toBeGreaterThanOrEqual(0.05);
    expect(ctx.sources[0].connections).toContain(ctx.filters[0]);
  });

  it("disconnects a voice when it ends", () => {
    const { ctx, synth } = setup();
    synth.play(tone());
    ctx.endAll();
    expect(ctx.oscillators[0].disconnected).toBe(true);
    expect(ctx.gains[3].disconnected).toBe(true);
  });

  it("caps simultaneous voices and drops the effect that would not fit, whole", () => {
    const { ctx, synth } = setup();
    for (let i = 0; i < SOUND.maxVoices; i++) expect(synth.play(tone(1))).toBe(true);
    expect(synth.voices).toBe(SOUND.maxVoices);
    expect(synth.play(tone(1))).toBe(false);
    const three: EffectDef = { voices: [tone().voices[0], tone().voices[0], tone().voices[0]] };
    const before = ctx.oscillators.length;
    expect(synth.play(three)).toBe(false);
    expect(ctx.oscillators.length).toBe(before);
  });

  it("frees voices as time passes", () => {
    const { ctx, synth } = setup();
    for (let i = 0; i < SOUND.maxVoices; i++) synth.play(tone(0.1));
    expect(synth.play(tone())).toBe(false);
    ctx.currentTime = 1;
    expect(synth.voices).toBe(0);
    expect(synth.play(tone())).toBe(true);
  });

  it("drops low-priority effects first, leaving room for chimes", () => {
    const { synth } = setup();
    const low: EffectDef = { priority: "low", ...tone(1) };
    let played = 0;
    while (synth.play(low)) played++;
    expect(played).toBe(SOUND.maxVoices - SOUND.lowReserve);
    expect(synth.play(tone(1))).toBe(true);
  });

  it("does not count music voices against the cap", () => {
    const { ctx, synth } = setup();
    for (let i = 0; i < 50; i++) synth.voice({ wave: "sine", freq: 220, length: 1, gain: 0.1 }, 0, {}, "music");
    expect(ctx.oscillators).toHaveLength(50);
    expect(synth.play(tone())).toBe(true);
  });

  it("mutes by setting the master gain to zero, and restores it", () => {
    const { ctx, synth } = setup();
    ctx.currentTime = 3;
    synth.muted = true;
    expect(synth.muted).toBe(true);
    expect(ctx.gains[0].gain.calls.at(-1)).toEqual({ type: "set", value: 0, time: 3 });
    synth.muted = false;
    expect(ctx.gains[0].gain.calls.at(-1)).toEqual({ type: "set", value: SOUND.master, time: 3 });
  });
});
