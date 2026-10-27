import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { SLEEP, SOUND } from "./config";
import { Game } from "./game";
import { RECORD_MENU, TRACKS } from "./music/records";
import { SLEEP_LULLABY, SYSTEM_TRACKS, SYSTEM_TRACK_FILES, loadSystemTracks } from "./music/system-tracks";
import { parseTrack } from "./music/track";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./sound/feature";
import { MusicPlayer } from "./sound/music-player";
import { Synth } from "./sound/synth";
import { sleepSceneAt, sleepTotal } from "./sleep";
import { SleepSound } from "./sound/sleep-sound";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";

// The sleep sequence's sound, stage 4 (issue 078, docs/sleep.md sections 6 and 15):
// the sleep bus, the bus ramps, the snore, the lullaby, a playing record ducked and
// brought back, mute, a game with no audio, and the saved text.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const RECORD = parseTrack("title: One\n[a square]\nC4:1 D4:1", "1.track", "one");
const MUSIC = SOUND.musicLevel;

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

function setup(kind: "sleep" | "nap", options: { record?: boolean; unlocked?: boolean; audio?: () => FakeAudioContext | null; muted?: boolean } = {}) {
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const storage = new FakeStorage();
  if (options.muted) storage.setItem(SOUND.storageKey, JSON.stringify({ v: 1, muted: true, track: null, payoutLeft: 0 }));
  const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: [kind] } }, { tasks: TASKS });
  const game = new Game({ ...level, facing: "right" }, { random: () => 0.5 });
  const factory = vi.fn(options.audio ?? (() => ctx));
  const feature = new SoundFeature(game, { audio: factory, storage, keys, random: () => 0.5, tracks: [RECORD], start: "main" });
  game.state.applyEffects([{ var: "energy", set: 20 }, { var: "clock", set: kind === "sleep" ? 22 : 13 }]);
  if (options.record) feature.setTrack(RECORD);
  // The key that starts the sleep is a key press, which is what unlocks audio.
  if (options.unlocked !== false) keys.press("KeyE");
  const step = (frames = 1, controls: Controls = NO_INPUT) => {
    for (let i = 0; i < frames; i++) {
      ctx.currentTime += dt;
      game.update(dt, controls);
    }
  };
  step(12);
  step(1, press);
  expect(game.interaction.busy).toBe(true);
  const at = (seconds: number) => step(Math.max(0, Math.round(seconds / dt) - elapsed()));
  let t0 = ctx.currentTime;
  const elapsed = () => Math.round((ctx.currentTime - t0) / dt);
  t0 = ctx.currentTime;
  const bus = (name: "music" | "sleep" | "effects") => feature.engine.busLevel(name);
  const snores = () => ctx.oscillators.filter((o) => o.type === "sawtooth").length;
  return { ctx, keys, storage, game, feature, step, at, bus, snores, factory };
}

