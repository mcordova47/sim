import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { GUITAR_SKILL, MUSIC, SOUND } from "../config";
import { Game } from "../game";
import { parseTrack } from "../music/track";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./feature";
import { GuitarGroove } from "./guitar-groove";
import { eighth, grooveBar, grooveChord, grooveSlotTime, melodyNote, type Dir } from "./guitar-skill";
import { Synth } from "./synth";

const inKey = (semis: number) => [0, 2, 4, 5, 7, 9, 11].includes(((semis % 12) + 12) % 12);
const pc = (semis: number) => ((semis % 12) + 12) % 12;
const dirs: Dir[] = ["left", "right", "up", "down"];
const G = GUITAR_SKILL.groove;
const dt = 1 / 60;
const tones = SOUND.effects.guitarSteel.voices.filter((v) => "wave" in v).length;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const escape: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };

describe("the groove's data and pure parts", () => {
  it("has a well-formed pattern and the I V vi IV progression in A major", () => {
    expect(G.pattern).toHaveLength(8);
    expect([0, 1, 2, 3, 4].map(grooveChord)).toEqual(["A", "E", "F#m", "D", "A"]);
    expect(G.duck).toBeCloseTo(1 / 3, 5);
    for (const name of G.progression) expect(GUITAR_SKILL.chords[name]).toBeDefined();
  });
  it("plays only notes of the chord, in key, bass under harmony, nothing below A2, thumb on the beats", () => {
    for (let bar = 0; bar < 8; bar++) {
      const notes = grooveBar(bar, 3);
      const chord = GUITAR_SKILL.chords[grooveChord(bar)];
      const tones = [...chord.voicing.map((i) => chord.root + i), chord.root + 7].map(pc);
      expect(notes.length).toBeGreaterThan(5);
      for (const n of notes) {
        expect(inKey(n.semis)).toBe(true);
        expect(tones).toContain(pc(n.semis));
        expect(n.semis).toBeGreaterThanOrEqual(-24);
        expect(n.gain).toBeGreaterThan(0);
        expect(Math.abs(n.wobble)).toBeLessThanOrEqual(GUITAR_SKILL.humanise.time);
        expect(n.role === "bass").toBe(n.slot % 2 === 0);
      }
      const maxBass = Math.max(...notes.filter((n) => n.role === "bass").map((n) => n.semis));
      const minHarmony = Math.min(...notes.filter((n) => n.role === "harmony").map((n) => n.semis));
      expect(maxBass).toBeLessThan(minHarmony + 8);
    }
  });
  it("is the same for the same seed and repeats every four bars apart from the wobble", () => {
    expect(grooveBar(2, 5)).toEqual(grooveBar(2, 5));
    expect(grooveBar(2, 5)).not.toEqual(grooveBar(2, 6));
    expect(grooveBar(6, 5).map((n) => n.semis)).toEqual(grooveBar(2, 5).map((n) => n.semis));
  });
  it("swings only the odd eighths, by the configured fraction", () => {
    const e = eighth();
    for (let k = 0; k < 16; k++) expect(grooveSlotTime(k) - k * e).toBeCloseTo(k % 2 === 1 ? GUITAR_SKILL.swing * e : 0, 9);
    expect(grooveSlotTime(3, 120, 0)).toBeCloseTo(3 * 0.25, 9);
  });
  it("plays an arrow as a chord tone (or the sixth or seventh) of the chord now, always in key", () => {
    for (const name of G.progression) {
      const chord = GUITAR_SKILL.chords[name];
      const notes = dirs.map((d) => melodyNote(name, d));
      for (const n of notes) {
        expect(inKey(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(chord.root + 24);
      }
      expect(new Set(notes).size).toBe(4);
      expect(pc(notes[0])).toBe(pc(chord.root));
      expect(pc(notes[2] - notes[0])).toBe(7);
    }
    expect(melodyNote("A", "left")).not.toBe(melodyNote("D", "left"));
  });
});

describe("the scheduler", () => {
  function rig() {
    const ctx = new FakeAudioContext();
    const synth = new Synth(ctx, () => 0.5);
    const groove = new GuitarGroove();
    const run = (seconds: number, step = dt) => {
      for (let t = 0; t < seconds - 1e-9; t += step) {
        ctx.currentTime += step;
        groove.update(synth);
      }
    };
    return { ctx, synth, groove, run };
  }
  const per = SOUND.effects.guitarSteelString.voices.length;
  const starts = (ctx: FakeAudioContext) => ctx.oscillators.map((o) => o.startedAt ?? 0);

  it("schedules nothing until started, then every note of a bar once, in order, within the lookahead", () => {
    const r = rig();
    r.run(1);
    expect(r.ctx.oscillators).toHaveLength(0);
    r.groove.start("guitarSteelString", 1);
    let maxAhead = 0;
    for (let i = 0; i < 60 * 3; i++) {
      r.ctx.currentTime += dt;
      const before = r.ctx.oscillators.length;
      r.groove.update(r.synth);
      for (const o of r.ctx.oscillators.slice(before)) maxAhead = Math.max(maxAhead, (o.startedAt ?? 0) - r.ctx.currentTime);
    }
    expect(maxAhead).toBeLessThanOrEqual(MUSIC.lookahead + 0.02);
    // three seconds is a bit over two bars at 92 bpm (2.6 s each is wrong: a bar is 2.61 s); check the first bar
    const s = starts(r.ctx);
    const perBar = grooveBar(0, 1).length * per;
    const bar0 = s.slice(0, perBar);
    expect(bar0).toEqual([...bar0].sort((a, b) => a - b));
    expect(new Set(s.map((x) => x.toFixed(6))).size).toBeGreaterThan(8); // not all stacked on one moment
    expect(s.length % per).toBe(0);
  });
  it("keeps time: the first slots fall on the swung grid from the origin", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(0.5);
    const origin = G.leadIn + dt; // origin is set at the first update, after one frame
    const slots = grooveBar(0, 0).map((n) => n.slot);
    const first = r.ctx.oscillators.filter((_, i) => Math.floor(i / per) < 3).map((o) => o.startedAt ?? 0);
    first
      .filter((_, i) => i % per === 0)
      .forEach((t, i) => expect(Math.abs(t - (origin + grooveSlotTime(slots[i])))).toBeLessThanOrEqual(GUITAR_SKILL.humanise.time + dt + 1e-6));
  });
  it("loops after four bars with the progression repeating", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(4 * 8 * eighth() + 1);
    expect(r.ctx.oscillators.length).toBeGreaterThan(4 * 8 * per);
    expect(r.groove.chordAt(r.ctx.currentTime - 0.5)).toBe("A");
    expect(r.groove.chordAt(G.leadIn + dt + 8 * eighth() * 1.5)).toBe("E");
  });
  it("stops: nothing more is scheduled after stop(), and a restart begins again", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(1);
    r.groove.stop();
    const n = r.ctx.oscillators.length;
    r.run(5);
    expect(r.ctx.oscillators).toHaveLength(n);
    expect(r.groove.running).toBe(false);
    r.groove.start("guitarSteelString", 0);
    r.run(1);
    expect(r.ctx.oscillators.length).toBeGreaterThan(n);
  });
  it("does not burst after a long stall: whole bars are skipped", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(1);
    const n = r.ctx.oscillators.length;
    r.ctx.currentTime += 120; // a background tab
    r.groove.update(r.synth);
    r.run(0.5);
    expect(r.ctx.oscillators.length - n).toBeLessThan(2 * 8 * per);
    for (const o of r.ctx.oscillators.slice(n)) expect(o.startedAt ?? 0).toBeGreaterThan(r.ctx.currentTime - 1);
  });
  it("goes to the music bus: no effect voice is used up, and it is silent when muted", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(2);
    expect(r.synth.voices).toBe(0);
    r.synth.muted = true;
    const master = r.ctx.gains[0].gain.calls.at(-1)!;
    expect(master.value).toBe(0);
  });
  it("does nothing with no synth", () => {
    const groove = new GuitarGroove();
    groove.start("guitarSteelString");
    expect(() => groove.update(null)).not.toThrow();
  });
});

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}
const CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

