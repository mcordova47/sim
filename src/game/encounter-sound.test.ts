import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { ENCOUNTERS, SOUND } from "./config";
import { ADS } from "./encounter-ads";
import { Game } from "./game";
import { RECORD_MENU, TRACKS } from "./music/records";
import { ENCOUNTER_BATTLE, SYSTEM_TRACK_FILES, SYSTEM_TRACKS } from "./music/system-tracks";
import { parseTrack } from "./music/track";
import { EncounterSound } from "./sound/encounter-sound";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./sound/feature";
import { Synth } from "./sound/synth";

// The encounter's sound, issue 091a (docs/encounter-music-design.md): the encounter bus, the placeholder
// track, a playing record turned down and brought back, every way out, mute and no audio.
// Not checked here, because nothing here can listen: how it sounds.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const RECORD = parseTrack("title: One\n[a square]\nC4:1 D4:1", "1.track", "one");
const MUSIC = SOUND.musicLevel;
const M = ENCOUNTERS.music;
const rooms = APARTMENT.rooms;
const LOOP_SECONDS = (ENCOUNTER_BATTLE!.beats * 60) / ENCOUNTER_BATTLE!.tempo;

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

interface Options {
  record?: boolean;
  unlocked?: boolean;
  audio?: () => FakeAudioContext | null;
  muted?: boolean;
  reduced?: boolean;
  random?: number;
}

function setup(o: Options = {}) {
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const storage = new FakeStorage();
  if (o.muted) storage.setItem(SOUND.storageKey, JSON.stringify({ v: 1, muted: true, track: null, payoutLeft: 0 }));
  const game = new Game(rooms.main, { rooms, random: () => o.random ?? 0.99, reducedMotion: () => o.reduced === true });
  const factory = vi.fn(o.audio ?? (() => ctx));
  const feature = new SoundFeature(game, { audio: factory, storage, keys, random: () => 0.5, tracks: [RECORD], start: "main" });
  if (o.record) feature.setTrack(RECORD);
  if (o.unlocked !== false) keys.press("KeyE");
  const step = (frames = 1, controls: Controls = NO_INPUT) => {
    for (let i = 0; i < frames; i++) {
      ctx.currentTime += dt;
      game.update(dt, controls);
    }
  };
  step(2);
  expect(game.startEncounter(ADS[0])).toBe(true);
  step(1); // the scene is first seen on the next frame
  const bus = (name: "music" | "encounter" | "effects") => feature.engine.busLevel(name);
  const sound = feature.engine.encounter;
  // Every gain node the encounter bus made is the one a bus ramp touched with a "cancel".
  return { ctx, keys, storage, game, feature, step, bus, sound, factory };
}

type S = ReturnType<typeof setup>;
const frameOf = (s: S) => s.game.encounterScene?.frame ?? -1;
// Runs the entrance to its end and the first dialog.
const toOpen = (s: S) => {
  for (let i = 0; i < 120 && !s.game.dialogOpen; i++) s.step();
  expect(s.game.dialogOpen).toBe(true);
};
// Picks Ignore (the menu's first choice) so the closing line comes up.
const toResult = (s: S) => {
  toOpen(s);
  s.step(1, press);
  expect(s.game.encounterScene?.phase).toBe("result");
};
// Presses E until the closing line is closed and the exit wipe begins (the first press may only finish the text).
const closeLine = (s: S) => {
  for (let i = 0; i < 20 && s.game.encounterScene?.phase === "result"; i++) s.step(1, i % 2 === 0 ? press : NO_INPUT);
  expect(s.game.encounterScene?.phase).toBe("leaving");
};
const seconds = (n: number) => Math.round(n / dt);

describe("the placeholder system track", () => {
  it("is in system/ with the lullaby, is not a record, and parses", () => {
    expect(Object.keys(SYSTEM_TRACK_FILES).sort()).toEqual(["./system/encounter-battle.track", "./system/sleep-lullaby.track"]);
    expect(ENCOUNTER_BATTLE).not.toBeNull();
    expect(SYSTEM_TRACKS["encounter-battle"]).toBe(ENCOUNTER_BATTLE);
    expect(TRACKS.map((t) => t.id)).not.toContain("encounter-battle");
    expect(RECORD_MENU.choices.map((c) => c.label)).not.toContain(ENCOUNTER_BATTLE!.title);
  });
  it("loops cleanly: no note runs past the end, every channel is as long as the loop, and it starts on the downbeat", () => {
    const t = ENCOUNTER_BATTLE!;
    expect(Math.max(...t.channels.flatMap((c) => c.notes.map((n) => n.start + n.length)))).toBe(t.beats);
    for (const c of t.channels) {
      for (const n of c.notes) expect(n.start + n.length, c.name).toBeLessThanOrEqual(t.beats + 1e-9);
    }
    expect(Math.min(...t.channels.flatMap(c => c.notes.map((n) => n.start)))).toBe(0);
  });
  it("one pass is about eight seconds, so four passes are about half a minute", () => {
    expect(LOOP_SECONDS).toBeGreaterThanOrEqual(6);
    expect(LOOP_SECONDS * M.maxLoops).toBeGreaterThanOrEqual(24);
    expect(LOOP_SECONDS * M.maxLoops).toBeLessThanOrEqual(40);
  });
});

