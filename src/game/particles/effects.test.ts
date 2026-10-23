import { describe, expect, it } from "vitest";
import { ENERGY, PARTICLES } from "../config";
import { burst, burstPlan, countIn, floorOf, popupIconSpot, puff, stepDust } from "./effects";
import { ParticlePool } from "./pool";
import { seeded } from "./seeded";

describe("step dust", () => {
  it("puffs a little on wood and on stone", () => {
    expect(stepDust("wood", 80)?.kind).toBe("dustWood");
    expect(stepDust("stone", 80)?.kind).toBe("dustStone");
  });

  it("makes none on tile (the bath)", () => {
    expect(stepDust("tile", 80)).toBeNull();
    expect(stepDust("carpet", 80)).toBeNull();
  });

  it("makes none when tired and shuffling, but does at the line itself", () => {
    expect(stepDust("wood", ENERGY.lowBelow - 0.01)).toBeNull();
    expect(stepDust("wood", 0)).toBeNull();
    expect(stepDust("wood", ENERGY.lowBelow)).not.toBeNull();
  });

  it("follows the rooms' floors", () => {
    expect(floorOf("main")).toBe("wood");
    expect(floorOf("kitchen")).toBe("stone");
    expect(floorOf("bath")).toBe("tile");
    expect(floorOf("unknown")).toBe("wood");
  });
});

describe("burstPlan", () => {
  it("grows with the chain: more squares, more colors", () => {
    const counts = [1, 2, 3, 4, 5].map((chain) => burstPlan({ chain, repeatFactor: 1 }).count);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    const colors = [1, 2, 3].map((chain) => burstPlan({ chain, repeatFactor: 1 }).colors.length);
    expect(colors[1]).toBeGreaterThan(colors[0]);
    expect(colors[2]).toBeGreaterThan(colors[1]);
  });

  it("makes multicolor confetti from the palette for a chain of 3 or more", () => {
    for (const chain of [3, 4, 9]) {
      const plan = burstPlan({ chain, repeatFactor: 1 });
      expect(new Set(plan.colors).size).toBeGreaterThanOrEqual(6);
      expect(plan.kind).toBe("confetti");
    }
  });

  it("makes a smaller, duller burst for a repeat with diminishing returns", () => {
    const first = burstPlan({ chain: 1, repeatFactor: 1 });
    const repeat = burstPlan({ chain: 1, repeatFactor: 0.5 });
    const third = burstPlan({ chain: 1, repeatFactor: 0.25 });
    expect(repeat.count).toBeLessThan(first.count);
    expect(third.count).toBeLessThanOrEqual(repeat.count);
    expect(repeat.kind).toBe("confettiDull");
    expect(repeat.colors).not.toEqual(first.colors);
    expect(burstPlan({ chain: 1, repeatFactor: 0.001 }).count).toBeGreaterThanOrEqual(PARTICLES.burst.repeat.minCount);
  });

  it("never exceeds the most, however long the chain", () => {
    expect(burstPlan({ chain: 500, repeatFactor: 1 }).count).toBe(PARTICLES.burst.max);
    expect(burstPlan({ chain: 0, repeatFactor: 1 }).count).toBe(PARTICLES.burst.base); // treated as 1
  });

  it("starts the squares inside the area, and every one is a palette color of the plan", () => {
    const pool = new ParticlePool(200, seeded(2));
    const plan = burstPlan({ chain: 4, repeatFactor: 1 });
    burst(pool, seeded(5), plan, { x: 100, y: 50, w: 32, h: 16 });
    expect(pool.count).toBe(plan.count);
    for (const p of pool.particles()) {
      expect(p.x).toBeGreaterThanOrEqual(100);
      expect(p.x).toBeLessThanOrEqual(132);
      expect(p.y).toBeGreaterThanOrEqual(50);
      expect(p.y).toBeLessThanOrEqual(66);
      expect(plan.colors).toContain(p.color);
    }
  });
});

describe("puff and countIn", () => {
  it("makes the number asked for within the spread", () => {
    const pool = new ParticlePool(50, seeded());
    puff(pool, seeded(4), "steam", 10, 10, 6, 3);
    expect(pool.count).toBe(6);
    for (const p of pool.particles()) {
      expect(Math.abs(p.x - 10)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.y - 10)).toBeLessThanOrEqual(3);
    }
  });

  it("takes a separate spread for each axis, and a color", () => {
    const pool = new ParticlePool(50, seeded());
    puff(pool, seeded(4), "sparkle", 0, 0, 20, { x: 10, y: 1 }, "brick");
    for (const p of pool.particles()) {
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      expect(p.color).toBe("brick");
    }
  });

  it("rejects a kind that does not exist", () => {
    expect(() => puff(new ParticlePool(5), seeded(), "nope", 0, 0, 1)).toThrow(/nope/);
  });

  it("counts whole numbers within the range, both ends reachable", () => {
    const r = seeded(9);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(countIn([2, 4], r));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });
});

describe("popupIconSpot", () => {
  it("is lower the more lines the popup has above the icon", () => {
    const base = { multiplier: 1, repeatFactor: 1, qualityFactor: 1, timeFactor: 1.5 };
    const plain = popupIconSpot(base);
    const combo = popupIconSpot({ ...base, multiplier: 2 });
    const comboRepeat = popupIconSpot({ ...base, multiplier: 2, repeatFactor: 0.5 });
    const all = popupIconSpot({ ...base, multiplier: 2, repeatFactor: 0.5, qualityFactor: 1.2 });
    expect(combo.dy).toBeGreaterThan(plain.dy);
    expect(comboRepeat.dy).toBeGreaterThan(combo.dy);
    expect(all.dy).toBeGreaterThan(comboRepeat.dy);
    // The icon is at the left end of a centred line, so left of the middle.
    expect(plain.dx).toBeLessThan(0);
  });
});