describe("the sleep bus and rampBus (Synth)", () => {
  const make = () => {
    const ctx = new FakeAudioContext();
    return { ctx, synth: new Synth(ctx, () => 0.5) };
  };
  it("makes the sleep bus only when it is first used, silent, into the master", () => {
    const { ctx, synth } = make();
    expect(ctx.gains).toHaveLength(3); // master, effects, music: a game that never sleeps makes what it always did
    expect(synth.busLevel("sleep")).toBe(0);
    synth.rampBus("sleep", 0.5, 2);
    expect(ctx.gains).toHaveLength(4);
    expect(ctx.gains[3].gain.value).toBe(0);
    expect(ctx.gains[3].connections).toContain(ctx.gains[0]);
  });
  it("ramps in a straight line from where it is, replacing a ramp that is going", () => {
    const { ctx, synth } = make();
    synth.rampBus("music", 0.1, 2);
    const music = ctx.gains[2].gain;
    expect(music.calls.map((c) => c.type)).toEqual(["cancel", "set", "linear"]);
    expect(music.calls[1]).toEqual({ type: "set", value: MUSIC, time: 0 });
    expect(music.calls[2]).toEqual({ type: "linear", value: 0.1, time: 2 });
    ctx.currentTime = 1; // half way down
    expect(synth.busLevel("music")).toBeCloseTo((MUSIC + 0.1) / 2, 9);
    synth.rampBus("music", MUSIC, 1);
    expect(music.calls.slice(3).map((c) => c.type)).toEqual(["cancel", "set", "linear"]);
    expect(music.calls[4].value).toBeCloseTo((MUSIC + 0.1) / 2, 9); // starts where it was, not at the old target
    ctx.currentTime = 2;
    expect(synth.busLevel("music")).toBeCloseTo(MUSIC, 9);
  });
  it("a ramp of no length is a jump, and the master (mute) is never touched", () => {
    const { ctx, synth } = make();
    synth.muted = true;
    const master = ctx.gains[0].gain.calls.length;
    synth.rampBus("effects", 0.3, 0);
    expect(synth.busLevel("effects")).toBe(0.3);
    synth.rampBus("music", 0, 1);
    expect(ctx.gains[0].gain.calls).toHaveLength(master);
    expect(synth.muted).toBe(true);
  });
  it("a music player can play on another bus", () => {
    const { ctx, synth } = make();
    const player = new MusicPlayer("sleep");
    player.play(RECORD);
    player.update(synth);
    // The bus made for it is the fourth thing that goes into the master (after the effects and music).
    const sleep = ctx.gains.slice(3).find((g) => g.connections.includes(ctx.gains[0]))!;
    expect(sleep).toBeDefined();
    expect(ctx.gains.some((g) => g.connections.includes(sleep))).toBe(true);
    expect(ctx.gains.some((g) => g.connections.includes(ctx.gains[2]))).toBe(false);
  });
});

describe("the lullaby is a system track", () => {
  it("is in system/, parses, and is exactly ten seconds: four bars of three beats at 72 bpm", () => {
    expect(Object.keys(SYSTEM_TRACK_FILES)).toEqual(["./system/sleep-lullaby.track"]);
    const t = SLEEP_LULLABY!;
    expect(t.id).toBe("sleep-lullaby");
    expect(t.tempo).toBe(72);
    expect(t.beats).toBe(12);
    expect((t.beats * 60) / t.tempo).toBe(10);
    expect(t.channels.map((c) => c.wave).sort()).toEqual(["sine", "triangle"]);
    // One pass covers the whole sequence (the loop only repeats if it is made longer).
    expect((t.beats * 60) / t.tempo).toBeGreaterThanOrEqual(sleepTotal(SLEEP.sleep));
  });
  it("is not in the record player's menu, the list of records or what can be chosen", () => {
    expect(TRACKS.map((t) => t.id)).not.toContain("sleep-lullaby");
    expect(RECORD_MENU.choices.map((c) => c.label)).not.toContain(SLEEP_LULLABY!.title);
    expect(SYSTEM_TRACKS["sleep-lullaby"]).toBe(SLEEP_LULLABY);
  });
  it("a broken system track is reported and left out", () => {
    const errors: string[] = [];
    const tracks = loadSystemTracks({ "./system/a.track": "oops", "./system/b.track": "title: B\n[x sine]\nC4" }, (e) => errors.push(e.message));
    expect(Object.keys(tracks)).toEqual(["b"]);
    expect(errors).toHaveLength(1);
  });
});

