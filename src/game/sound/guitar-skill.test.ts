import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { GUITAR_SKILL, SOUND } from "../config";
import { Game } from "../game";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, devGuitarSkill, type KeyEventLike, type Listenable } from "./feature";
import { chordFor, chordNotes, guitarSessions, playKey, seeded, skillLevel, strumNotes, type Dir } from "./guitar-skill";

// Pitch class of a note given semitones from A4: (semis mod 12) with 0 = A. A major = A B C# D E F# G#.
const inKey = (semis: number) => [0, 2, 4, 5, 7, 9, 11].includes((((semis % 12) + 12) % 12));

const dirs: Dir[] = ["left", "down", "up", "right"];
const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

describe("skillLevel", () => {
  it("follows the thresholds, one below and at each", () => {
    expect(skillLevel(0)).toBe("notes");
    expect(skillLevel(3)).toBe("notes");
    expect(skillLevel(4)).toBe("chords");
    expect(skillLevel(11)).toBe("chords");
    expect(skillLevel(12)).toBe("strum");
    expect(skillLevel(29)).toBe("strum");
    expect(skillLevel(30)).toBe("groove");
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
    expect(l.map((x) => x.from)).toEqual([0, 4, 12, 30]);
    for (const x of l) expect(x.name.length).toBeGreaterThan(0);
  });
  it("counts the guitar task, which exists", () => {
    for (const id of GUITAR_SKILL.taskIds) expect(TASKS.some((t) => t.id === id)).toBe(true);
    expect(guitarSessions({ guitar: 5, other: 9 })).toBe(5);
    expect(guitarSessions({})).toBe(0);
  });
});