describe("the start", () => {
  it("startFrame is the frame of the entrance's hit chord, so editing the entrance cannot drift them apart", () => {
    const hit = ENCOUNTERS.entrance.sounds.find(([, cue]) => cue === "encounter-hit")!;
    expect(M.startFrame).toBe(hit[0]);
  });

  it("starts on frame 32 and not before; the bus is silent and nothing of the loop is made until then", () => {
    const s = setup();
    expect(s.sound.state).toBe("waiting");
    const oscillatorsBefore = s.ctx.oscillators.length;
    let started = -1;
    for (let i = 0; i < 40; i++) {
      s.step();
      if (started < 0 && s.sound.loop.track) started = frameOf(s);
      if (frameOf(s) < M.startFrame) {
        expect(s.sound.loop.track, `frame ${frameOf(s)}`).toBeNull();
        expect(s.bus("encounter")).toBe(0);
      }
    }
    expect(started).toBe(M.startFrame);
    expect(s.sound.state).toBe("playing");
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
    expect(s.ctx.oscillators.length).toBeGreaterThan(oscillatorsBefore);
  });

  it("an E skip starts it when the card opens, at once, not at frame 32", () => {
    const s = setup();
    s.step(ENCOUNTERS.entrance.skipAfter - 1);
    expect(s.sound.loop.track).toBeNull();
    s.step(1, press);
    expect(s.game.encounterScene?.phase).toBe("open");
    expect(frameOf(s)).toBeLessThan(M.startFrame);
    expect(s.sound.state).toBe("playing");
    expect(s.sound.loop.track).toBe(ENCOUNTER_BATTLE);
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
  });

  it("a skip then Escape, and Escape before the hit, never start the loop at all", () => {
    const s = setup();
    s.step(10);
    s.step(1, esc);
    s.step(seconds(M.duckUp + 0.5));
    expect(s.sound.loop.track).toBeNull();
    expect(s.ctx.oscillators.filter((o) => o.type === "square" && o.frequency.value > 0).length).toBeGreaterThanOrEqual(0);
    expect(s.sound.state).toBe("idle");
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.bus("encounter")).toBe(0);
  });
});

describe("the player's record", () => {
  it("is turned down to silence over duckDown from the first frame, keeps its place, and comes back after", () => {
    const s = setup({ record: true });
    const saved = [...s.storage.data.entries()];
    expect(s.bus("music")).toBe(MUSIC);
    s.step(seconds(M.duckDown / 2));
    expect(s.bus("music")).toBeLessThan(MUSIC - 0.05);
    expect(s.bus("music")).toBeGreaterThan(0.05);
    s.step(seconds(M.duckDown));
    expect(s.bus("music")).toBeCloseTo(M.duckTo * MUSIC, 6);
    expect(s.bus("music")).toBe(0);
    const track = s.feature.engine.music.track;
    expect(track).toBe(RECORD);
    toOpen(s);
    s.step(60);
    expect(s.bus("music")).toBe(0);
    expect(s.feature.engine.music.track).toBe(RECORD); // never stopped, never swapped
    s.step(1, press); // Ignore: the closing line
    closeLine(s);
    s.step(seconds(M.duckUp / 2));
    expect(s.bus("music")).toBeGreaterThan(0.05);
    expect(s.bus("music")).toBeLessThan(MUSIC - 0.05);
    s.step(seconds(M.duckUp));
    expect(s.game.interaction.busy).toBe(false);
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.feature.engine.music.track).toBe(RECORD);
    expect(s.feature.track).toBe(RECORD);
    expect([...s.storage.data.entries()]).toEqual(saved);
  });

  it("the record player's loop keeps being scheduled while it is silent (so it is still in time)", () => {
    const s = setup({ record: true });
    toOpen(s);
    const before = s.ctx.oscillators.length;
    s.step(60);
    // Both the record (square, short) and the loop schedule notes during this second.
    expect(s.ctx.oscillators.length).toBeGreaterThan(before);
  });

  it("with no record playing it still starts the loop and nothing breaks", () => {
    const s = setup();
    toOpen(s);
    expect(s.sound.state).toBe("playing");
    expect(s.feature.engine.music.track).toBeNull();
  });
});