function setup(skill: "groove" | "jazz" = "groove", withRecord = false) {
  const guitar = TASKS.find((t) => t.id === "guitar")!;
  const level = { ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [guitar] } }), facing: "right" as const };
  const game = new Game(level);
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const record = parseTrack("title: One\n[a square]\nC4:1 D4:1 E4:1 F4:1", "1.track", "one");
  const feature = new SoundFeature(game, { audio: () => ctx, storage: new FakeStorage(), keys, random: () => 0.5, tracks: [record], start: "main", guitarSkill: skill });
  keys.press("KeyZ");
  if (withRecord) feature.setTrack(record);
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  const advance = (seconds: number, input: Controls = NO_INPUT) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) {
      ctx.currentTime += dt;
      game.update(dt, input);
    }
  };
  return { game, feature, ctx, keys, advance, engine: feature.engine };
}

describe("the groove in the game (level 6)", () => {
  it("starts with the first arrow, plays under the melody, and the melody is a chord tone of the chord sounding", () => {
    const s = setup();
    s.advance(0.1);
    expect(s.engine.groove.running).toBe(false);
    const before = s.ctx.oscillators.length;
    s.keys.press("ArrowLeft");
    expect(s.engine.groove.running).toBe(true);
    const melody = s.ctx.oscillators.slice(before);
    expect(melody).toHaveLength(tones);
    expect(Math.round(melody[0].frequency.calls[0].value)).toBe(Math.round(440 * 2 ** (melodyNote("A", "left") / 12)));
    // a second bar later the chord is E and the same arrow is another note
    s.advance(8 * eighth() * 1.5);
    const b = s.ctx.oscillators.length;
    s.keys.press("ArrowLeft");
    const second = s.ctx.oscillators.slice(b);
    expect(Math.round(second[0].frequency.calls[0].value)).toBe(Math.round(440 * 2 ** (melodyNote("E", "left") / 12)));
    // the loop is sounding in between
    expect(b - before).toBeGreaterThan(10);
  });
  it("is in time: the melody plays at once, never waiting for the loop", () => {
    const s = setup();
    s.keys.press("ArrowUp");
    s.advance(0.2);
    const b = s.ctx.oscillators.length;
    s.keys.press("ArrowDown");
    expect(s.ctx.oscillators.slice(b)[0].startedAt).toBeCloseTo(s.ctx.currentTime, 6);
  });
  it("is not there at lower levels", () => {
    const s = setup("jazz");
    s.keys.press("ArrowLeft");
    s.advance(2);
    expect(s.engine.groove.running).toBe(false);
  });
  it("stops when the session is cancelled, and when it ends; ringing notes are not cut", () => {
    const s = setup();
    s.keys.press("ArrowLeft");
    s.advance(1);
    s.advance(0.1, escape);
    expect(s.engine.groove.running).toBe(false);
    const n = s.ctx.oscillators.length;
    s.advance(4);
    expect(s.ctx.oscillators.length).toBe(n);
  });
  it("stops when the session runs out of its own accord", () => {
    const s = setup();
    s.keys.press("ArrowLeft");
    for (let i = 0; i < 60 * 40 && s.engine.groove.running; i++) {
      if (i % 40 === 0) s.keys.press(CODES[(i / 40) % 4]);
      s.advance(dt);
    }
    expect(s.engine.groove.running).toBe(false);
  });
  it("is silent when muted", () => {
    const s = setup();
    s.feature.setMuted(true);
    s.keys.press("ArrowLeft");
    s.advance(3);
    const master = s.ctx.gains[0].gain.calls.filter((c) => c.type === "set").at(-1)!;
    expect(master.value).toBe(0);
  });
  it("turns the record down to about a third while it plays, and back up when it stops", () => {
    const s = setup("groove", true);
    s.advance(1);
    expect(s.engine.music.ducked).toBe(1);
    s.keys.press("ArrowLeft");
    s.advance(1.5);
    expect(s.engine.music.ducked).toBeCloseTo(1 / 3, 3);
    s.advance(0.1, escape);
    s.advance(1.5);
    expect(s.engine.music.ducked).toBe(1);
  });
  it("never drops a melody note with the groove running, at 70 ms between presses, and a chime still fits", () => {
    const s = setup();
    const synth = (s.engine as unknown as { synth: Synth }).synth;
    const real = synth.play.bind(synth);
    let played = 0;
    let refused = 0;
    synth.play = (def, options, delay) => {
      const ok = real(def, options, delay);
      if (ok) played++;
      else refused++;
      return ok;
    };
    let peak = 0;
    let presses = 0;
    for (let i = 0; i < 80; i++) {
      if (!s.game.interaction.active) break;
      s.keys.press(CODES[i % 4]);
      presses++;
      s.advance(0.07);
      peak = Math.max(peak, synth.voices);
    }
    expect(presses).toBeGreaterThan(30);
    expect(s.engine.groove.running).toBe(true);
    expect(refused).toBe(0);
    expect(played).toBeGreaterThanOrEqual(presses);
    expect(peak).toBeLessThanOrEqual(SOUND.maxVoices - SOUND.effects.taskComplete.voices.length);
    expect(synth.play(SOUND.effects.taskComplete)).toBe(true);
  });
  it("the loop adds no effect voices: only the melody counts against the voice cap", () => {
    const s = setup();
    const synth = (s.engine as unknown as { synth: Synth }).synth;
    s.keys.press("ArrowLeft");
    s.advance(0.5);
    expect(synth.voices).toBeLessThanOrEqual(SOUND.effects.guitarSteel.voices.length);
    s.advance(0.5);
    expect(synth.voices).toBe(0);
    expect(s.ctx.oscillators.length).toBeGreaterThan(tones + 2);
  });
  it("has a dev audition that plays the loop alone and stops itself, and stops on 0", () => {
    const s = setup();
    s.game.update(dt, escape);
    s.feature.auditionGroove(2);
    s.advance(0.1);
    expect(s.engine.groove.running).toBe(true);
    s.feature.auditionGroove(0);
    expect(s.engine.groove.running).toBe(false);
  });
});