describe("the data", () => {
  it("has well-formed chords in A major, in range, one per arrow", () => {
    for (const dir of dirs) expect(GUITAR_SKILL.chords[chordFor(dir)]).toBeDefined();
    expect(new Set(dirs.map(chordFor)).size).toBe(4);
    for (const [name, c] of Object.entries(GUITAR_SKILL.chords)) {
      expect(c.voicing.length, name).toBeLessThanOrEqual(4);
      expect(c.voicing[0]).toBe(0);
      for (const n of chordNotes(name)) {
        expect(inKey(n.semis), name).toBe(true);
        expect(n.semis, name).toBeGreaterThanOrEqual(-24); // nothing below A2
      }
    }
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
  it("plays the fixed chord for each arrow at level 2, low to high, in time order", () => {
    const names = { left: "A", down: "D", up: "E", right: "F#m" };
    for (const d of dirs) {
      const notes = playKey("chords", d, 0);
      expect(notes.length).toBeGreaterThanOrEqual(3);
      expect(chordFor(d)).toBe(names[d]);
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i].at).toBeGreaterThan(notes[i - 1].at);
        expect(notes[i].semis).toBeGreaterThan(notes[i - 1].semis);
      }
      expect(notes[0].at).toBe(0);
      expect(notes.every((n) => inKey(n.semis))).toBe(true);
    }
  });
  it("strums at level 3 in key, in time order, within about a bar, with no negative offsets", () => {
    const bar = 8 * (60 / GUITAR_SKILL.tempo / 2);
    for (const d of dirs)
      for (let s = 0; s < GUITAR_SKILL.strums.length; s++) {
        const notes = playKey("strum", d, 0, s, 42);
        expect(notes.length).toBeGreaterThan(4);
        for (let i = 0; i < notes.length; i++) {
          expect(notes[i].at).toBeGreaterThanOrEqual(0);
          expect(notes[i].at).toBeLessThan(bar + 0.2);
          expect(notes[i].gain).toBeGreaterThan(0);
          if (i) expect(notes[i].at).toBeGreaterThanOrEqual(notes[i - 1].at);
          if (notes[i].kind !== "chop") expect(inKey(notes[i].semis)).toBe(true);
        }
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
  it("copes with an odd pattern index", () => {
    expect(playKey("strum", "left", 0, -3, 1).length).toBeGreaterThan(0);
    expect(playKey("strum", "left", 0, 99, 1).length).toBeGreaterThan(0);
  });
});

describe("the dev override", () => {
  it("is read only on the dev server and only for 1 to 4", () => {
    expect(devGuitarSkill("?guitarskill=1", true)).toBe("notes");
    expect(devGuitarSkill("?guitarskill=2", true)).toBe("chords");
    expect(devGuitarSkill("?guitarskill=3", true)).toBe("strum");
    expect(devGuitarSkill("?guitarskill=4", true)).toBe("groove");
    expect(devGuitarSkill("?guitarskill=5", true)).toBeUndefined();
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

function setup(opts: { sessions?: () => number; skill?: "notes" | "chords" | "strum" | "groove"; voice?: string } = {}) {
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

describe("the feature at each level", () => {
  it("plays the single note with no stats wired (level 1, as before)", () => {
    const s = setup();
    const before = s.count();
    s.keys.press("ArrowUp");
    expect(s.count() - before).toBe(SOUND.effects.guitarSteel.voices.filter((v) => "wave" in v).length);
  });
  it("plays the four-string chord at level 2, all within the first moments, at the right pitches", () => {
    const s = setup({ skill: "chords" });
    const before = s.count();
    s.keys.press("ArrowLeft");
    s.advance(0.3);
    const made = s.ctx.oscillators.slice(before);
    expect(made).toHaveLength(GUITAR_SKILL.chords.A.voicing.length);
    const expected = chordNotes("A").map((n) => 440 * 2 ** (n.semis / 12));
    expect(made.map((o) => o.frequency.calls[0].value).sort((a, b) => a - b).map((f) => Math.round(f))).toEqual(expected.map(Math.round));
  });
  it("plays a whole strum bar over time at level 3, and a new press cancels the rest", () => {
    const s = setup({ skill: "strum" });
    const before = s.count();
    s.keys.press("ArrowLeft");
    s.advance(3);
    const full = s.count() - before;
    expect(full).toBeGreaterThan(8);
    const s2 = setup({ skill: "strum" });
    const b2 = s2.count();
    s2.keys.press("ArrowLeft");
    s2.advance(0.35);
    const early = s2.count() - b2;
    s2.keys.press("ArrowDown"); // cancels the rest of the first strum
    s2.advance(3);
    // the first strum stopped early, so the total is less than two full bars
    expect(s2.count() - b2).toBeLessThan(full + full);
    expect(early).toBeLessThan(full);
    expect(s2.count() - b2).toBeGreaterThan(early);
  });
  it("reads the level once per session: a changing count does not change a running session", () => {
    let n = 0;
    const s = setup({ sessions: () => n });
    n = 4;
    const b = s.count();
    s.keys.press("ArrowUp");
    s.advance(0.3);
    expect(s.count() - b).toBe(SOUND.effects.guitarSteel.voices.filter((v) => "wave" in v).length); // still a single note
  });
  it("uses chords for a session that starts with 4 finished sessions", () => {
    const s = setup({ sessions: () => 4 });
    const b = s.count();
    s.keys.press("ArrowUp");
    s.advance(0.3);
    expect(s.count() - b).toBe(4);
  });
  it("is silent when muted and stops nothing else", () => {
    const s = setup({ skill: "strum" });
    s.feature.setMuted(true);
    const b = s.count();
    s.keys.press("ArrowLeft");
    s.advance(3);
    expect(s.count()).toBe(b);
  });
  it("never drops a string: every note of a chord or strum plays at realistic spacings, with a chime still fitting", () => {
    for (const skill of ["chords", "strum"] as const)
      for (const voice of ["steel", "nylon", "plain"])
        for (const gap of [0.1, 0.15, 0.3]) {
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
          for (let i = 0; i < 40; i++) {
            s.keys.press(CODES[i % 4]);
            for (let t = 0; t < gap; t += dt) {
              s.ctx.currentTime += dt;
              s.game.update(dt, NO_INPUT);
              peak = Math.max(peak, s.ctx.oscillators.filter((o) => (o.stoppedAt ?? 0) > s.ctx.currentTime).length);
            }
          }
          expect(refused, `${skill} ${voice} at ${gap}s`).toBe(0);
          expect(played).toBeGreaterThan(40);
          expect(peak, `${skill} ${voice} at ${gap}s`).toBeLessThanOrEqual(SOUND.maxVoices - SOUND.effects.taskComplete.voices.length);
        }
  });
});
