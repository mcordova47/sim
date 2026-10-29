import { describe, expect, it } from "vitest";
import { SAMPLE_TEXT, applyTweaks, channelRows, configLines, copyBack, parseLab, playable, selectSection, type Tweaks } from "./lab-text";

const T = (over: Partial<Tweaks> = {}): Tweaks => ({ gains: {}, muted: [], ...over });
const ok = (text: string) => {
  const r = parseLab(text);
  if (!r.ok) throw new Error(r.error);
  return r.lab;
};

describe("parseLab", () => {
  it("reads a plain .track as the loop, with no intro", () => {
    const lab = ok("title: T\ntempo: 90\n[a square 0.5]\nC4:1 E4:1\n");
    expect(lab.intro).toBeNull();
    expect(lab.loop.tempo).toBe(90);
    expect(lab.loop.beats).toBe(2);
  });

  it("splits an intro and a loop that share the title and tempo", () => {
    const lab = ok(SAMPLE_TEXT);
    expect(lab.intro?.title).toBe("Lab Sample");
    expect(lab.intro?.tempo).toBe(120);
    expect(lab.loop.tempo).toBe(120);
    expect(lab.intro?.beats).toBe(8);
    expect(lab.loop.beats).toBe(16);
    expect(lab.intro?.channels.map((c) => c.name)).toEqual(["melody", "bass", "beat"]);
  });

  it("accepts the loop before the intro and markers in any case", () => {
    const lab = ok("title: T\n== LOOP ==\n[a square]\nC4:2\n== Intro ==\n[a square]\nG4:1\n");
    expect(lab.loop.beats).toBe(2);
    expect(lab.intro?.beats).toBe(1);
  });

  it("names the right line of a mistake in either section", () => {
    const r = parseLab("title: T\n== intro ==\n[a square]\nC4:1\n== loop ==\n[a square]\nC4:1 H9:1\n");
    expect(r).toEqual({ ok: false, error: expect.stringContaining("loop section, line 7") });
    const r2 = parseLab("title: T\n== intro ==\n[a square]\nZZ:1\n== loop ==\n[a square]\nC4:1\n");
    expect(r2).toEqual({ ok: false, error: expect.stringContaining("intro section, line 4") });
  });

  it("refuses channels above the first marker and a repeated marker", () => {
    const above = parseLab("title: T\n[a square]\nC4:1\n== loop ==\n[a square]\nC4:1\n");
    expect(above.ok).toBe(false);
    expect(!above.ok && above.error).toContain("line 2");
    const twice = parseLab("title: T\n== loop ==\n[a square]\nC4:1\n== loop ==\n[a square]\nC4:1\n");
    expect(!twice.ok && twice.error).toContain("line 5");
  });

  it("refuses an intro with no notes, and a missing title, without throwing", () => {
    expect(parseLab("title: T\n== intro ==\n== loop ==\n[a square]\nC4:1\n").ok).toBe(false);
    expect(parseLab("[a square]\nC4:1\n").ok).toBe(false);
    expect(parseLab("").ok).toBe(false);
  });

  it("ignores a marker inside a comment", () => {
    const lab = ok("title: T\n[a square]\nC4:1 # == intro ==\n");
    expect(lab.intro).toBeNull();
  });
});

describe("selectSection", () => {
  const lab = ok(SAMPLE_TEXT);
  it("plays intro then loop, the loop alone, or the intro alone", () => {
    expect(selectSection(lab, "both")).toEqual({ intro: lab.intro, loop: lab.loop });
    expect(selectSection(lab, "loop")).toEqual({ intro: null, loop: lab.loop });
    expect(selectSection(lab, "intro")).toEqual({ intro: null, loop: lab.intro });
  });
  it("falls back to the loop when there is no intro to play alone", () => {
    const plain = ok("title: T\n[a square]\nC4:1\n");
    expect(selectSection(plain, "intro")).toEqual({ intro: null, loop: plain.loop });
  });
});