describe("every way out leaves the buses at rest", () => {
  const rest = (s: S) => {
    s.step(seconds(M.duckUp + M.loopFadeOut + 1));
    expect(s.game.interaction.busy).toBe(false);
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.bus("encounter")).toBeCloseTo(0, 6);
    expect(s.bus("effects")).toBe(1);
    expect(s.sound.state).toBe("idle");
    expect(s.sound.loop.track).toBeNull();
  };

  it("Escape on every frame of the entrance, and then every fifth frame of the open card", () => {
    for (let f = 0; f <= 52; f++) {
      const s = setup({ record: true });
      const saved = [...s.storage.data.entries()];
      s.step(f);
      if (!s.game.interaction.busy) continue;
      s.step(1, esc);
      expect(s.game.interaction.busy, `Escape after ${f}`).toBe(false);
      // The loop is out within escapeFade.
      s.step(seconds(M.escapeFade + 0.05));
      expect(s.bus("encounter"), `Escape after ${f}`).toBeCloseTo(0, 6);
      rest(s);
      expect(s.feature.engine.music.track).toBe(RECORD);
      expect([...s.storage.data.entries()], `Escape after ${f}`).toEqual(saved);
    }
    for (let extra = 0; extra < 300; extra += 5) {
      const s = setup({ record: true });
      toOpen(s);
      s.step(extra);
      s.step(1, esc);
      rest(s);
    }
  });

  it("Escape on the closing line and during the exit", () => {
    for (const extra of [0, 3, 8, 11]) {
      const s = setup({ record: true });
      toResult(s);
      if (extra > 0) {
        s.step(1, press);
        s.step(extra - 1);
      }
      s.step(1, esc);
      rest(s);
    }
  });

  it("a normal finish (Ignore, then the line) ends at rest, with the loop gone in resultFade", () => {
    const s = setup({ record: true });
    toResult(s);
    const outcome = s.game.encounterScene!.outcome;
    expect(outcome).toBe("ignore");
    expect(s.sound.state).toBe("fading");
    s.step(seconds(M.resultFade + 0.1));
    expect(s.bus("encounter")).toBeCloseTo(0, 6);
    expect(s.sound.loop.track).toBeNull();
    closeLine(s);
    rest(s);
  });

  it("the encounter can play twice in a row", () => {
    const s = setup({ record: true });
    toResult(s);
    closeLine(s);
    rest(s);
    expect(s.game.startEncounter(ADS[1])).toBe(true);
    s.step(M.startFrame + 2);
    expect(s.sound.state).toBe("playing");
    expect(s.bus("music")).toBeLessThan(MUSIC);
    s.step(1, esc);
    rest(s);
  });
});

describe("four passes, then a fade", () => {
  it("holds the level for four passes, fades over loopFadeOut, then stops and leaves the card in quiet", () => {
    const s = setup({ record: true });
    toOpen(s);
    const start = s.ctx.currentTime;
    const at = (t: number) => s.step(Math.max(0, Math.round((start + t - s.ctx.currentTime) / dt)));
    at(LOOP_SECONDS * M.maxLoops - 0.5);
    expect(s.sound.state).toBe("playing");
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
    at(LOOP_SECONDS * M.maxLoops + M.loopFadeOut / 2);
    expect(s.sound.state).toBe("fading");
    expect(s.bus("encounter")).toBeGreaterThan(0.02);
    expect(s.bus("encounter")).toBeLessThan(M.gain - 0.02);
    at(LOOP_SECONDS * M.maxLoops + M.loopFadeOut + 0.5);
    expect(s.bus("encounter")).toBe(0);
    expect(s.sound.state).toBe("idle");
    expect(s.sound.loop.track).toBeNull();
    // The card is still up and the record is still silent: the player decides when it ends.
    expect(s.game.dialogOpen).toBe(true);
    expect(s.bus("music")).toBe(0);
    s.step(1, press);
    closeLine(s);
    s.step(seconds(M.duckUp + 0.5));
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
  });
});

