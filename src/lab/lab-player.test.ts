import { describe, expect, it } from "vitest";
import { parseTrack } from "../game/music/track";
import { FakeAudioContext } from "../game/sound/fake-audio";
import { Synth } from "../game/sound/synth";
import { LabMusicPlayer } from "./lab-audio";
import { LabPlayer } from "./lab-player";

// 120 bpm: a beat is 0.5 s. The intro plays C (262 Hz) for 2 beats (1 s); the loop plays G (392 Hz) for 2 beats.
const INTRO = parseTrack("title: I\ntempo: 120\n[a square]\nC4:2");
const LOOP = parseTrack("title: L\ntempo: 120\n[a square]\nG4:2");
const LOOP2 = parseTrack("title: L2\ntempo: 120\n[a square]\nE5:2");

function setup(ready = true) {
  const ctx = new FakeAudioContext();
  const synth = new Synth(ctx, () => 0.5);
  const music = new LabMusicPlayer();
  const lab = new LabPlayer(music, () => ready, () => ctx.currentTime);
  const run = (to: number) => {
    for (let t = ctx.currentTime; t <= to; t += 0.05) {
      ctx.currentTime = t;
      music.update(synth);
    }
  };
  const heard = () => ctx.oscillators.map((o) => ({ hz: Math.round(o.frequency.calls[0].value), at: o.startedAt! })).sort((a, b) => a.at - b.at);
  return { ctx, music, lab, run, heard };
}

describe("LabPlayer", () => {
  it("plays the intro once and then the loop, over and over", () => {
    const { lab, run, heard } = setup();
    expect(lab.start(INTRO, LOOP)).toBe(true);
    run(5);
    const hz = heard().map((h) => h.hz);
    expect(hz[0]).toBe(262);
    expect(hz.slice(1).every((h) => h === 392)).toBe(true);
    expect(hz.filter((h) => h === 262)).toHaveLength(1);
    expect(hz.filter((h) => h === 392).length).toBeGreaterThanOrEqual(3);
    // The loop starts exactly when the intro ends, and repeats every 1 s.
    const g = heard().filter((h) => h.hz === 392);
    expect(g[0].at - heard()[0].at).toBeCloseTo(1, 6);
    expect(g[1].at - g[0].at).toBeCloseTo(1, 6);
  });

  it("knows whether it is in the intro", () => {
    const { lab, run } = setup();
    lab.start(INTRO, LOOP);
    expect(lab.inIntro).toBe(true);
    run(1.5);
    expect(lab.inIntro).toBe(false);
  });

  it("plays only the loop with no intro, and only the intro when given as the loop", () => {
    const a = setup();
    a.lab.start(null, LOOP);
    a.run(2.5);
    expect(a.heard().every((h) => h.hz === 392)).toBe(true);
    const b = setup();
    b.lab.start(null, INTRO);
    b.run(2.5);
    expect(b.heard().every((h) => h.hz === 262)).toBe(true);
    expect(b.heard().length).toBeGreaterThanOrEqual(2);
  });

  it("does nothing, and does not pretend to play, before there is audio", () => {
    const { lab, music } = setup(false);
    expect(lab.start(INTRO, LOOP)).toBe(false);
    expect(lab.playing).toBe(false);
    expect(music.track).toBeNull();
  });

  it("changes the loop at the next loop end while the loop plays, without a restart", () => {
    const { lab, run, heard } = setup();
    lab.start(INTRO, LOOP);
    run(2.2); // intro 0 to 1 s, first loop 1 to 2 s, second loop started
    lab.update(INTRO, LOOP2);
    run(5);
    const hz = heard().map((h) => h.hz);
    expect(hz.filter((h) => h === 262)).toHaveLength(1); // the intro did not replay
    expect(hz).toContain(659);
  });

  it("starts again from the intro when the intro is edited during the intro", () => {
    const { lab, run, heard } = setup();
    lab.start(INTRO, LOOP);
    run(0.5);
    const newIntro = parseTrack("title: I\ntempo: 120\n[a square]\nD4:2");
    lab.update(newIntro, LOOP);
    run(3);
    const hz = heard().map((h) => h.hz);
    expect(hz).toContain(294); // D4
    expect(hz.filter((h) => h === 392).length).toBeGreaterThanOrEqual(1);
  });

  it("stops", () => {
    const { lab, music, run, ctx } = setup();
    lab.start(INTRO, LOOP);
    run(0.2);
    lab.stop();
    const n = ctx.started;
    run(3);
    expect(ctx.started).toBe(n);
    expect(lab.playing).toBe(false);
    expect(music.track).toBeNull();
  });

  it("ignores an update when stopped", () => {
    const { lab, music } = setup();
    lab.update(INTRO, LOOP);
    expect(music.track).toBeNull();
  });
});
