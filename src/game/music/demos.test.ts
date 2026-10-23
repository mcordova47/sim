import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../../render/font";
import { MAKE_TRACKS as M } from "../config";
import { TRACK_FILES } from "./records";
import {
  CHANNELS,
  DRUM_LETTERS,
  cloneGrid,
  countNotes,
  cycleNoteLength,
  emptyGrid,
  gridToTrackText,
  keyRange,
  nameProblem,
  nameTaken,
  noteAt,
  noteName,
  normalizeGrid,
  placeNote,
  readGrid,
  removeNote,
  roomAt,
  trackTextToGrid,
  untitledName,
  type ChannelId,
  type DemoGrid,
} from "./demos";
import { noteFrequency, parseTrack } from "./track";

// A small seeded random number generator, so the property-style checks repeat.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A grid built by random edits through the same functions the editor uses.
function randomGrid(random: () => number, edits = 60): DemoGrid {
  const grid = emptyGrid("Random");
  grid.steps = random() < 0.5 ? 16 : 32;
  grid.tempo = M.tempo.min + Math.floor(random() * (M.tempo.max - M.tempo.min + 1));
  for (let i = 0; i < edits; i++) {
    const id = CHANNELS[Math.floor(random() * 3)];
    const { low, high } = keyRange(id);
    const step = Math.floor(random() * grid.steps);
    const key = low + Math.floor(random() * (high - low + 1));
    if (random() < 0.2) removeNote(grid, id, step);
    else placeNote(grid, id, step, key, M.lengths[Math.floor(random() * 3)]);
    if (random() < 0.05) grid.steps = random() < 0.5 ? 16 : 32;
  }
  return grid;
}

describe("note names", () => {
  it("names MIDI numbers the way the track format does", () => {
    expect(noteName(60)).toBe("C4");
    expect(noteName(61)).toBe("C#4");
    expect(noteName(36)).toBe("C2");
    expect(noteName(83)).toBe("B5");
    for (let midi = 24; midi <= 96; midi++) {
      const freq = noteFrequency(noteName(midi))!;
      expect(Math.round(69 + 12 * Math.log2(freq / 440))).toBe(midi);
    }
  });
});

describe("names", () => {
  it("accepts plain names and refuses the rest", () => {
    expect(nameProblem("Rainy Tuesday")).toBeNull();
    expect(nameProblem("A-side (take 2), ok?")).toBeNull();
    expect(nameProblem("")).not.toBeNull();
    expect(nameProblem("    ")).not.toBeNull();
    expect(nameProblem("x".repeat(M.nameMax))).toBeNull();
    expect(nameProblem("x".repeat(M.nameMax + 1))).not.toBeNull();
    for (const bad of ["a#b", "a:b", "[a]", "tab\there", "line\nbreak", "café", "“quote”"]) {
      expect(nameProblem(bad), bad).not.toBeNull();
    }
  });

  it("only allows characters the pixel font can draw", () => {
    for (let code = 0; code < 0x250; code++) {
      const ch = String.fromCharCode(code);
      if (M.nameChars.test(ch)) expect(unsupportedChars(ch), JSON.stringify(ch)).toEqual([]);
    }
  });

  it("compares names without caring about case or edge spaces", () => {
    expect(nameTaken("morning ", ["Morning", "Other"])).toBe(true);
    expect(nameTaken("Evening", ["Morning"])).toBe(false);
  });

  it("starts new tracks as Untitled N, the first number free", () => {
    expect(untitledName([])).toBe("Untitled 1");
    expect(untitledName(["Untitled 1", "untitled 2", "Other"])).toBe("Untitled 3");
    expect(untitledName(["Untitled 2"])).toBe("Untitled 1");
  });
});