describe("mute, reduced motion and no audio", () => {
  it("a muted game stays muted all the way, and its buses follow the same schedule", () => {
    const s = setup({ muted: true, record: true });
    const master = s.ctx.gains[0].gain;
    toOpen(s);
    expect(s.sound.state).toBe("playing");
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
    expect(s.bus("music")).toBe(0);
    s.step(1, press);
    closeLine(s);
    s.step(seconds(M.duckUp + 0.5));
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.feature.muted).toBe(true);
    expect(master.calls.every((c) => c.value === 0)).toBe(true);
  });

  it("muting and unmuting in the middle changes nothing about the buses", () => {
    const s = setup({ record: true });
    toOpen(s);
    s.keys.press("KeyM");
    s.step(120);
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
    s.keys.press("KeyM");
    expect(s.bus("encounter")).toBeCloseTo(M.gain, 6);
    expect(s.sound.state).toBe("playing");
  });

  it("reduced motion: no music and the record is not touched", () => {
    const s = setup({ reduced: true, record: true });
    expect(s.game.encounterScene?.reduced).toBe(true);
    toOpen(s);
    s.step(120);
    expect(s.sound.state).toBe("idle");
    expect(s.sound.loop.track).toBeNull();
    expect(s.bus("music")).toBe(MUSIC);
    expect(s.bus("encounter")).toBe(0);
    s.step(1, press);
    closeLine(s);
    s.step(60);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.bus("music")).toBe(MUSIC);
  });

  it("no synth when the encounter begins: silent to its end, even if audio starts part way", () => {
    const s = setup({ unlocked: false });
    expect(s.factory).not.toHaveBeenCalled();
    s.step(60);
    expect(s.ctx.gains).toHaveLength(0);
    s.keys.press("KeyA"); // audio starts now
    expect(s.feature.engine.ready).toBe(true);
    toOpen(s);
    s.step(60);
    expect(s.sound.state).toBe("idle");
    expect(s.sound.loop.track).toBeNull();
    expect(s.ctx.gains).toHaveLength(3); // master, effects, music: no encounter bus was made
    s.step(1, press);
    closeLine(s);
    s.step(60);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.bus("music")).toBe(MUSIC);
  });

  it("audio unavailable: no throw, nothing made", () => {
    const s = setup({ audio: () => null });
    toResult(s);
    closeLine(s);
    s.step(60);
    expect(s.feature.engine.unavailable).toBe(true);
    expect(s.ctx.gains).toHaveLength(0);
    expect(s.game.interaction.busy).toBe(false);
  });

  it("the sound does nothing at all with no synth, and with no track the encounter is silent", () => {
    const sound = new EncounterSound();
    const scene = { id: 1, phase: "entering", frame: 40, outcome: null, reduced: false } as const;
    sound.update(scene, null);
    sound.update(null, null);
    expect(sound.state).toBe("idle");
    const ctx = new FakeAudioContext();
    const synth = new Synth(ctx, () => 0.5);
    const none = new EncounterSound(null);
    none.update(scene, synth);
    expect(none.state).toBe("idle");
    expect(synth.busLevel("encounter")).toBe(0);
  });

  it("disabled (the music lab's stand-in plays instead): nothing is made or ducked", () => {
    const s = setup({ record: true });
    s.sound.disabled = true;
    s.step(1, esc);
    s.step(seconds(M.duckUp + 1));
    expect(s.bus("music")).toBeCloseTo(MUSIC, 6);
    expect(s.game.startEncounter(ADS[0])).toBe(true);
    toOpen(s);
    expect(s.sound.state).toBe("idle");
    expect(s.bus("music")).toBe(MUSIC);
  });
});

describe("the loop and the rest of the sound", () => {
  it("the loop's notes are on its own bus, not the record's, and are not counted against the effect voice cap", () => {
    const s = setup();
    toOpen(s);
    s.step(60);
    const bus = s.ctx.gains.slice(3).find((g) => g.gain.calls.some((c) => c.type === "cancel"))!;
    expect(s.ctx.gains.filter((g) => g.connections.includes(bus)).length).toBeGreaterThan(5);
    expect(s.ctx.gains.filter((g) => g.connections.includes(s.ctx.gains[2]))).toHaveLength(0);
    expect(s.feature.engine.synth!.voices).toBe(0);
    expect(s.feature.engine.playAt("encounterHit", undefined, 0)).toBe(true);
  });

  it("the encounter never writes the saved sound settings", () => {
    const s = setup({ record: true });
    const before = JSON.stringify([...s.storage.data.entries()]);
    toResult(s);
    closeLine(s);
    s.step(120);
    expect(JSON.stringify([...s.storage.data.entries()])).toBe(before);
  });
});
