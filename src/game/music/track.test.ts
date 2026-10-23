import { describe, expect, it } from "vitest";
import { noteFrequency, parseBeats, parseTrack, TrackError } from "./track";

const GOOD = `
# a comment
title: Test Tune
note: Short.
tempo: 120

[lead square 0.5]
C4:1 E4:0.5 R:1/2 | G4
[beat drums]
K:1 H:.5 S:0.5
`;

describe("noteFrequency", () => {
  it("gives concert pitch for A4 and middle C", () => {
    expect(noteFrequency("A4")).toBeCloseTo(440, 5);
    expect(noteFrequency("C4")).toBeCloseTo(261.626, 2);
  });
  it("understands sharps, flats and lower case", () => {
    expect(noteFrequency("F#3")).toBeCloseTo(noteFrequency("Gb3")!, 6);
    expect(noteFrequency("a4")).toBeCloseTo(440, 5);
    expect(noteFrequency("Cb4")).toBeCloseTo(noteFrequency("B3")!, 6);
  });
  it("rejects things that are not notes", () => {
    for (const bad of ["H4", "C", "C44", "4C", "", "R", "C##4"]) expect(noteFrequency(bad)).toBeNull();
  });
});

describe("parseBeats", () => {
  it("reads whole numbers, decimals and fractions", () => {
    expect(parseBeats("2")).toBe(2);
    expect(parseBeats("0.5")).toBe(0.5);
    expect(parseBeats(".25")).toBe(0.25);
    expect(parseBeats("1/4")).toBe(0.25);
    expect(parseBeats("3/2")).toBe(1.5);
  });
  it("refuses zero, negatives, junk, division by zero and absurd lengths", () => {
    for (const bad of ["0", "-1", "x", "1/0", "", "1.2.3", "0/4", "65", "Infinity", "1e3"]) expect(parseBeats(bad)).toBeNull();
  });
});

describe("parseTrack", () => {
  it("reads the settings and the channels", () => {
    const t = parseTrack(GOOD, "test.track", "test");
    expect(t).toMatchObject({ id: "test", title: "Test Tune", note: "Short.", tempo: 120 });
    expect(t.channels.map((c) => [c.name, c.wave, c.volume])).toEqual([["lead", "square", 0.5], ["beat", "drums", 1]]);
  });

  it("places notes by their lengths, skipping rests and bar lines", () => {
    const [lead, beat] = parseTrack(GOOD).channels;
    expect(lead.notes.map((n) => [n.start, n.length])).toEqual([[0, 1], [1, 0.5], [2, 1]]);
    expect(lead.notes[2].freq).toBeCloseTo(392, 0);
    expect(beat.notes.map((n) => [n.drum, n.start, n.length])).toEqual([["K", 0, 1], ["H", 1, 0.5], ["S", 1.5, 0.5]]);
  });

  it("makes the track as long as its longest channel and defaults the length to one beat", () => {
    expect(parseTrack(GOOD).beats).toBe(3);
  });

  it("defaults the tempo and the volume", () => {
    const t = parseTrack("title: T\n[a sine]\nC4");
    expect(t.tempo).toBe(100);
    expect(t.channels[0].volume).toBe(1);
    expect(t.note).toBe("");
  });

  it("does not take the # of a sharp for a comment", () => {
    expect(parseTrack("title: T\n[a sine]\nF#4:1 # ok\nG4").channels[0].notes).toHaveLength(2);
  });

  it("accepts Windows line endings and blank lines", () => {
    expect(parseTrack("title: T\r\n\r\n[a sine]\r\nC4:1\r\n").beats).toBe(1);
  });

  it("continues a channel over several lines", () => {
    const t = parseTrack("title: T\n[a sine]\nC4:1\nD4:1");
    expect(t.channels[0].notes.map((n) => n.start)).toEqual([0, 1]);
  });

  it.each([
    ["no title", "[a sine]\nC4", /title/],
    ["no notes", "title: T\n[a sine]\nR:1", /no notes/],
    ["notes before a channel", "title: T\nC4:1", /line 2.*channel/],
    ["a bad note", "title: T\n[a sine]\nC4 H4", /line 3.*"H4"/],
    ["a bad length", "title: T\n[a sine]\nC4:x", /line 3.*"C4:x"/],
    ["a zero length", "title: T\n[a sine]\nC4:0", /line 3/],
    ["a bad wave", "title: T\n[a banjo]\nC4", /wave/],
    ["a missing wave", "title: T\n[a]\nC4", /wave/],
    ["a bad volume", "title: T\n[a sine 2]\nC4", /volume/],
    ["a repeated channel name", "title: T\n[a sine]\nC4\n[a sine]\nC4", /two channels/],
    ["a bad drum", "title: T\n[d drums]\nX:1", /drum/],
    ["a bad tempo", "title: T\ntempo: 9000\n[a sine]\nC4", /tempo/],
    ["a tempo that is not a number", "title: T\ntempo: fast\n[a sine]\nC4", /tempo/],
    ["an unknown setting", "title: T\nkey: C\n[a sine]\nC4", /unknown setting/],
    ["a repeated setting", "title: T\ntitle: U\n[a sine]\nC4", /twice/],
    ["empty text", "", /title/],
  ])("explains %s", (_name, text, message) => {
    let error: unknown;
    try {
      parseTrack(text, "x.track");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TrackError);
    expect((error as Error).message).toMatch(/^x\.track/);
    expect((error as Error).message).toMatch(message);
  });

  it("does not take a note letter for a drum or a drum letter for a note in the wrong channel", () => {
    expect(() => parseTrack("title: T\n[a square]\nK:1")).toThrow(/not a note/);
  });
});

const DOCS = import.meta.glob("../../../docs/music.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("docs/music.md", () => {
  it("has a worked example that parses, so Marc can copy it", () => {
    const text = Object.values(DOCS)[0];
    const example = /```\n([\s\S]*?)```/.exec(text)![1];
    const track = parseTrack(example, "docs/music.md");
    expect(track.title).toBe("My First Tune");
    expect(track.tempo).toBe(100);
    expect(track.channels.map((c) => c.name)).toEqual(["melody", "bass", "beat"]);
    expect(track.beats).toBe(16);
    for (const c of track.channels) expect(Math.max(...c.notes.map((n) => n.start + n.length))).toBeLessThanOrEqual(16);
  });
});