describe("editing the grid", () => {
  it("places and removes notes, one at a time per channel", () => {
    const g = emptyGrid("T");
    expect(placeNote(g, "melody", 0, 60, 1)).toBe(true);
    expect(noteAt(g, "melody", 0)).toMatchObject({ key: 60, length: 1 });
    expect(removeNote(g, "melody", 0)).toBe(true);
    expect(removeNote(g, "melody", 0)).toBe(false);
    expect(g.channels.melody).toEqual([]);
  });

  it("refuses places outside the grid and keys outside the channel's range", () => {
    const g = emptyGrid("T");
    expect(placeNote(g, "melody", -1, 60, 1)).toBe(false);
    expect(placeNote(g, "melody", 16, 60, 1)).toBe(false);
    expect(placeNote(g, "melody", 1.5, 60, 1)).toBe(false);
    expect(placeNote(g, "melody", 0, 47, 1)).toBe(false);
    expect(placeNote(g, "melody", 0, 84, 1)).toBe(false);
    expect(placeNote(g, "bass", 0, 60, 1)).toBe(false);
    expect(placeNote(g, "beat", 0, 3, 1)).toBe(false);
    expect(placeNote(g, "melody", 0, Number.NaN, 1)).toBe(false);
    expect(countNotes(g)).toBe(0);
  });

  it("holds a note for several steps and cuts a new one short at the next note and at the end", () => {
    const g = emptyGrid("T");
    placeNote(g, "melody", 4, 64, 1);
    placeNote(g, "melody", 2, 60, 4);
    expect(noteAt(g, "melody", 2)!.length).toBe(2);
    placeNote(g, "melody", 14, 60, 4);
    expect(noteAt(g, "melody", 14)!.length).toBe(2);
    expect(roomAt(g, "melody", 8)).toBe(6);
  });

  it("covers the steps a held note runs through, so one press clears it", () => {
    const g = emptyGrid("T");
    placeNote(g, "bass", 0, 36, 4);
    expect(noteAt(g, "bass", 3)).toBeDefined();
    expect(noteAt(g, "bass", 4)).toBeUndefined();
    expect(removeNote(g, "bass", 2)).toBe(true);
    expect(g.channels.bass).toEqual([]);
  });

  it("makes a drum hit one step, whatever length is asked", () => {
    const g = emptyGrid("T");
    placeNote(g, "beat", 0, 1, 4);
    expect(g.channels.beat).toEqual([{ step: 0, key: 1, length: 1 }]);
    expect(cycleNoteLength(g, "beat", 0)).toBeNull();
  });

  it("cycles a note's length 1, 2, 4, 1, skipping what does not fit", () => {
    const g = emptyGrid("T");
    placeNote(g, "melody", 0, 60, 1);
    expect([1, 2, 3, 4].map(() => cycleNoteLength(g, "melody", 0))).toEqual([2, 4, 1, 2]);
    placeNote(g, "melody", 3, 62, 1);
    // Three steps free: 2, then 4 does not fit so back to 1, then 2.
    expect([cycleNoteLength(g, "melody", 0), cycleNoteLength(g, "melody", 0), cycleNoteLength(g, "melody", 0)]).toEqual([1, 2, 1]);
    expect(cycleNoteLength(g, "melody", 10)).toBeNull();
  });

  it("never ends up with overlapping or out of order notes, whatever the edits", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = randomGrid(rng(seed), 120);
      for (const id of CHANNELS) {
        const notes = g.channels[id];
        for (let i = 1; i < notes.length; i++) {
          expect(notes[i].step, `seed ${seed}`).toBeGreaterThanOrEqual(notes[i - 1].step + notes[i - 1].length);
        }
      }
    }
  });
});

describe("normalizing", () => {
  it("drops notes past the end, cuts long ones and sorts, without changing its input", () => {
    const g = emptyGrid("T");
    g.steps = 8;
    g.channels.melody = [
      { step: 10, key: 60, length: 1 },
      { step: 6, key: 62, length: 4 },
      { step: 0, key: 60, length: 4 },
      { step: 0, key: 61, length: 1 },
      { step: 2, key: 64, length: 9 },
    ];
    const copy = cloneGrid(g);
    const n = normalizeGrid(g);
    expect(g).toEqual(copy);
    expect(n.channels.melody).toEqual([
      { step: 0, key: 60, length: 2 },
      { step: 2, key: 64, length: 4 },
      { step: 6, key: 62, length: 2 },
    ]);
  });

  it("puts tempo and steps in range and drops bad notes", () => {
    const g = emptyGrid("T");
    g.tempo = 9999;
    g.steps = 500;
    g.channels.melody = [{ step: 0, key: 10, length: 1 }, { step: 1.5, key: 60, length: 1 }, { step: 2, key: 60, length: Number.NaN }];
    const n = normalizeGrid(g);
    expect(n.tempo).toBe(M.tempo.max);
    expect(n.steps).toBe(M.steps.max);
    expect(n.channels.melody).toEqual([]);
    g.tempo = Number.NaN;
    g.steps = Number.NaN;
    expect(normalizeGrid(g)).toMatchObject({ tempo: M.tempo.default, steps: M.steps.default });
  });
});

