import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { GUITAR_SKILL, SOUND } from "../config";
import { Game } from "../game";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, devGuitarSkill, type KeyEventLike, type Listenable } from "./feature";
import { chordFor, guitarSessions, playKey, seeded, skillLevel, strokeNotes, strumNotes, type Dir, type Level } from "./guitar-skill";

// Pitch class of a note given semitones from A4: (semis mod 12) with 0 = A. A major = A B C# D E F# G#.
const inKey = (semis: number) => [0, 2, 4, 5, 7, 9, 11].includes((((semis % 12) + 12) % 12));

const dirs: Dir[] = ["left", "down", "up", "right"];
const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

describe("skillLevel", () => {
  it("follows the thresholds, one below and at each", () => {
    const ids = ["notes", "chords", "sevenths", "open", "jazz", "groove"];
    const from = [0, 4, 10, 20, 35, 55];
    from.forEach((n, i) => {
      expect(skillLevel(n)).toBe(ids[i]);
      if (n > 0) expect(skillLevel(n - 1)).toBe(ids[i - 1]);
    });
    expect(skillLevel(10 ** 9)).toBe("groove");
  });
  it("copes with junk", () => {
    for (const bad of [-5, NaN, -Infinity]) expect(skillLevel(bad)).toBe("notes");
    expect(skillLevel(Infinity)).toBe("notes");
    expect(skillLevel(3.9)).toBe("notes");
    expect(skillLevel(4.2)).toBe("chords");
  });
  it("has increasing thresholds starting at 0, unique ids, and names", () => {
    const l = GUITAR_SKILL.levels;
    expect(l[0].from).toBe(0);
    for (let i = 1; i < l.length; i++) expect(l[i].from).toBeGreaterThan(l[i - 1].from);
    expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
    expect(l.map((x) => x.from)).toEqual([0, 4, 10, 20, 35, 55]);
    expect(l).toHaveLength(6);
    for (const x of l) expect(x.name.length).toBeGreaterThan(0);
  });
  it("counts the guitar task, which exists", () => {
    for (const id of GUITAR_SKILL.taskIds) expect(TASKS.some((t) => t.id === id)).toBe(true);
    expect(guitarSessions({ guitar: 5, other: 9 })).toBe(5);
    expect(guitarSessions({})).toBe(0);
  });
});

describe("the data", () => {
  it("gives every chord level one chord per arrow, in A major, in order, nothing below A2, at most six strings", () => {
    const withChords = GUITAR_SKILL.levels.filter((l) => l.chords);
    expect(withChords.map((l) => l.id)).toEqual(["chords", "sevenths", "open", "jazz", "groove"]);
    for (const l of withChords) {
      const names = dirs.map((d) => l.chords![d].name);
      expect(new Set(names).size, l.id).toBe(4);
      for (const d of dirs) {
        const c = l.chords![d];
        expect(c.voicing.length, c.name).toBeGreaterThanOrEqual(4);
        expect(c.voicing.length, c.name).toBeLessThanOrEqual(6);
        expect(c.voicing[0], c.name).toBe(0);
        for (let i = 1; i < c.voicing.length; i++) expect(c.voicing[i], c.name).toBeGreaterThan(c.voicing[i - 1]);
        for (const n of strokeNotes(c, "down")) {
          expect(inKey(n.semis), `${l.id} ${c.name}`).toBe(true);
          expect(n.semis, `${l.id} ${c.name}`).toBeGreaterThanOrEqual(-24);
        }
      }
    }
    // the same four degrees at every level: the roots do not move
    for (const d of dirs) expect(new Set(withChords.map((l) => l.chords![d].root)).size).toBe(1);
    expect(dirs.map((d) => chordFor(d))).toEqual(["A", "D", "E", "F#m"]);
    expect(GUITAR_SKILL.chords.A).toBeDefined();
    expect(GUITAR_SKILL.levels[0].chords).toBeUndefined();
  });
  it("has stroke settings in range: spacing, ramp, up gain and a chord decay longer than a note", () => {
    expect(GUITAR_SKILL.down.spacing).toBeGreaterThanOrEqual(0.02);
    expect(GUITAR_SKILL.down.spacing).toBeLessThanOrEqual(0.05);
    expect(GUITAR_SKILL.up.spacing).toBeLessThan(GUITAR_SKILL.down.spacing);
    expect(GUITAR_SKILL.up.gain).toBeLessThan(1);
    expect(GUITAR_SKILL.ramp).toBeGreaterThanOrEqual(0);
    expect(GUITAR_SKILL.ramp).toBeLessThan(0.5);
    expect(GUITAR_SKILL.decay).toBeGreaterThanOrEqual(1.3);
    expect(GUITAR_SKILL.decay).toBeLessThanOrEqual(1.8);
  });
  it("has 8-slot strums of known marks, and sane tempo, swing and wobble", () => {
    for (const p of GUITAR_SKILL.strums) expect(p).toMatch(/^[DUx.]{8}$/);
    expect(GUITAR_SKILL.tempo).toBeGreaterThan(40);
    expect(GUITAR_SKILL.tempo).toBeLessThan(200);
    expect(GUITAR_SKILL.swing).toBeGreaterThanOrEqual(0);
    expect(GUITAR_SKILL.swing).toBeLessThan(0.3);
    expect(GUITAR_SKILL.humanise.time).toBeLessThan(0.03);
  });
  it("has a string effect for every voice and instrument", () => {
    for (const [id, inst] of Object.entries(SOUND.instruments)) {
      const set = SOUND.guitarStrings[inst.voice];
      expect(set, id).toBeDefined();
      expect(SOUND.effects[set.first]).toBeDefined();
      expect(SOUND.effects[set.string]).toBeDefined();
    }
    expect(SOUND.effects.guitarChop).toBeDefined();
  });
});

