import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { GUITAR_SKILL, MUSIC, SOUND } from "../config";
import { Game } from "../game";
import { parseTrack } from "../music/track";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { FakeAudioContext } from "./fake-audio";
import { devGuitarTilt, SoundFeature, type KeyEventLike, type Listenable } from "./feature";
import { GuitarGroove } from "./guitar-groove";
import { mixPeak } from "./guitar-mix";
import { tiltGain, barLength, grooveBar, grooveChord, groovePattern, grooveSlotTime, grooveSlots, melodyNote, slotLength, type Dir } from "./guitar-skill";
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
    expect(groovePattern()).toHaveLength(4 * G.cyclesPerBar);
    expect(groovePattern()).toMatch(/^[ramih.]+$/);
    for (const c of G.cycle) expect(c).toMatch(/^[ramih]{4}$/); // three background plucks and one rest each
    for (const c of G.cycle) expect([...c].filter((x) => x === "h")).toHaveLength(1);
    expect([2, 4]).toContain(G.cyclesPerBar);
    expect(G.pluckBpm).toBeGreaterThanOrEqual(400);
    expect(G.swing).toBeLessThanOrEqual(0.05);
    expect(G.snap.window).toBeLessThanOrEqual(0.15);
    expect(G.melodyGain).toBeLessThan(1);
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
        expect(n.semis).toBeGreaterThanOrEqual(-29); // the low E
        expect(n.gain).toBeGreaterThan(0);
        expect(Math.abs(n.wobble)).toBeLessThanOrEqual(GUITAR_SKILL.humanise.time);
        expect(n.role === "bass").toBe("ra".includes(groovePattern()[n.slot]));
        expect(n.role === "bass" ? n.string >= 4 : n.string <= 3).toBe(true);
      }
      const maxBass = Math.max(...notes.filter((n) => n.role === "bass").map((n) => n.semis));
      const minHarmony = Math.min(...notes.filter((n) => n.role === "harmony").map((n) => n.semis));
      expect(maxBass).toBeLessThan(minHarmony + 8);
    }
  });
  it("follows real fingerstyle string roles: bass strings only for the thumb, never a run up the strings, melody slot per cycle shape", () => {
    expect(groovePattern()).toBe("rmahrhamrmahrham");
    const restSlots = [...groovePattern()].flatMap((c, i) => (c === "h" ? [i] : []));
    expect(restSlots).toEqual([3, 5, 11, 13]); // slot 4 of cycle A, slot 2 of cycle B
    for (let bar = 0; bar < 4; bar++) {
      const notes = grooveBar(bar, 0);
      const name = grooveChord(bar);
      const v = G.voicings[name];
      // the thumb: root then alternate string, in every cycle; strings 6, 5, 4 only
      const bass = notes.filter((n) => n.role === "bass");
      expect(bass.map((n) => n.slot)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
      expect(bass.map((n) => n.string)).toEqual([v.root, v.alt, v.root, v.alt, v.root, v.alt, v.root, v.alt]);
      for (const n of bass) expect(n.string).toBeGreaterThanOrEqual(4);
      // the fingers: mid string, one per cycle
      expect(notes.filter((n) => n.role === "harmony").map((n) => n.slot)).toEqual([1, 7, 9, 15]);
      for (const n of notes.filter((n) => n.role === "harmony")) expect(n.string).toBeLessThanOrEqual(3);
      // nothing on a rest slot
      expect(notes.some((n) => restSlots.includes(n.slot))).toBe(false);
      // no cycle climbs the strings low to high (counting the melody's high note)
      for (let c = 0; c < G.cyclesPerBar; c++) {
        // the melody's rest counts as the high string (1), as the arrow plays a high note there
        const strings = [...groovePattern()].slice(c * 4, c * 4 + 4).map((ch, i) => (ch === "h" ? 1 : notes.find((n) => n.slot === c * 4 + i)!.string));
        const rising = strings.every((x, i) => i === 0 || x < strings[i - 1]); // a lower string number is higher
        expect(rising, `${name} cycle ${c}: ${strings}`).toBe(false);
      }
    }
    // the alternate bass is the fifth of the chord
    for (const name of G.progression) {
      const v = G.voicings[name];
      const root = v.strings[v.root];
      expect(pc(v.strings[v.alt] - root)).toBe(7);
    }
  });
  it("picks the nearest string when a chord lacks one (D has no 6th string)", () => {
    for (const name of G.progression) {
      const v = G.voicings[name];
      for (const s of [v.root, v.alt, v.mid, v.high]) expect(v.strings[s]).toBeDefined();
    }
    expect(G.voicings.D.strings[6]).toBeUndefined();
  });
  it("is the same for the same seed and repeats every four bars apart from the wobble", () => {
    expect(grooveBar(2, 5)).toEqual(grooveBar(2, 5));
    expect(grooveBar(2, 5)).not.toEqual(grooveBar(2, 6));
    expect(grooveBar(6, 5).map((n) => n.semis)).toEqual(grooveBar(2, 5).map((n) => n.semis));
  });
  it("swings only the odd slots, by the configured fraction of a slot", () => {
    const e = slotLength();
    for (let k = 0; k < 32; k++) expect(grooveSlotTime(k) - k * e).toBeCloseTo(k % 2 === 1 ? G.swing * e : 0, 9);
    expect(grooveSlotTime(3, 480, 0)).toBeCloseTo(3 * 0.125, 9);
    expect(barLength(480)).toBeCloseTo(2, 9);
    expect(slotLength()).toBeCloseTo(60 / G.pluckBpm, 9);
    expect(grooveSlots()).toBe(16);
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

describe("the balance of melody and loop (pitch tilt)", () => {
  const db = (x: number) => 20 * Math.log10(x);
  // The peak of one note at the output, through the offline mix (the same envelopes as the synth).
  const peak = (effect: string, semis: number, gain: number, stretch: number) => mixPeak([{ effect, time: 0, pitch: 2 ** (semis / 12), gain, stretch }]);
  const voices = ["steel", "nylon"];
  function peaks(voice: string, tilt?: number) {
    const loop: { chord: string; role: string; peak: number }[] = [];
    const melody: { chord: string; dir: Dir; peak: number }[] = [];
    for (let bar = 0; bar < 4; bar++)
      for (const n of grooveBar(bar, 0, tilt))
        loop.push({ chord: grooveChord(bar), role: n.role, peak: peak(SOUND.guitarStrings[voice].string, n.semis, n.gain * G.gain, GUITAR_SKILL.decay) });
    for (const chord of G.progression)
      for (const d of dirs) {
        const semis = melodyNote(chord, d);
        melody.push({ chord, dir: d, peak: peak(SOUND.guitarVoices[voice], semis, G.melodyGain * tiltGain(semis, tilt), 1) });
      }
    return { loop, melody };
  }
  it("has no tilt below the reference, dbPerOctave dB less for every octave above it, and 0 reproduces the old gains", () => {
    const { reference } = G.pitchTilt;
    expect(tiltGain(reference - 12)).toBe(1);
    expect(tiltGain(reference)).toBe(1);
    expect(db(tiltGain(reference + 12))).toBeCloseTo(-G.pitchTilt.dbPerOctave, 6);
    expect(db(tiltGain(reference + 24))).toBeCloseTo(-2 * G.pitchTilt.dbPerOctave, 6);
    for (const semis of [-29, -12, 0, 12, 19]) expect(tiltGain(semis, 0)).toBe(1);
    // with the tilt off the loop's gains are the untilted ones: the bass is untouched, mid notes are harmonyGain
    for (const n of grooveBar(0, 0, 0)) if (n.role === "harmony") expect(n.gain / G.harmonyGain).toBeGreaterThan(1 - GUITAR_SKILL.humanise.gain - 1e-9);
    expect(grooveBar(0, 0, 0).filter((n) => n.role === "harmony").map((n) => n.gain)).not.toEqual(grooveBar(0, 0).filter((n) => n.role === "harmony").map((n) => n.gain));
  });
  it("keeps the melody balanced with the loop: at most 2 dB over its loudest note and at most 7 dB under it (the high notes are turned down to sound level with the low ones), and over the loop's mid notes, in every voice and chord", () => {
    for (const voice of voices) {
      const { loop, melody } = peaks(voice);
      const loudest = Math.max(...loop.map((n) => n.peak));
      const mid = Math.max(...loop.filter((n) => n.role === "harmony").map((n) => n.peak));
      for (const m of melody) {
        const over = db(m.peak / loudest);
        expect(over, `${voice} ${m.chord} ${m.dir}: ${over.toFixed(1)} dB`).toBeGreaterThanOrEqual(-7);
        expect(over, `${voice} ${m.chord} ${m.dir}: ${over.toFixed(1)} dB`).toBeLessThanOrEqual(2);
        expect(m.peak).toBeGreaterThan(mid);
      }
    }
  });
  it("is quieter with the tilt than without for the high notes (it is what keeps them from standing out)", () => {
    const tilted = peaks("steel");
    const flat = peaks("steel", 0);
    expect(Math.max(...tilted.melody.map((m) => m.peak))).toBeLessThan(Math.max(...flat.melody.map((m) => m.peak)));
  });
  it("reads ?guitartilt= only in dev, 0 to 12", () => {
    expect(devGuitarTilt("?guitartilt=0", true)).toBe(0);
    expect(devGuitarTilt("?guitartilt=3.5", true)).toBe(3.5);
    expect(devGuitarTilt("?guitartilt=-1", true)).toBeUndefined();
    expect(devGuitarTilt("?guitartilt=x", true)).toBeUndefined();
    expect(devGuitarTilt("?guitartilt=", true)).toBeUndefined();
    expect(devGuitarTilt("", true)).toBeUndefined();
    expect(devGuitarTilt("?guitartilt=2", false)).toBeUndefined();
  });
  it("was far louder before the tilt and the lower gain (melody 0.7, no tilt)", () => {
    for (const voice of voices) {
      const loudest = Math.max(...peaks(voice).loop.map((n) => n.peak));
      const before = Math.max(...G.progression.flatMap((c) => dirs.map((d) => peak(SOUND.guitarVoices[voice], melodyNote(c, d), 0.7, 1))));
      const after = Math.max(...peaks(voice).melody.map((m) => m.peak));
      expect(db(before / loudest)).toBeGreaterThan(4);
      expect(after).toBeLessThan(before * 0.7);
    }
  });
  it("prints the per-note peaks (informational)", () => {
    for (const voice of voices) {
      const { loop, melody } = peaks(voice);
      const flat = peaks(voice, 0);
      const f = (xs: number[]) => `${Math.min(...xs).toFixed(3)} to ${Math.max(...xs).toFixed(3)}`;
      console.log(`${voice} loop bass ${f(loop.filter((n) => n.role === "bass").map((n) => n.peak))}, loop mid ${f(loop.filter((n) => n.role === "harmony").map((n) => n.peak))} (untilted ${f(flat.loop.filter((n) => n.role === "harmony").map((n) => n.peak))}), melody ${f(melody.map((n) => n.peak))}`);
    }
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
  it("leaves the fourth pluck of every cycle silent when no key is pressed, and a press fills it", () => {
    const r = rig();
    r.groove.start("guitarSteelString", 0);
    r.run(2 * barLength() + 0.5);
    const origin = G.leadIn + dt;
    const times = r.ctx.oscillators.map((o) => o.startedAt ?? 0);
    for (const k of [3, 5, 11, 13, 19, 21, 27, 29]) {
      const t = origin + grooveSlotTime(k);
      expect(times.filter((x) => Math.abs(x - t) < slotLength() / 2 - 0.02), `rest ${k}`).toHaveLength(0);
    }
    // the plucks around it are there
    expect(times.filter((x) => Math.abs(x - (origin + grooveSlotTime(2))) < 0.02).length).toBeGreaterThan(0);
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
    r.run(4 * barLength() + 1);
    expect(r.ctx.oscillators.length).toBeGreaterThan(4 * 8 * per);
    expect(r.groove.chordAt(r.ctx.currentTime - 0.5)).toBe("A");
    expect(r.groove.chordAt(G.leadIn + dt + barLength() * 1.5)).toBe("E");
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
    expect(r.ctx.oscillators.length - n).toBeLessThan(3 * 12 * per);
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

function setup(skill: "groove" | "jazz" = "groove", withRecord = false, guitarSnap?: boolean) {
  const guitar = TASKS.find((t) => t.id === "guitar")!;
  const level = { ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [guitar] } }), facing: "right" as const };
  const game = new Game(level);
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const record = parseTrack("title: One\n[a square]\nC4:1 D4:1 E4:1 F4:1", "1.track", "one");
  const feature = new SoundFeature(game, { audio: () => ctx, storage: new FakeStorage(), keys, random: () => 0.5, tracks: [record], start: "main", guitarSkill: skill, guitarSnap });
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
    s.advance(barLength() * 1.5);
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
  describe("snapping an arrow to the pattern's high-note slot", () => {
    // Advances to `lead` seconds before an "h" slot (by default slot 3 of the second bar), then presses.
    function pressBefore(lead: number, snap?: boolean, slotInBar = 3, bar = 1) {
      const s = setup("groove", false, snap);
      s.keys.press("ArrowLeft"); // starts the loop
      s.advance(0.5);
      const groove = s.engine.groove as unknown as { origin: number };
      const slot = grooveSlotTime(slotInBar + 16 * bar);
      const target = groove.origin + slot;
      s.ctx.currentTime = target - lead;
      const b = s.ctx.oscillators.length;
      s.keys.press("ArrowUp");
      const melody = s.ctx.oscillators.slice(b).filter((o) => (o.startedAt ?? 0) > 0);
      return { s, target, start: melody[0]?.startedAt ?? 0, now: s.ctx.currentTime, count: melody.length };
    }
    it("plays a press just before the slot on the slot, never earlier than the press", () => {
      const r = pressBefore(0.05);
      expect(r.start).toBeCloseTo(r.target, 6);
      expect(r.start).toBeGreaterThan(r.now);
    });
    it("plays a press far from any slot at once, and one a little after the slot at once", () => {
      const far = pressBefore(0.2);
      expect(far.start).toBeCloseTo(far.now, 6);
      const late = pressBefore(-0.04);
      expect(late.start).toBeCloseTo(late.now, 6);
      expect(late.count).toBeGreaterThan(0);
    });
    it("uses the chord of the slot's bar, and the window is the configured one", () => {
      const r = pressBefore(G.snap.window - 0.005);
      expect(r.start).toBeCloseTo(r.target, 6);
      const out = pressBefore(G.snap.window + 0.01);
      expect(out.start).toBeCloseTo(out.now, 6);
      const note = Math.round(r.s.ctx.oscillators.filter((o) => (o.startedAt ?? 0) === r.start)[0].frequency.calls[0].value);
      expect(note).toBe(Math.round(440 * 2 ** (melodyNote("E", "up") / 12)));
    });
    it("follows the rest slot of each cycle shape: slot 3 in cycle A and slot 5 in cycle B, in other bars too", () => {
      for (const [slot, bar] of [[3, 1], [5, 1], [11, 2], [13, 2]] as const) {
        const r = pressBefore(0.05, undefined, slot, bar);
        expect(r.start, `slot ${slot}`).toBeCloseTo(r.target, 6);
      }
      // a press 50 ms before a background slot (slot 4) is not snapped to a rest slot (the next is 0.13 s on)
      const near = pressBefore(0.05, undefined, 4, 1);
      expect(near.start).toBeCloseTo(near.now, 6);
    });
    it("can be switched off: the press plays at once", () => {
      const r = pressBefore(0.05, false);
      expect(r.start).toBeCloseTo(r.now, 6);
    });
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
  it("stops at every pause, also after a resume and a new arrow (regression), and ignores arrows while paused", () => {
    const s = setup();
    let paused = false;
    s.game.pausedWhen.push(() => paused);
    s.keys.press("ArrowLeft");
    s.advance(0.3);
    expect(s.engine.groove.running).toBe(true);
    paused = true;
    s.advance(0.1);
    expect(s.engine.groove.running).toBe(false);
    const n = s.ctx.oscillators.length;
    s.keys.press("ArrowLeft");
    s.advance(0.3);
    expect(s.ctx.oscillators.length).toBe(n);
    paused = false;
    s.keys.press("ArrowLeft");
    s.advance(0.3);
    expect(s.engine.groove.running).toBe(true);
    paused = true;
    s.advance(0.1);
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
