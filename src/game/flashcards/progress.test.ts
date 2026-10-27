import { describe, expect, it } from "vitest";
import { textWidth } from "../../render/font";
import { barParts, describeWait, pageLines, readSummary } from "./progress";
import type { ProgressSummary } from "./study";

const S: ProgressSummary = { total: 1000, seen: 312, mastered: 127, dueNow: 0, dueTomorrow: 9, nextDueInMs: 5 * 3_600_000 };
const raw = (o: Partial<Record<string, unknown>> = {}) => ({ total: 1000, seen: 312, mastered: 127, dueNow: 0, dueTomorrow: 9, nextDueIn: 5 * 3_600_000, ...o });

describe("readSummary", () => {
  it("reads the proposed shape", () => {
    expect(readSummary(raw())).toEqual(S);
    expect(readSummary(raw({ nextDueIn: null }))?.nextDueInMs).toBeNull();
  });

  it("refuses anything that is not plain counts that fit together", () => {
    for (const bad of [
      null, undefined, "x", 4, {},
      raw({ total: 0 }), raw({ total: "1000" }), raw({ seen: -1 }), raw({ seen: 1.5 }), raw({ seen: NaN }),
      raw({ seen: 2000 }), raw({ mastered: 400 }), raw({ dueNow: 400 }), raw({ dueNow: 312, dueTomorrow: 1 }),
      raw({ nextDueIn: -5 }), raw({ nextDueIn: "soon" }), raw({ nextDueIn: Infinity }), raw({ nextDueIn: undefined }),
    ]) {
      expect(readSummary(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("describeWait", () => {
  it("is coarse and rounds each unit on its own", () => {
    expect(describeWait(10_000)).toBe("under a minute");
    expect(describeWait(60_000)).toBe("1 minute");
    expect(describeWait(45 * 60_000)).toBe("45 minutes");
    expect(describeWait(59.7 * 60_000)).toBe("1 hour");
    expect(describeWait(5 * 3_600_000)).toBe("5 hours");
    expect(describeWait(23.8 * 3_600_000)).toBe("1 day");
    expect(describeWait(3 * 86_400_000)).toBe("3 days");
  });
});

describe("pageLines", () => {
  const texts = (s: ProgressSummary, t = { gotIt: 0, again: 0 }) => pageLines(s, t).map((l) => l.text);

  it("says what is known, met and due, plainly", () => {
    expect(texts(S)).toEqual([
      "127 of 1000 words known",
      "312 of 1000 words met",
      "Nothing is due. That is all for now.",
      "The next one is due in 5 hours.",
      "9 cards within a day.",
    ]);
  });

  it("counts what is due now, with the singular", () => {
    expect(texts({ ...S, dueNow: 1, dueTomorrow: 0, nextDueInMs: null })[2]).toBe("1 card due now.");
    expect(texts({ ...S, dueNow: 12 })[2]).toBe("12 cards due now.");
  });

  it("leaves out what the core did not say or there is none of", () => {
    expect(texts({ ...S, dueTomorrow: 0, nextDueInMs: null })).toHaveLength(3);
  });

  it("adds this visit's tally only when something was answered", () => {
    expect(texts(S, { gotIt: 8, again: 2 }).at(-1)).toBe("This time: 8 got it, 2 again.");
    expect(texts(S)).not.toContain("This time: 0 got it, 0 again.");
  });

  it("never nags: no streaks, no pressure words", () => {
    const all = texts({ ...S, dueNow: 30 }, { gotIt: 1, again: 1 }).join(" ").toLowerCase();
    for (const word of ["streak", "missed", "behind", "overdue", "should", "must", "don't", "!"]) expect(all).not.toContain(word);
  });

  it("fits the 248 pixels of the box in the worst case", () => {
    const worst: ProgressSummary = { total: 1000, seen: 1000, mastered: 1000, dueNow: 888, dueTomorrow: 111, nextDueInMs: 400 * 86_400_000 };
    for (const s of [S, worst, { ...S, dueNow: 1000 - 1, seen: 1000 }]) {
      for (const l of pageLines(s, { gotIt: 999, again: 999 })) expect(textWidth(l.text), l.text).toBeLessThanOrEqual(248);
    }
  });
});

describe("barParts", () => {
  it("splits the bar into known and met-but-not-known, never past the end", () => {
    expect(barParts(S, 200)).toEqual({ known: 25, met: 37 });
    expect(barParts({ ...S, seen: 1000, mastered: 1000 }, 200)).toEqual({ known: 200, met: 0 });
    expect(barParts({ ...S, seen: 0, mastered: 0 }, 200)).toEqual({ known: 0, met: 0 });
  });

  it("gives a small part at least one pixel", () => {
    expect(barParts({ ...S, seen: 10, mastered: 1 }, 200)).toEqual({ known: 1, met: 1 });
  });
});