describe("the editor's output always parses with the track parser", () => {
  it("holds for random grids: 16 and 32 steps, every channel, the edge pitches, empty channels", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = randomGrid(rng(seed), 1 + (seed % 80));
      // Put notes on the very edges too.
      placeNote(g, "melody", 0, M.melody.low, 1);
      placeNote(g, "melody", g.steps - 1, M.melody.high, 1);
      placeNote(g, "bass", 0, M.bass.low, 4);
      placeNote(g, "bass", g.steps - 1, M.bass.high, 1);
      const text = gridToTrackText(g);
      const track = parseTrack(text, `seed ${seed}`);
      expect(track.title).toBe("Random");
      expect(track.tempo).toBe(normalizeGrid(g).tempo);
      expect(track.channels.map((c) => c.name)).toEqual(["melody", "bass", "beat"]);
      // Every channel is exactly as long as the track, so the loop is clean.
      expect(track.beats).toBe(normalizeGrid(g).steps * M.stepBeats);
      expect(text.length).toBeLessThanOrEqual(M.maxTextBytes);
    }
  });

  it("holds with only one channel used, and for 1 step", () => {
    for (const id of CHANNELS) {
      const g = emptyGrid("One");
      g.steps = 1;
      placeNote(g, id, 0, keyRange(id).low, 1);
      expect(() => parseTrack(gridToTrackText(g))).not.toThrow();
    }
  });

  it("is refused by the parser only when there are no notes (saving checks for that first)", () => {
    expect(() => parseTrack(gridToTrackText(emptyGrid("Empty")))).toThrow(/no notes/);
  });

  it("round trips: grid to text to grid is the same grid", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = randomGrid(rng(seed * 7), 5 + (seed % 70));
      if (countNotes(g) === 0) continue;
      const back = trackTextToGrid(gridToTrackText(g));
      expect(back.ok, `seed ${seed}`).toBe(true);
      if (!back.ok) continue;
      // A steps count that ends in rests on every channel reads back the same.
      expect(back.grid, `seed ${seed}`).toEqual(normalizeGrid(g));
      // And text to grid to text is stable.
      expect(gridToTrackText(back.grid)).toBe(gridToTrackText(g));
    }
  });

  it("writes bar marks every 8 steps and nothing a hand reader would trip on", () => {
    const g = emptyGrid("Bars");
    placeNote(g, "melody", 0, 60, 1);
    const lines = gridToTrackText(g).split("\n");
    expect(lines[0]).toBe("title: Bars");
    expect(lines[1]).toBe("tempo: 100");
    expect(lines[2]).toBe("[melody square 0.6]");
    expect(lines[3]).toBe("C4:0.5 R:3.5 | R:4");
  });
});

describe("importing", () => {
  const ok = (text: string) => {
    const r = trackTextToGrid(text);
    if (!r.ok) throw new Error(r.message);
    return r.grid;
  };
  const bad = (text: string) => {
    const r = trackTextToGrid(text);
    expect(r.ok, text).toBe(false);
    return r.ok ? "" : r.message;
  };

  it("reads a track the editor can show", () => {
    const g = ok("title: Hi\ntempo: 90\n[a sine]\nC4:1 E4:1 G4:2\n[b triangle]\nC2:2\n[d drums]\nK:1 H:1 S:1 H:1");
    expect(g.title).toBe("Hi");
    expect(g.tempo).toBe(90);
    expect(g.steps).toBe(8);
    expect(g.channels.melody.map((n) => n.key)).toEqual([60, 64, 67]);
    expect(g.channels.bass).toEqual([{ step: 0, key: 36, length: 4 }]);
    expect(g.channels.beat.map((n) => n.key)).toEqual([0, 2, 1, 2]);
    expect(g.channels.beat.every((n) => n.length === 1)).toBe(true);
  });

  it("puts the lower of two tunes in the bass, whatever order they are in", () => {
    const g = ok("title: Hi\n[low triangle]\nC3:2\n[high square]\nC5:2");
    expect(g.channels.melody[0].key).toBe(72);
    expect(g.channels.bass[0].key).toBe(48);
    const h = ok("title: Hi\n[high square]\nC5:2\n[low triangle]\nC3:2");
    expect(h).toEqual(g);
  });

  it("puts a single tune in the melody, or the bass if only the bass range holds it", () => {
    expect(ok("title: Hi\n[a square]\nC4:1").channels.melody).toHaveLength(1);
    expect(ok("title: Hi\n[a square]\nC2:1").channels.bass).toHaveLength(1);
  });

  it("ignores a channel with only rests, and pads shorter channels to the longest", () => {
    const g = ok("title: Hi\n[a square]\nC4:1\n[b triangle]\nR:4\n[c square]\nC3:1 C3:1 C3:1 C3:1");
    expect(g.steps).toBe(8);
    expect(g.channels.melody.length + g.channels.bass.length).toBe(5);
  });

  it("gives every placeholder record that fits the editor a grid that writes back to text the parser accepts", () => {
    for (const [path, text] of Object.entries(TRACK_FILES)) {
      const r = trackTextToGrid(text, path);
      if (!r.ok) continue;
      expect(() => parseTrack(gridToTrackText(r.grid)), path).not.toThrow();
    }
  });

  it("rejects what the editor cannot show, with a plain reason", () => {
    expect(bad("title: Hi\n[a square]\nC4:0.25")).toMatch(/half beat/);
    expect(bad("title: Hi\n[a square]\nR:0.25 C4:1")).toMatch(/half beat/);
    expect(bad("title: Hi\n[a square]\nC4:3")).toMatch(/too long/i);
    expect(bad("title: Hi\n[a square]\nC4:1 R:32")).toMatch(/Too long for the editor/);
    expect(bad("title: Hi\n[a square]\nC6:1")).toMatch(/range/);
    expect(bad("title: Hi\n[a square]\nC1:1")).toMatch(/range/);
    expect(bad("title: Hi\n[a square]\nC4:1\n[b square]\nC4:1\n[c square]\nC4:1")).toMatch(/Too many channels/);
    expect(bad("title: Hi\n[a drums]\nK:1\n[b drums]\nS:1")).toMatch(/Too many channels/);
    expect(bad("title: Hi\ntempo: 40\n[a square]\nC4:1")).toMatch(/tempo/i);
    expect(bad("title: Hi\ntempo: 100.5\n[a square]\nC4:1")).toMatch(/tempo/i);
    expect(bad(`title: ${"x".repeat(25)}\n[a square]\nC4:1`)).toMatch(/at most/);
    expect(bad("title: a#b\n[a square]\nC4:1")).toMatch(/character/);
  });

  it("rejects text that is not a track, with the parser's message and line", () => {
    expect(bad("")).toMatch(/title/);
    expect(bad("hello")).toMatch(/line 1/);
    expect(bad("title: Hi\n[a square]\nH9:1")).toMatch(/line 3/);
    expect(bad("title: Hi")).toMatch(/no notes/);
  });

  it("rejects text over the size limit", () => {
    expect(bad(`title: Hi\n[a square]\n${"C4:0.5 ".repeat(400)}`)).toMatch(/too big/i);
    expect(bad("x".repeat(100000))).toMatch(/too big/i);
  });

  it("survives random garbage without throwing", () => {
    const random = rng(99);
    const pieces = ["title:", "tempo:", "[a square]", "[b drums]", "C4:1", "K:1", "R:1", "|", "#", "\n", " ", "x", ":", "[", "]", "9", "-1", "C4:", ":2", "\u0000", "é"];
    for (let i = 0; i < 500; i++) {
      let text = "";
      for (let j = 0; j < 1 + Math.floor(random() * 30); j++) text += pieces[Math.floor(random() * pieces.length)];
      const r = trackTextToGrid(text);
      if (r.ok) expect(() => parseTrack(gridToTrackText(r.grid))).not.toThrow();
    }
  });
});