describe("playKey", () => {
  it("is the single note at level 1", () => {
    for (const d of dirs) expect(playKey("notes", d, 7)).toEqual([{ semis: 7, at: 0, gain: 1, kind: "first" }]);
  });
  it("plays the plain chord for each arrow at level 2, low to high, spaced by the config, every string with its own pick", () => {
    const names = { left: "A", down: "D", up: "E", right: "F#m" };
    for (const d of dirs) {
      const notes = playKey("chords", d, 0);
      expect(notes).toHaveLength(4);
      expect(chordFor(d, "chords")).toBe(names[d]);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i].at - notes[i - 1].at).toBeCloseTo(GUITAR_SKILL.down.spacing, 6);
        expect(notes[i].semis).toBeGreaterThan(notes[i - 1].semis);
        expect(notes[i].gain).toBeLessThanOrEqual(notes[i - 1].gain); // the ramp
      }
      expect(notes[0].at).toBe(0);
      expect(notes.every((n) => inKey(n.semis) && n.kind === "first")).toBe(true);
    }
  });
  it("has the chord table the design shows", () => {
    const table = (id: Level) => dirs.map((d) => chordFor(d, id));
    expect(table("chords")).toEqual(["A", "D", "E", "F#m"]);
    expect(table("sevenths")).toEqual(["Amaj7", "Dadd9", "E7", "F#m7"]);
    expect(table("open")).toEqual(["Asus2", "Dsus2", "Esus4", "F#m11"]);
    expect(table("jazz")).toEqual(["Amaj9", "D6/9", "E13", "F#m9"]);
    expect(table("groove")).toEqual(table("jazz")); // until 114b
  });
  it("plays down then up at every chord level: reversed order, tighter, quieter, over within a quarter second", () => {
    for (const level of ["chords", "sevenths", "open", "jazz", "groove"] as Level[])
      for (const d of dirs) {
        const down = playKey(level, d, 0, "down");
        const up = playKey(level, d, 0, "up");
        expect(up).toHaveLength(down.length);
        expect(down.map((n) => n.semis)).toEqual([...down.map((n) => n.semis)].sort((a, b) => a - b));
        expect(up.map((n) => n.semis)).toEqual(down.map((n) => n.semis).reverse());
        expect(up[1].at - up[0].at).toBeCloseTo(GUITAR_SKILL.up.spacing, 6);
        expect(down[1].at - down[0].at).toBeCloseTo(GUITAR_SKILL.down.spacing, 6);
        expect(up[0].gain).toBeLessThan(down[0].gain);
        expect(down[down.length - 1].at).toBeLessThan(0.25);
        expect(up[up.length - 1].at).toBeLessThan(0.25);
      }
  });
  it("down-strums go low to high, up-strums high to low and softer, rests are silent, chops are noise", () => {
    const down = strumNotes("A", "D.......", 1);
    expect(down.map((n) => n.semis)).toEqual([...down.map((n) => n.semis)].sort((a, b) => a - b));
    expect(down).toHaveLength(4);
    const up = strumNotes("A", "U.......", 1);
    expect(up).toHaveLength(GUITAR_SKILL.up.strings);
    expect(up.map((n) => n.semis)).toEqual([...up.map((n) => n.semis)].sort((a, b) => b - a));
    expect(Math.max(...up.map((n) => n.gain))).toBeLessThan(Math.min(...down.map((n) => n.gain)));
    expect(strumNotes("A", "........", 1)).toEqual([]);
    expect(strumNotes("A", "x.......", 1).map((n) => n.kind)).toEqual(["chop"]);
  });
  it("swings only the odd slots and starts the first slot on the press", () => {
    const sw = (s: number) => strumNotes("A", "DDDD....", 0, 92, s).filter((n) => n.kind === "first").map((n) => n.at);
    const plain = sw(0);
    const swung = sw(0.1);
    expect(plain[0]).toBe(0);
    expect(swung[0]).toBe(0);
    const e = 60 / 92 / 2;
    expect(swung[1] - plain[1]).toBeGreaterThan(0.1 * e - 0.02);
    expect(Math.abs(swung[2] - plain[2])).toBeLessThan(0.02); // an even slot only wobbles
  });
  it("is deterministic for a seed and varies with another", () => {
    expect(strumNotes("D", GUITAR_SKILL.strums[0], 5)).toEqual(strumNotes("D", GUITAR_SKILL.strums[0], 5));
    expect(strumNotes("D", GUITAR_SKILL.strums[0], 5)).not.toEqual(strumNotes("D", GUITAR_SKILL.strums[0], 6));
    const r = seeded(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v >= 0 && v < 1).toBe(true);
    }
  });
});

