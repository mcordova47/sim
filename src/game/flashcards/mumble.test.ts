import { describe, expect, it } from "vitest";
import { FLASHCARDS as F } from "../config";
import { Mumble, mumbleNotes } from "./mumble";

describe("mumbleNotes", () => {
  it("is one note per letter, with rests for spaces and marks", () => {
    const notes = mumbleNotes("a b, c");
    expect(notes).toHaveLength(6);
    expect(notes.map((n) => n === null)).toEqual([false, true, false, true, true, false]);
  });

  it("is the same every time, and an accented letter sounds like its plain one", () => {
    expect(mumbleNotes("canción")).toEqual(mumbleNotes("canción"));
    expect(mumbleNotes("é")).toEqual(mumbleNotes("e"));
    expect(mumbleNotes("ñ")).toEqual(mumbleNotes("n"));
    expect(mumbleNotes("CASA")).toEqual(mumbleNotes("casa"));
  });

  it("gives every letter a pitch, and vowels differ from each other", () => {
    for (const ch of "abcdefghijklmnopqrstuvwxyz") expect(mumbleNotes(ch)[0], ch).toBeGreaterThan(0);
    expect(new Set(mumbleNotes("aeiou")).size).toBe(5);
  });

  it("is cut at the longest run and survives odd input", () => {
    expect(mumbleNotes("a".repeat(500))).toHaveLength(F.mumble.maxChars);
    expect(mumbleNotes("")).toEqual([]);
    expect(mumbleNotes("¿?!  123")).toEqual(Array(8).fill(null));
  });
});

describe("Mumble", () => {
  it("plays the letters over time at the configured rate, skipping rests", () => {
    const got: number[] = [];
    const m = new Mumble((s) => got.push(s.pitch));
    m.say("a a");
    expect(m.speaking).toBe(true);
    m.update(0);
    expect(got).toHaveLength(1);
    m.update(2 / F.mumble.lettersPerSecond + 0.001);
    expect(got).toHaveLength(2);
    expect(m.speaking).toBe(false);
  });

  it("a new say replaces the old, and stop silences it", () => {
    const got: number[] = [];
    const m = new Mumble((s) => got.push(s.pitch));
    m.say("aaaaaaaa");
    m.update(0.2);
    const heard = got.length;
    m.say("e");
    m.update(0);
    expect(got.length).toBe(heard + 1);
    m.say("aaaa");
    m.stop();
    m.update(5);
    expect(got.length).toBe(heard + 1);
    expect(m.speaking).toBe(false);
  });

  it("does nothing with no text, and a huge step plays each letter once", () => {
    const got: number[] = [];
    const m = new Mumble((s) => got.push(s.pitch));
    m.update(1);
    m.say("hola");
    m.update(1e6);
    expect(got).toHaveLength(4);
  });
});