describe("a night's sleep with a record playing", () => {
  it("ducks the record to 12 percent, brings it back, and never stops it", () => {
    const s = setup("sleep", { record: true });
    const savedBefore = [...s.storage.data.entries()];
    const track = s.feature.engine.music.track;
    expect(track).toBe(RECORD);
    expect(s.bus("music")).toBe(MUSIC);
    s.at(0.5);
    expect(s.bus("music")).toBeCloseTo(MUSIC * (1 - 0.5 * (1 - SLEEP.sleep.duckTo)), 2); // half way down
    s.at(1.2);
    expect(s.bus("music")).toBeCloseTo(MUSIC * SLEEP.sleep.duckTo, 6);
    s.at(6.9);
    expect(s.bus("music")).toBeCloseTo(MUSIC * 0.12, 6);
    s.at(7.75); // half way up (the return takes 1.5 s from the start of the wake)
    expect(s.bus("music")).toBeGreaterThan(MUSIC * 0.12 + 0.05);
    expect(s.bus("music")).toBeLessThan(MUSIC - 0.05);
    s.at(8.6);
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    // The same player, the same track, the same saved choice, all the way.
    expect(s.feature.engine.music.track).toBe(track);
    expect(s.feature.track).toBe(RECORD);
    s.step(120);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.feature.engine.music.track).toBe(RECORD);
    expect([...s.storage.data.entries()]).toEqual(savedBefore);
  });

  it("with Escape at any moment the record is back within the restore time and nothing is saved", () => {
    for (const t of [0, 0.3, 1, 2, 4, 7, 7.5, 8, 8.9]) {
      const s = setup("sleep", { record: true });
      const savedBefore = [...s.storage.data.entries()];
      s.at(t);
      s.step(1, esc);
      expect(s.game.interaction.busy).toBe(false);
      s.step(Math.ceil((SLEEP.sleep.escapeRestore + 0.1) / dt));
      expect(s.bus("music"), `Escape at ${t}`).toBeCloseTo(MUSIC, 6);
      expect(s.bus("sleep"), `Escape at ${t}`).toBeCloseTo(0, 6);
      expect(s.feature.engine.sleep.state).toBe("idle");
      expect(s.feature.engine.sleep.player.track).toBeNull();
      expect(s.feature.engine.music.track, `Escape at ${t}`).toBe(RECORD);
      expect([...s.storage.data.entries()]).toEqual(savedBefore);
    }
  });

  it("the nap does not duck the record (nobody sleeps through a nap)", () => {
    const s = setup("nap", { record: true });
    s.step(60 * 5);
    expect(s.bus("music")).toBe(MUSIC);
    expect(s.ctx.gains[2].gain.calls).toEqual([]); // not so much as a ramp
  });
});

describe("the lullaby and the snore", () => {
  it("fades the lullaby in from 0.3 s, holds it, fades it out over the last two seconds, and stops it", () => {
    const s = setup("sleep");
    expect(s.bus("sleep")).toBe(0);
    expect(s.feature.engine.sleep.player.track).toBe(SLEEP_LULLABY);
    s.at(0.25);
    expect(s.bus("sleep")).toBe(0);
    s.at(1.05); // half way up the 1.5 s fade that began at 0.3 s
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain / 2, 1);
    s.at(2);
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain, 6);
    s.at(6.9);
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain, 6);
    s.at(8);
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain / 2, 1);
    s.at(8.9);
    expect(s.bus("sleep")).toBeLessThan(0.05);
    s.step(60);
    expect(s.bus("sleep")).toBe(0);
    expect(s.feature.engine.sleep.state).toBe("idle");
    expect(s.feature.engine.sleep.player.track).toBeNull();
    // The notes were played on the sleep bus (sine and triangle), not the record's.
    const sleepBus = s.ctx.gains.slice(3).find((g) => g.gain.calls.some((c) => c.type === "cancel"))!;
    const voices = s.ctx.gains.filter((g) => g.connections.includes(sleepBus));
    expect(voices.length).toBeGreaterThan(5);
    expect(s.ctx.gains.filter((g) => g.connections.includes(s.ctx.gains[2]))).toHaveLength(0);
  });

  it("snores once on each out-breath while asleep, and not before or after", () => {
    const s = setup("sleep");
    s.at(2.9);
    expect(s.snores()).toBe(0);
    s.at(3.4); // the first out-breath is at 2 + 0.4 * 3 = 3.2 s
    expect(s.snores()).toBe(1);
    s.at(6);
    expect(s.snores()).toBe(1);
    s.at(6.4); // the second, at 6.2 s
    expect(s.snores()).toBe(2);
    s.at(8.9);
    expect(s.snores()).toBe(2);
  });

  it("the nap has no lullaby and no snore", () => {
    const s = setup("nap");
    s.step(60 * 4);
    expect(s.snores()).toBe(0);
    expect(s.feature.engine.sleep.player.track).toBeNull();
    // Nothing ever ramped: no bus was touched.
    expect(s.bus("sleep")).toBe(0);
    expect(s.ctx.gains.some((g) => g.gain.calls.some((c) => c.type === "cancel"))).toBe(false);
  });
});

