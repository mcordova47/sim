import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { PLAYER } from "./config";
import { Player } from "./player";
import type { Solid } from "./world";

const dt = 1 / 60;
const floor: Solid = { x: -500, y: 100, w: 1000, h: 50 };
const jump: Controls = { ...NO_INPUT, jumpPressed: true, jumpHeld: true };
const hold: Controls = { ...NO_INPUT, jumpHeld: true };
const right: Controls = { ...NO_INPUT, moveX: 1 };

function run(p: Player, solids: Solid[], frames: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < frames; i++) p.update(dt, controls, solids);
}

// A player resting on the floor.
function grounded(x = 0): Player {
  const p = new Player(x, floor.y - PLAYER.height);
  run(p, [floor], 2);
  return p;
}

// Highest rise above the start while a jump plays out.
function apex(release?: number): number {
  const p = grounded();
  const startY = p.y;
  let min = startY;
  p.update(dt, jump, [floor]);
  for (let i = 0; i < 120; i++) {
    p.update(dt, release !== undefined && i >= release ? NO_INPUT : hold, [floor]);
    min = Math.min(min, p.y);
  }
  return startY - min;
}

describe("landing", () => {
  it("falls onto the floor and stops there", () => {
    const p = new Player(0, 60);
    run(p, [floor], 60);
    expect(p.grounded).toBe(true);
    expect(p.y + p.h).toBe(floor.y);
    expect(p.vy).toBe(0);
  });
});

describe("jumping", () => {
  it("a full-hold jump peaks near the configured height", () => {
    // Integrating at 60 Hz costs a few pixels; config.ts documents the real figure.
    expect(apex()).toBeGreaterThan(PLAYER.jumpHeight - 5);
    expect(apex()).toBeLessThanOrEqual(PLAYER.jumpHeight);
  });

  it("releasing early gives a shorter hop", () => {
    expect(apex(0)).toBeLessThan(apex() * 0.6);
    expect(apex(0)).toBeGreaterThan(2);
  });

  it("coyote time allows a jump just after walking off a ledge", () => {
    const ledge: Solid = { x: 0, y: 100, w: 20, h: 50 };
    const q = new Player(5, 100 - PLAYER.height);
    run(q, [ledge], 2);
    while (q.x <= 20) q.update(dt, right, [ledge]);
    q.update(dt, { ...right, jumpPressed: true, jumpHeld: true }, [ledge]);
    expect(q.vy).toBeLessThan(0);
  });

  it("no jump once coyote time has run out", () => {
    const ledge: Solid = { x: 0, y: 100, w: 20, h: 50 };
    const p = new Player(5, 100 - PLAYER.height);
    run(p, [ledge], 2);
    while (p.x <= 20) p.update(dt, right, [ledge]);
    run(p, [ledge], 10, right);
    p.update(dt, { ...right, jumpPressed: true, jumpHeld: true }, [ledge]);
    expect(p.vy).toBeGreaterThan(0);
  });

  it("buffers a jump pressed just before landing", () => {
    const p = new Player(0, floor.y - PLAYER.height - 3);
    p.update(dt, jump, [floor]);
    let jumped = false;
    for (let i = 0; i < 20 && !jumped; i++) {
      p.update(dt, hold, [floor]);
      jumped = p.vy < 0;
    }
    expect(jumped).toBe(true);
  });
});

describe("one-way platforms", () => {
  const plat: Solid = { x: -50, y: 70, w: 100, h: 4, oneWay: true };

  it("can be jumped up through and landed on", () => {
    const p = grounded();
    p.update(dt, jump, [floor, plat]);
    for (let i = 0; i < 90; i++) p.update(dt, hold, [floor, plat]);
    expect(p.y + p.h).toBe(plat.y);
    expect(p.grounded).toBe(true);
  });

  it("does not block walking sideways through its edge", () => {
    const p = new Player(-60, plat.y);
    run(p, [plat], 5, right);
    expect(p.x).toBeGreaterThan(-60);
  });
});

