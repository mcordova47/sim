import { describe, expect, it } from "vitest";
import { MUSIC } from "../config";
import { parseTrack } from "../music/track";
import { FakeAudioContext } from "./fake-audio";
import { MusicPlayer } from "./music-player";
import { Synth } from "./synth";

// 120 bpm: a beat is half a second. Two beats long.
const TRACK = parseTrack("title: T\ntempo: 120\n[a square]\nC4:1 E4:1\n[b triangle]\nG3:2\n[d drums]\nK:1 R:1");

function setup(track = TRACK) {
  const ctx = new FakeAudioContext();
  const synth = new Synth(ctx, () => 0.5);
  const player = new MusicPlayer();
  player.play(track);
  return { ctx, synth, player };
}

const startTimes = (ctx: FakeAudioContext) => ctx.oscillators.map((o) => o.startedAt!).sort((a, b) => a - b);

describe("MusicPlayer", () => {
  it("does nothing without a synth, and starts once there is one", () => {
    const { ctx, synth, player } = setup();
    player.update(null);
    expect(ctx.started).toBe(0);
    player.update(synth);
    expect(ctx.started).toBeGreaterThan(0);
  });

  it("schedules only the notes inside the lookahead window", () => {
    const { ctx, synth, player } = setup();
    player.update(synth);
    // Window is 0.25 s: the first beat's notes (a, b and the kick) but not E4 at +0.5 s.
    const freqs = ctx.oscillators.map((o) => Math.round(o.frequency.calls[0].value));
    expect(freqs).toContain(262); // C4
    expect(freqs).toContain(196); // G3
    expect(freqs).not.toContain(330); // E4
    ctx.currentTime = 0.4;
    player.update(synth);
    expect(ctx.oscillators.map((o) => Math.round(o.frequency.calls[0].value))).toContain(330);
  });

  it("does not schedule a note twice", () => {
    const { ctx, synth, player } = setup();
    player.update(synth);
    const n = ctx.started;
    player.update(synth);
    expect(ctx.started).toBe(n);
  });

  it("stops each note a little before its length is up, so repeated notes stay apart", () => {
    const { ctx, synth, player } = setup();
    player.update(synth);
    const c4 = ctx.oscillators.find((o) => Math.round(o.frequency.calls[0].value) === 262)!;
    const end = c4.stoppedAt! - 0.02;
    expect(end - c4.startedAt!).toBeCloseTo(0.5 * MUSIC.legato, 6);
  });

  it("loops at the end of the track", () => {
    const { ctx, synth, player } = setup();
    for (let t = 0; t <= 2.2; t += 0.1) {
      ctx.currentTime = t;
      player.update(synth);
    }
    const c4 = ctx.oscillators.filter((o) => Math.round(o.frequency.calls[0].value) === 262).map((o) => o.startedAt!);
    expect(c4.length).toBeGreaterThanOrEqual(2);
    expect(c4[1] - c4[0]).toBeCloseTo(1, 6); // 2 beats at 120 bpm
  });

  it("plays drums as noise and tone hits, not at a pitch", () => {
    const { ctx, synth, player } = setup(parseTrack("title: T\n[d drums]\nK:1 S:1 H:1"));
    for (let t = 0; t < 2; t += 0.1) {
      ctx.currentTime = t;
      player.update(synth);
    }
    expect(ctx.sources.length).toBeGreaterThan(0); // snare and hat noise
    expect(ctx.oscillators.length).toBeGreaterThan(0); // kick sine
  });

  it("skips notes that are long past instead of playing them in a burst", () => {
    const { ctx, synth, player } = setup();
    player.update(synth);
    const before = ctx.started;
    ctx.currentTime = 1000; // the tab was in the background
    player.update(synth);
    const times = startTimes(ctx).slice(before);
    expect(times.every((t) => t >= 1000 - MUSIC.skipLate)).toBe(true);
    expect(ctx.started - before).toBeLessThan(10);
  });

  it("changes tracks and stops", () => {
    const { ctx, synth, player } = setup();
    player.update(synth);
    const n = ctx.started;
    player.stop();
    expect(player.track).toBeNull();
    ctx.currentTime = 1;
    player.update(synth);
    expect(ctx.started).toBe(n);
    player.play(TRACK);
    player.update(synth);
    expect(ctx.started).toBeGreaterThan(n);
  });

  it("stays quiet for a track with nothing to play", () => {
    const { ctx, synth, player } = setup();
    player.play({ ...TRACK, channels: [] });
    expect(() => player.update(synth)).not.toThrow();
    expect(ctx.started).toBe(0);
  });
});