describe("mute", () => {
  it("a muted game stays muted all the way through: nothing changes the mute, the master stays 0", () => {
    const s = setup("sleep", { muted: true });
    expect(s.feature.muted).toBe(true);
    const master = s.ctx.gains[0].gain;
    s.step(60 * 10);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.feature.muted).toBe(true);
    expect(master.calls.at(-1)).toMatchObject({ value: 0 });
    expect(master.calls.every((c) => c.value === 0)).toBe(true);
    expect(s.snores()).toBe(0); // a muted game makes no snore voices at all
    expect(s.feature.indicatorText()).toBe("MUTE");
  });

  it("muting in the middle, and unmuting, never changes what the sequence does to the buses", () => {
    const s = setup("sleep", { record: true });
    const master = s.ctx.gains[0].gain;
    s.at(3);
    s.keys.press("KeyM");
    expect(s.feature.muted).toBe(true);
    expect(master.calls.at(-1)).toMatchObject({ value: 0 });
    s.at(5);
    // The fades go on in silence, on the audio clock: the buses are where they should be.
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain, 6);
    expect(s.bus("music")).toBeCloseTo(MUSIC * 0.12, 6);
    s.at(8);
    s.keys.press("KeyM"); // unmute half way through the wake
    expect(s.feature.muted).toBe(false);
    expect(master.calls.at(-1)).toMatchObject({ value: SOUND.master });
    expect(s.bus("sleep")).toBeCloseTo(SLEEP.sleep.lullabyGain / 2, 1); // the right point of the fade
    s.step(120);
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.bus("sleep")).toBe(0);
  });

  it("the sequence never writes the saved sound settings", () => {
    const s = setup("sleep", { record: true });
    const before = JSON.stringify([...s.storage.data.entries()]);
    s.step(60 * 10);
    expect(JSON.stringify([...s.storage.data.entries()])).toBe(before);
    const e = setup("sleep", { record: true });
    const eBefore = JSON.stringify([...e.storage.data.entries()]);
    e.at(4);
    e.step(1, esc);
    e.step(60);
    expect(JSON.stringify([...e.storage.data.entries()])).toBe(eBefore);
    expect(eBefore).not.toContain("duck");
  });
});

describe("a game with no audio", () => {
  it("before the first key press: the sequence runs in silence and finishes with the right effects", () => {
    const s = setup("sleep", { unlocked: false });
    expect(s.factory).not.toHaveBeenCalled();
    s.step(60 * 10);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.game.state.get("energy")).toBeGreaterThan(99);
    expect(s.game.state.get("clock")).toBeCloseTo(6.5, 1);
    expect(s.ctx.gains).toHaveLength(0);
    expect(s.feature.engine.sleep.state).toBe("idle");
  });

  it("audio unavailable: no throw, no sound, a normal sequence", () => {
    const s = setup("sleep", { audio: () => null });
    s.step(60 * 10);
    expect(s.feature.engine.unavailable).toBe(true);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.game.state.get("energy")).toBeGreaterThan(99);
    expect(s.ctx.gains).toHaveLength(0);
  });

  it("audio that starts in the middle of a sequence stays silent to its end (the lullaby starts only if there was a synth at the start)", () => {
    const s = setup("sleep", { unlocked: false });
    s.at(3);
    s.keys.press("KeyA"); // a key: audio starts now
    expect(s.feature.engine.ready).toBe(true);
    s.at(8.9);
    expect(s.snores()).toBe(0);
    expect(s.ctx.gains).toHaveLength(3); // never made the sleep bus
    expect(s.feature.engine.sleep.state).toBe("idle");
  });

  it("the sleep sound does nothing at all with no synth", () => {
    const sound = new SleepSound();
    const play = vi.fn();
    const scene = sleepSceneAt("sleep", 4, 8.5);
    sound.update(scene, null, play);
    sound.update(scene, null, play);
    sound.update(null, null, play);
    expect(play).not.toHaveBeenCalled();
    expect(sound.state).toBe("idle");
  });
});