describe("the dev override", () => {
  it("is read only on the dev server and only for 1 to 6", () => {
    const ids = ["notes", "chords", "sevenths", "open", "jazz", "groove"];
    ids.forEach((id, i) => expect(devGuitarSkill(`?guitarskill=${i + 1}`, true)).toBe(id));
    expect(devGuitarSkill("?guitarskill=7", true)).toBeUndefined();
    expect(devGuitarSkill("?guitarskill=0", true)).toBeUndefined();
    expect(devGuitarSkill("?guitarskill=x", true)).toBeUndefined();
    expect(devGuitarSkill("", true)).toBeUndefined();
    expect(devGuitarSkill("?guitarskill=2", false)).toBeUndefined();
  });
});

// The feature, with a fake audio clock.
class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}
const CODES = ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"];

function setup(opts: { sessions?: () => number; skill?: Level; voice?: string } = {}) {
  const guitar = TASKS.find((t) => t.id === "guitar")!;
  const level = { ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [guitar] } }), facing: "right" as const };
  const game = new Game(level);
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const feature = new SoundFeature(game, { audio: () => ctx, storage: new FakeStorage(), keys, random: () => 0.5, tracks: [], start: "main", guitarVoice: opts.voice, guitarSessions: opts.sessions, guitarSkill: opts.skill });
  keys.press("KeyZ");
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  // Runs the clock forward, a frame at a time, so lookahead scheduling happens.
  const advance = (seconds: number) => {
    for (let t = 0; t < seconds; t += dt) {
      ctx.currentTime += dt;
      game.update(dt, NO_INPUT);
    }
  };
  const count = () => ctx.oscillators.length;
  return { game, feature, ctx, keys, advance, count };
}

const toneVoices = (effect: string) => SOUND.effects[effect].voices.filter((v) => "wave" in v).length;
const freqs = (os: FakeAudioContext["oscillators"]) => os.map((o) => o.frequency.calls[0].value);