describe("reading a draft from storage", () => {
  it("keeps what is usable and cleans the rest", () => {
    const g = readGrid({
      title: "Hi#é there",
      tempo: 9999,
      steps: 16,
      channels: {
        melody: [{ step: 0, key: 60, length: 9 }, { step: 0, key: 61, length: 1 }, { step: 1, key: 5, length: 1 }, "x", null, { step: 2.5, key: 60, length: 1 }],
        bass: "nope",
        beat: [{ step: 3, key: 2, length: 4 }],
      },
    })!;
    expect(g.title).toBe("Hi there");
    expect(g.tempo).toBe(M.tempo.max);
    expect(g.channels.melody).toEqual([{ step: 0, key: 60, length: 4 }]);
    expect(g.channels.bass).toEqual([]);
    expect(g.channels.beat).toEqual([{ step: 3, key: 2, length: 1 }]);
  });

  it("keeps notes past the end of a shortened track, so lengthening brings them back", () => {
    const g = emptyGrid("T");
    g.steps = 32;
    placeNote(g, "melody", 20, 60, 1);
    g.steps = 16;
    const back = readGrid(JSON.parse(JSON.stringify(g)))!;
    expect(back.channels.melody).toHaveLength(1);
    expect(countNotes(back)).toBe(0);
    back.steps = 32;
    expect(countNotes(back)).toBe(1);
  });

  it("refuses things that are not grids", () => {
    for (const bad of [null, 5, "x", [], {}, { title: 1, tempo: 1, steps: 1, channels: {} }, { title: "a", tempo: "x", steps: 1, channels: {} }, { title: "a", tempo: 1, steps: 1 }]) {
      expect(readGrid(bad)).toBeNull();
    }
  });

  it("uses a default name when nothing is left of the title", () => {
    expect(readGrid({ title: "###", tempo: 100, steps: 16, channels: {} })!.title).toBe("Untitled");
  });
});

it("types of the drums match the parser's", () => {
  expect([...DRUM_LETTERS]).toEqual(["K", "S", "H"]);
  const id: ChannelId = "beat";
  expect(keyRange(id)).toEqual({ low: 0, high: 2 });
});