describe("applyTweaks and playable", () => {
  const lab = ok(SAMPLE_TEXT);
  it("overrides tempo (clamped) and one channel's volume in one section only", () => {
    const p = playable(lab, "both", T({ tempo: 400, gains: { "intro.bass": 0.2 } }));
    expect(p.loop.tempo).toBe(300);
    expect(p.intro?.tempo).toBe(300);
    expect(p.intro?.channels.find((c) => c.name === "bass")?.volume).toBe(0.2);
    expect(p.loop.channels.find((c) => c.name === "bass")?.volume).toBe(0.8);
  });
  it("mutes a channel by taking it out but keeps the track's length", () => {
    const t = applyTweaks(lab.loop, "loop", T({ muted: ["loop.melody", "loop.bass", "loop.beat"] }));
    expect(t.channels).toEqual([]);
    expect(t.beats).toBe(lab.loop.beats);
  });
  it("intro-only mode uses the intro's slider keys for the repeating track", () => {
    const p = playable(lab, "intro", T({ gains: { "intro.melody": 0.1, "loop.melody": 0.9 } }));
    expect(p.loop.channels.find((c) => c.name === "melody")?.volume).toBe(0.1);
  });
  it("does not change its input", () => {
    const before = JSON.stringify(lab);
    playable(lab, "both", T({ tempo: 70, gains: { "loop.melody": 0 }, muted: ["intro.beat"] }));
    expect(JSON.stringify(lab)).toBe(before);
  });
  it("lists a row per channel of both sections", () => {
    expect(channelRows(lab).map((r) => r.key)).toEqual(["intro.melody", "intro.bass", "intro.beat", "loop.melody", "loop.bass", "loop.beat"]);
  });
});

describe("copyBack", () => {
  it("writes the tempo and per-section volumes and leaves the rest alone", () => {
    const out = copyBack(SAMPLE_TEXT, T({ tempo: 132, gains: { "intro.bass": 0.5, "loop.melody": 0.35 } }));
    const lines = out.split("\n");
    expect(lines).toHaveLength(SAMPLE_TEXT.split("\n").length);
    expect(out).toContain("tempo: 132");
    const intro = out.slice(out.indexOf("== intro =="), out.indexOf("== loop =="));
    const loop = out.slice(out.indexOf("== loop =="));
    expect(intro).toContain("[bass triangle 0.5]");
    expect(intro).toContain("[melody square 0.5]");
    expect(loop).toContain("[melody square 0.35]");
    expect(loop).toContain("[bass triangle 0.8]");
  });
  it("round trips: the baked text parses to the tweaked tracks", () => {
    const tweaks = T({ tempo: 99, gains: { "intro.melody": 0.25, "loop.beat": 0.9 } });
    const baked = ok(copyBack(SAMPLE_TEXT, tweaks));
    const want = playable(ok(SAMPLE_TEXT), "both", tweaks);
    expect(baked.intro?.tempo).toBe(want.intro?.tempo);
    expect(baked.loop.tempo).toBe(99);
    expect(baked.intro?.channels.map((c) => c.volume)).toEqual(want.intro?.channels.map((c) => c.volume));
    expect(baked.loop.channels.map((c) => c.volume)).toEqual(want.loop.channels.map((c) => c.volume));
  });
  it("adds a tempo line after the title when there is none, and handles a plain track", () => {
    const out = copyBack("title: T\n[a square 0.6]  # lead\nC4:1\n", T({ tempo: 140, gains: { "loop.a": 0.3 } }));
    expect(out).toBe("title: T\ntempo: 140\n[a square 0.3]  # lead\nC4:1\n");
    expect(ok(out).loop.tempo).toBe(140);
  });
  it("adds a volume to a channel written without one", () => {
    expect(copyBack("title: T\n[a square]\nC4:1\n", T({ gains: { "loop.a": 0.4 } }))).toContain("[a square 0.4]");
  });
  it("keeps a tempo comment and does not write mutes", () => {
    const out = copyBack("title: T\ntempo: 100  # slow\n[a square]\nC4:1\n", T({ tempo: 110, muted: ["loop.a"] }));
    expect(out).toContain("tempo: 110  # slow");
    expect(ok(out).loop.channels).toHaveLength(1);
  });
  it("changes nothing with no tweaks", () => {
    expect(copyBack(SAMPLE_TEXT, T())).toBe(SAMPLE_TEXT);
  });
  it("lists the config values", () => {
    expect(configLines(T({ master: 0.4, encounterGain: 0.35 }))).toBe("SOUND.master = 0.4\nencounter music level = 0.35");
    expect(configLines(T())).toBe("");
  });
});

describe("the sample", () => {
  it("parses, loops cleanly and keeps the channels the same length", () => {
    const lab = ok(SAMPLE_TEXT);
    for (const t of [lab.intro!, lab.loop]) {
      for (const c of t.channels) for (const n of c.notes) expect(n.start + n.length).toBeLessThanOrEqual(t.beats);
    }
  });
});
