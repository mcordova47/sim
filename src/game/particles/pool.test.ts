import { describe, expect, it } from "vitest";
import { PARTICLES, type ParticleKind } from "../config";
import { ParticlePool, alphaAt } from "./pool";
import { seeded } from "./seeded";

const still: ParticleKind = {
  shape: "dot", colors: ["paper"], life: [1, 1], vx: [0, 0], vy: [0, 0], gravity: 0, drag: 0, fadeFrom: 1,
};

describe("ParticlePool", () => {
  it("makes a particle, moves it, and drops it when its life is over", () => {
    const pool = new ParticlePool(10, seeded());
    pool.spawn({ x: 5, y: 5, kind: { ...still, vx: [10, 10], vy: [-20, -20] } });
    expect(pool.count).toBe(1);
    pool.update(0.5);
    const [p] = [...pool.particles()];
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(-5);
    pool.update(0.4);
    expect(pool.count).toBe(1);
    pool.update(0.2); // past its life of 1 second
    expect(pool.count).toBe(0);
    expect([...pool.particles()]).toHaveLength(0);
  });

  it("falls with gravity, rises with negative gravity, and slows with drag", () => {
    const pool = new ParticlePool(10, seeded());
    pool.spawn({ x: 0, y: 0, kind: { ...still, gravity: 100 } });
    pool.spawn({ x: 0, y: 0, kind: { ...still, gravity: -100 } });
    pool.spawn({ x: 0, y: 0, kind: { ...still, vx: [100, 100], drag: 2 } });
    pool.update(0.25);
    const [fall, rise, slow] = [...pool.particles()];
    expect(fall.y).toBeGreaterThan(0);
    expect(rise.y).toBeLessThan(0);
    expect(slow.vx).toBeLessThan(100);
    expect(slow.vx).toBeGreaterThan(0);
  });

  it("never goes past its budget: with the pool full, a new particle replaces the oldest", () => {
    const pool = new ParticlePool(5, seeded());
    for (let i = 0; i < 5; i++) pool.spawn({ x: i, y: 0, kind: still });
    expect(pool.count).toBe(5);
    pool.spawn({ x: 99, y: 0, kind: still });
    expect(pool.count).toBe(5);
    const xs = [...pool.particles()].map((p) => p.x).sort((a, b) => a - b);
    expect(xs).toEqual([1, 2, 3, 4, 99]); // the first one (x 0) is gone
    for (let i = 0; i < 1000; i++) pool.spawn({ x: i, y: 1, kind: still });
    expect(pool.count).toBe(5);
  });

  it("reuses slots: a long run of short-lived particles stays within the budget", () => {
    const pool = new ParticlePool(PARTICLES.budget, seeded());
    let most = 0;
    for (let frame = 0; frame < 3000; frame++) {
      pool.spawn({ x: 0, y: 0, kind: { ...still, life: [0.2, 0.4] } });
      pool.update(1 / 60);
      most = Math.max(most, pool.count);
    }
    expect(most).toBeLessThan(PARTICLES.budget);
    expect(pool.count).toBeLessThanOrEqual(30); // about 0.4 s worth
  });

  it("is repeatable with the same random function", () => {
    const run = () => {
      const pool = new ParticlePool(20, seeded(7));
      for (let i = 0; i < 6; i++) pool.spawn({ x: i, y: 0, kind: PARTICLES.kinds.confetti });
      pool.update(0.3);
      return [...pool.particles()].map((p) => [p.x, p.y, p.color]);
    };
    expect(run()).toEqual(run());
  });

  it("ignores a zero, negative or not-a-number time step", () => {
    const pool = new ParticlePool(5, seeded());
    pool.spawn({ x: 1, y: 1, kind: { ...still, vx: [10, 10] } });
    pool.update(0);
    pool.update(-1);
    pool.update(Number.NaN);
    const [p] = [...pool.particles()];
    expect(p.x).toBe(1);
    expect(p.age).toBe(0);
  });

  it("clear removes everything", () => {
    const pool = new ParticlePool(5, seeded());
    pool.spawn({ x: 1, y: 1, kind: still });
    pool.clear();
    expect(pool.count).toBe(0);
    pool.spawn({ x: 1, y: 1, kind: still });
    expect(pool.count).toBe(1);
  });

  it("uses the colors it was given, and one of the kind's otherwise", () => {
    const pool = new ParticlePool(5, seeded());
    pool.spawn({ x: 0, y: 0, kind: { ...still, colors: ["butter", "leaf"] } });
    pool.spawn({ x: 0, y: 0, kind: { ...still, colors: ["butter", "leaf"] }, color: "brick" });
    const [a, b] = [...pool.particles()];
    expect(["butter", "leaf"]).toContain(a.color);
    expect(b.color).toBe("brick");
  });
});

describe("alphaAt", () => {
  it("is 1 until the fade starts, then steps down without ever reaching 0", () => {
    expect(alphaAt(0, 1, 0.5)).toBe(1);
    expect(alphaAt(0.5, 1, 0.5)).toBe(1);
    const levels = new Set<number>();
    for (let t = 0; t < 1; t += 0.01) {
      const a = alphaAt(t, 1, 0.5);
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThanOrEqual(1);
      levels.add(a);
    }
    expect(levels.size).toBe(PARTICLES.fadeSteps);
  });

  it("does not fade at all when fadeFrom is 1", () => {
    expect(alphaAt(0.99, 1, 1)).toBe(1);
  });
});

// A canvas that records fills and the alpha each had.
function recorder() {
  const fills: { style: string; alpha: number; args: number[] }[] = [];
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    fillRect(this: { fillStyle: string; globalAlpha: number }, ...args: number[]) {
      fills.push({ style: this.fillStyle, alpha: this.globalAlpha, args });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, raw: ctx };
}

describe("drawing", () => {
  it("draws whole-pixel squares at whole-pixel places, in palette colors, and restores the alpha", () => {
    const pool = new ParticlePool(50, seeded(3));
    for (const name of Object.keys(PARTICLES.kinds)) pool.spawn({ x: 10.37, y: 20.62, kind: PARTICLES.kinds[name] });
    pool.update(0.21);
    const { ctx, fills, raw } = recorder();
    raw.globalAlpha = 0.8;
    pool.draw(ctx);
    expect(fills.length).toBeGreaterThan(0);
    for (const f of fills) {
      expect(f.args.every(Number.isInteger), JSON.stringify(f)).toBe(true);
      expect(f.args.slice(2)).toEqual([1, 1]);
      expect(f.style).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(raw.globalAlpha).toBe(0.8);
  });

  it("draws nothing for an empty pool or for particles that have expired", () => {
    const pool = new ParticlePool(5, seeded());
    const a = recorder();
    pool.draw(a.ctx);
    expect(a.fills).toHaveLength(0);
    pool.spawn({ x: 1, y: 1, kind: still });
    pool.update(2);
    const b = recorder();
    pool.draw(b.ctx);
    expect(b.fills).toHaveLength(0);
  });
});