describe("walls and corners", () => {
  const wall: Solid = { x: 40, y: 0, w: 20, h: 100 };

  it("stops against a wall", () => {
    const p = grounded();
    run(p, [floor, wall], 120, right);
    expect(p.x + p.w).toBe(wall.x);
    expect(p.vx).toBe(0);
  });

  it("bonks its head on a ceiling", () => {
    const ceiling: Solid = { x: -50, y: 70, w: 100, h: 10 };
    const p = grounded();
    p.update(dt, jump, [floor, ceiling]);
    for (let i = 0; i < 30; i++) p.update(dt, hold, [floor, ceiling]);
    expect(p.y).toBeGreaterThanOrEqual(ceiling.y + ceiling.h);
  });

  it("slides along a wall instead of sticking to its top corner", () => {
    const step: Solid = { x: 40, y: 90, w: 40, h: 10 };
    const p = grounded();
    run(p, [floor, step], 20, right);
    expect(p.y + p.h).toBeLessThanOrEqual(floor.y);
    expect(p.x + p.w).toBeLessThanOrEqual(step.x);
  });
});

describe("large time steps", () => {
  it("does not fall through the floor in a 0.25 s step", () => {
    const p = new Player(0, 0);
    p.vy = PLAYER.maxFallSpeed;
    p.update(0.25, NO_INPUT, [floor]);
    expect(p.y + p.h).toBeLessThanOrEqual(floor.y);
    p.update(0.25, NO_INPUT, [floor]);
    expect(p.y + p.h).toBe(floor.y);
  });

  it("does not tunnel through a thin wall in a 0.25 s step", () => {
    const thin: Solid = { x: 60, y: 0, w: 2, h: 100 };
    const p = grounded();
    p.vx = PLAYER.maxSpeed;
    p.update(0.25, right, [floor, thin]);
    expect(p.x + p.w).toBeLessThanOrEqual(thin.x);
  });

  it("does not tunnel through a thin ceiling in a 0.25 s step", () => {
    const thin: Solid = { x: -50, y: 40, w: 100, h: 2 };
    const p = grounded();
    p.update(0.25, jump, [floor, thin]);
    expect(p.y).toBeGreaterThanOrEqual(thin.y + thin.h);
  });

  it("matches a sequence of fixed steps for a plain fall", () => {
    const a = new Player(0, 0);
    const b = new Player(0, 0);
    a.update(0.2, NO_INPUT, []);
    for (let i = 0; i < 12; i++) b.update(0.2 / 12, NO_INPUT, []);
    expect(a.y).toBeCloseTo(b.y, 6);
  });
});

describe("starting inside a solid", () => {
  const wall: Solid = { x: 40, y: 0, w: 20, h: 100 };

  it("is pushed out the nearest side of a wall", () => {
    const p = new Player(36, 50); // 6px into the left face
    p.update(dt, NO_INPUT, [wall]);
    expect(p.x + p.w).toBeLessThanOrEqual(wall.x);
    const q = new Player(56, 50); // 4px into the right face
    q.update(dt, NO_INPUT, [wall]);
    expect(q.x).toBeGreaterThanOrEqual(wall.x + wall.w);
  });

  it("is pushed up out of a floor it sank into", () => {
    const p = new Player(0, floor.y - PLAYER.height + 3);
    p.update(dt, NO_INPUT, [floor]);
    expect(p.y + p.h).toBeLessThanOrEqual(floor.y);
    expect(p.grounded).toBe(true);
  });

  it("is pushed out of a thin wall without crossing it", () => {
    const thin: Solid = { x: 40, y: 0, w: 2, h: 100 };
    const p = new Player(35, 50); // mostly left of the wall, overlapping it
    p.update(dt, NO_INPUT, [thin]);
    expect(p.x + p.w).toBeLessThanOrEqual(thin.x);
  });

  it("ends clear of every solid when wedged between two", () => {
    const a: Solid = { x: 0, y: 0, w: 20, h: 100 };
    const b: Solid = { x: 28, y: 0, w: 20, h: 100 };
    const p = new Player(15, 50);
    p.update(dt, NO_INPUT, [a, b]);
    for (const s of [a, b]) {
      const clear =
        p.x + p.w <= s.x || p.x >= s.x + s.w || p.y + p.h <= s.y || p.y >= s.y + s.h;
      expect(clear).toBe(true);
    }
  });

  it("ignores one-way platforms it overlaps", () => {
    const plat: Solid = { x: 0, y: 50, w: 100, h: 4, oneWay: true };
    const p = new Player(10, 45);
    p.update(dt, NO_INPUT, [plat]);
    expect(p.x).toBe(10);
  });
});