describe("the feature at each level", () => {
  it("plays the single note with no stats wired (level 1, as before)", () => {
    const s = setup();
    const before = s.count();
    s.keys.press("ArrowUp");
    expect(s.count() - before).toBe(toneVoices("guitarSteel"));
  });
  it("plays the four-string chord at level 2 at the right pitches, spaced, with a longer ring", () => {
    const s = setup({ skill: "chords" });
    const before = s.count();
    s.keys.press("ArrowLeft");
    s.advance(0.3);
    const made = s.ctx.oscillators.slice(before);
    expect(made).toHaveLength(GUITAR_SKILL.levels[1].chords!.left.voicing.length);
    const expected = strokeNotes(GUITAR_SKILL.levels[1].chords!.left, "down").map((n) => 440 * 2 ** (n.semis / 12));
    expect(freqs(made).map(Math.round)).toEqual(expected.map(Math.round));
    // start times are spaced by the config
    const starts = made.map((o) => o.startedAt ?? 0);
    for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeCloseTo(GUITAR_SKILL.down.spacing, 3);
    // each string rings decay times as long as the voice's own length
    const own = SOUND.effects.guitarSteelString.voices[0].length;
    expect((made[0].stoppedAt ?? 0) - (made[0].startedAt ?? 0)).toBeCloseTo(own * GUITAR_SKILL.decay + 0.02, 2);
  });
  it("plays one stroke per press at level 4 (open), alternating down and up, and nothing after the last press", () => {
    const s = setup({ skill: "open" });
    const per = GUITAR_SKILL.levels[3].chords!.left.voicing.length;
    const b = s.count();
    s.keys.press("ArrowLeft"); // down
    s.advance(1);
    const first = s.ctx.oscillators.slice(b);
    expect(first).toHaveLength(per);
    const f1 = freqs(first);
    expect(f1).toEqual([...f1].sort((x, y) => x - y)); // low to high
    const b2 = s.count();
    s.keys.press("ArrowLeft"); // up
    s.advance(1);
    const second = s.ctx.oscillators.slice(b2);
    expect(second).toHaveLength(per);
    const f2 = freqs(second);
    expect(f2).toEqual([...f2].sort((x, y) => y - x)); // high to low
    // silence after: no new voices over the next several seconds
    const done = s.count();
    s.advance(6);
    expect(s.count()).toBe(done);
  });
  it("reads the level once per session: a changing count does not change a running session", () => {
    let n = 0;
    const s = setup({ sessions: () => n });
    n = 4;
    const b = s.count();
    s.keys.press("ArrowUp");
    s.advance(0.3);
    expect(s.count() - b).toBe(toneVoices("guitarSteel")); // still a single note
  });
  it("uses the level's chord for a session that starts with 4, 10, 20, 35 and 55 finished sessions", () => {
    // ArrowUp is E: 4 strings, E7 (5), Esus4 (6), E13 (5), E13 (5)
    for (const [n, voices] of [[4, 4], [10, 5], [20, 6], [35, 5], [55, 5]] as const) {
      const s = setup({ sessions: () => n });
      const b = s.count();
      s.keys.press("ArrowUp");
      s.advance(0.4);
      expect(s.count() - b).toBe(voices);
    }
  });
  it("is silent when muted", () => {
    const s = setup({ skill: "open" });
    s.feature.setMuted(true);
    const b = s.count();
    s.keys.press("ArrowLeft");
    s.advance(3);
    expect(s.count()).toBe(b);
  });
  it("never drops a string: every string of a four-string or six-string stroke plays at 0.1 s spacing and slower, with a chime still fitting", () => {
    for (const skill of ["chords", "open"] as const)
      for (const voice of ["steel", "nylon", "plain"])
        for (const gap of [0.1, 0.15, 0.3]) {
          const r = hammer(skill, voice, gap);
          expect(r.refused, `${skill} ${voice} at ${gap}s`).toBe(0);
          expect(r.played, `${skill} ${voice} at ${gap}s`).toBeGreaterThanOrEqual(r.presses * 4);
          expect(r.peak, `${skill} ${voice} at ${gap}s`).toBeLessThanOrEqual(SOUND.maxVoices - SOUND.effects.taskComplete.voices.length);
        }
  });
  it("reports refused strings at 70 ms (a rate of 14 presses a second; informational, must stay modest)", () => {
    for (const skill of ["chords", "open"] as const)
      for (const voice of ["steel", "nylon"]) {
        const r = hammer(skill, voice, 0.07);
        const share = r.refused / (r.refused + r.played);
        console.log(`70 ms ${skill} ${voice}: refused ${r.refused} of ${r.refused + r.played} strings`);
        expect(share).toBeLessThan(0.1);
      }
  });
});

// Presses the four arrows in turn, `gap` seconds apart, 40 times; counts what the synth took and refused.
function hammer(skill: Level, voice: string, gap: number) {
  const s = setup({ skill, voice });
  const engine = s.feature.engine;
  const real = engine.playAt.bind(engine);
  let refused = 0;
  let played = 0;
  engine.playAt = (name, options, delay) => {
    const ok = real(name, options, delay);
    if (ok) played++;
    else refused++;
    return ok;
  };
  let peak = 0;
  // Few enough presses that the notes session (6 notes, about 1.5 s each) is still running.
  const presses = Math.min(40, Math.floor(6 / gap));
  for (let i = 0; i < presses; i++) {
    s.keys.press(CODES[i % 4]);
    for (let t = 0; t < gap - 1e-9; t += dt) {
      s.ctx.currentTime += Math.min(dt, gap - t);
      s.game.update(dt, NO_INPUT);
      peak = Math.max(peak, s.ctx.oscillators.filter((o) => (o.stoppedAt ?? 0) > s.ctx.currentTime).length);
    }
  }
  return { refused, played, peak, presses };
}
