import { describe, expect, it } from "vitest";
import { SCORING } from "./config";
import { Scoreboard } from "./scoring";

const a = { id: "a", points: 10 };
const b = { id: "b", points: 20 };
const c = { id: "c", points: 40 };

describe("Scoreboard", () => {
  it("awards base points for a first completion", () => {
    const s = new Scoreboard();
    const award = s.complete(a, 0);
    expect(award).toMatchObject({ points: 10, repeatFactor: 1, multiplier: 1, chain: 1 });
    expect(s.score).toBe(10);
  });

  it("halves points for each repeat within the window", () => {
    const s = new Scoreboard();
    // Spaced beyond the combo window so only the repeat rule applies.
    const gap = SCORING.comboWindow + 1;
    expect(s.complete(c, 0).points).toBe(40);
    expect(s.complete(c, gap).points).toBe(20);
    expect(s.complete(c, gap * 2).points).toBe(10);
  });

  it("forgets repeats once the window has passed", () => {
    const s = new Scoreboard();
    s.complete(c, 0);
    expect(s.complete(c, SCORING.repeatWindow + 1).points).toBe(40);
  });

  it("never pays less than the minimum", () => {
    const s = new Scoreboard();
    let last = 0;
    for (let i = 0; i < 12; i++) last = s.complete(a, i * (SCORING.comboWindow + 1)).points;
    expect(last).toBe(SCORING.minPoints);
  });

  it("builds a multiplier from different tasks in quick succession", () => {
    const s = new Scoreboard();
    expect(s.complete(a, 0).multiplier).toBe(1);
    const second = s.complete(b, 5);
    expect(second.multiplier).toBe(1 + SCORING.comboStep);
    expect(second.points).toBe(Math.round(20 * (1 + SCORING.comboStep)));
    expect(s.complete(c, 10).chain).toBe(3);
  });

  it("caps the multiplier", () => {
    const s = new Scoreboard();
    let award = s.complete({ id: "t0", points: 10 }, 0);
    for (let i = 1; i < 10; i++) award = s.complete({ id: `t${i}`, points: 10 }, i);
    expect(award.multiplier).toBe(SCORING.comboMaxMultiplier);
  });

  it("drops the combo when too much time passes", () => {
    const s = new Scoreboard();
    s.complete(a, 0);
    const award = s.complete(b, SCORING.comboWindow + 1);
    expect(award.multiplier).toBe(1);
    expect(award.chain).toBe(1);
  });

  it("restarts the chain when a task in it is repeated", () => {
    const s = new Scoreboard();
    s.complete(a, 0);
    s.complete(b, 1);
    const award = s.complete(a, 2);
    expect(award.chain).toBe(1);
    expect(award.multiplier).toBe(1);
    // Still a repeat of `a` too.
    expect(award.repeatFactor).toBe(SCORING.repeatDecay);
  });

  it("reports combo state for the HUD", () => {
    const s = new Scoreboard();
    expect(s.chainLength(0)).toBe(0);
    s.complete(a, 0);
    expect(s.chainLength(1)).toBe(1);
    expect(s.nextMultiplier(1)).toBe(1 + SCORING.comboStep);
    expect(s.comboTimeLeft(5)).toBe(SCORING.comboWindow - 5);
    expect(s.chainLength(SCORING.comboWindow + 1)).toBe(0);
    expect(s.comboTimeLeft(SCORING.comboWindow + 1)).toBe(0);
  });

  it("reports the current multiplier, falling back to 1 when the combo lapses", () => {
    const s = new Scoreboard();
    expect(s.multiplier(0)).toBe(1);
    s.complete(a, 0);
    expect(s.multiplier(1)).toBe(1);
    s.complete(b, 2);
    expect(s.multiplier(3)).toBe(1 + SCORING.comboStep);
    expect(s.multiplier(2 + SCORING.comboWindow + 1)).toBe(1);
  });
});
