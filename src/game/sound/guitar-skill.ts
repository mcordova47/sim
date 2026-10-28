import { GUITAR_SKILL } from "../config";

// The guitar skill's pure parts (issue 114a): no audio, no clock, no DOM. A level is a
// function from an arrow to a list of timed notes, so it can be tested without a speaker.

export type Dir = "up" | "down" | "left" | "right";
export type Level = (typeof GUITAR_SKILL.levels)[number]["id"];
export type Kind = "first" | "string" | "chop";
// `semis` from A4 (0 = 440 Hz); `at` seconds after the press; `gain` a multiple of the voice's own.
export interface Note {
  semis: number;
  at: number;
  gain: number;
  kind: Kind;
}

// The highest level whose threshold is at most `sessions` (junk counts as none).
export function skillLevel(sessions: number, levels = GUITAR_SKILL.levels): Level {
  const n = Number.isFinite(sessions) ? Math.floor(sessions) : 0;
  let found = levels[0].id;
  for (const level of levels) if (n >= level.from) found = level.id;
  return found;
}

// Finished guitar sessions, from the per-task counts.
export function guitarSessions(taskCounts: Record<string, number>, ids: readonly string[] = GUITAR_SKILL.taskIds): number {
  return ids.reduce((sum, id) => sum + (taskCounts[id] ?? 0), 0);
}

// The definition of a level.
export function levelDef(level: Level) {
  return GUITAR_SKILL.levels.find((l) => l.id === level) ?? GUITAR_SKILL.levels[0];
}

// The chord an arrow plays at a level (the plain chord set by default).
export function chordFor(dir: Dir, level: Level = "chords"): string {
  return levelDef(level).chords?.[dir].name ?? "";
}

// Small seeded random numbers (mulberry32), so a strum is the same for the same seed.
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const strings = (chord: string): number[] => {
  const c = GUITAR_SKILL.chords[chord];
  return c.voicing.map((i) => c.root + i);
};

export type Stroke = "down" | "up";
export interface Voicing {
  root: number;
  voicing: number[];
}

// One stroke over a chord: a down stroke goes low to high, an up stroke high to low with
// shorter spacing and a bit quieter. Each string is its own pick (`first`, with the tick), and
// the last string to sound is a little quieter than the first (a ramp). Nothing plays after it.
export function strokeNotes(chord: Voicing, stroke: Stroke = "down"): Note[] {
  const { down, up, ramp } = GUITAR_SKILL;
  const n = chord.voicing.length;
  const order = chord.voicing.map((_, i) => i);
  if (stroke === "up") order.reverse();
  const spacing = stroke === "down" ? down.spacing : up.spacing;
  const base = stroke === "down" ? 1 : up.gain;
  return order.map((i, k) => ({
    semis: chord.root + chord.voicing[i],
    at: k * spacing,
    gain: base * (1 - (n > 1 ? (ramp * k) / (n - 1) : 0)),
    kind: "first" as Kind,
  }));
}

// A plain chord by name, down stroke.
export function chordNotes(chord: string): Note[] {
  return strokeNotes(GUITAR_SKILL.chords[chord], "down");
}

export const eighth = (tempo = GUITAR_SKILL.tempo) => 60 / tempo / 2;

// A one-bar strum on a chord. Slot 0 is the press itself (no wobble); later slots get a lazy
// swing on the odd ones and a small seeded wobble in time and loudness. Notes are in time order.
export function strumNotes(chord: string, pattern: string, seed = 0, tempo = GUITAR_SKILL.tempo, swing = GUITAR_SKILL.swing): Note[] {
  const rand = seeded(seed);
  const all = strings(chord);
  const { humanise, up, down } = GUITAR_SKILL;
  const out: Note[] = [];
  [...pattern].forEach((ch, slot) => {
    const wobbleT = slot === 0 ? 0 : (rand() * 2 - 1) * humanise.time;
    const wobbleG = 1 + (rand() * 2 - 1) * humanise.gain;
    const start = Math.max(0, slot * eighth(tempo) + (slot % 2 === 1 ? swing * eighth(tempo) : 0) + wobbleT);
    if (ch === "D") {
      all.forEach((semis, i) => out.push({ semis, at: start + i * down.spacing, gain: (i === 0 ? GUITAR_SKILL.rootGain : GUITAR_SKILL.otherGain) * wobbleG, kind: i === 0 ? "first" : "string" }));
    } else if (ch === "U") {
      all
        .slice(-up.strings)
        .reverse()
        .forEach((semis, i) => out.push({ semis, at: start + i * up.spacing, gain: up.gain * wobbleG, kind: i === 0 ? "first" : "string" }));
    } else if (ch === "x") {
      out.push({ semis: 0, at: start, gain: GUITAR_SKILL.chopGain * wobbleG, kind: "chop" });
    }
  });
  return out.sort((a, b) => a.at - b.at);
}

// What an arrow plays at a level, relative to the press. Level 1 is the notes game's own single
// note. Every higher level is one stroke over the arrow's chord at that level (`stroke` is
// given by the caller, who alternates down and up). Nothing plays after the stroke. The groove
// level plays like the one before it until the groove is built (issue 114b).
export function playKey(level: Level, dir: Dir, noteSemis: number, stroke: Stroke = "down"): Note[] {
  const chords = levelDef(level).chords;
  if (!chords) return [{ semis: noteSemis, at: 0, gain: 1, kind: "first" }];
  return strokeNotes(chords[dir], stroke);
}
