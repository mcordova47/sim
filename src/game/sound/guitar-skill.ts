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

export function chordFor(dir: Dir): string {
  return GUITAR_SKILL.arrows[dir];
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

// One chord, rolled from the low string to the high one; the root a little louder.
export function chordNotes(chord: string): Note[] {
  const c = GUITAR_SKILL.chords[chord];
  return strings(chord).map((semis, i) => ({
    semis,
    at: i * GUITAR_SKILL.roll,
    gain: c.voicing[i] === 0 ? GUITAR_SKILL.rootGain : GUITAR_SKILL.otherGain,
    kind: i === 0 ? "first" : "string",
  }));
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

// What an arrow plays at a level, relative to the press. Level 1 is the notes game's own
// single note. The groove level plays as strumming until the groove is built (issue 114b).
export function playKey(level: Level, dir: Dir, noteSemis: number, strumIndex = 0, seed = 0): Note[] {
  if (level === "notes") return [{ semis: noteSemis, at: 0, gain: 1, kind: "first" }];
  const chord = chordFor(dir);
  if (level === "chords") return chordNotes(chord);
  const patterns = GUITAR_SKILL.strums;
  return strumNotes(chord, patterns[((strumIndex % patterns.length) + patterns.length) % patterns.length], seed);
}
