import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { Player } from "./player";
import type { Solid } from "./world";

const dt = 1 / 60;
const floor: Solid = { x: -500, y: 100, w: 1000, h: 20 };
const jump: Controls = { ...NO_INPUT, jumpPressed: true, jumpHeld: true };
const hold: Controls = { ...NO_INPUT, jumpHeld: true };

function settled(): Player {
  const p = new Player(0, 100 - 14);
  for (let i = 0; i < 10; i++) p.update(dt, NO_INPUT, [floor]);
  return p;
}

describe("Player update flags", () => {
  it("reports a jump only on the update that starts it", () => {
    const p = settled();
    p.update(dt, jump, [floor]);
    expect(p.jumpedThisUpdate).toBe(true);
    for (let i = 0; i < 10; i++) {
      p.update(dt, hold, [floor]);
      expect(p.jumpedThisUpdate).toBe(false);
    }
  });

  it("doesn't report a jump on frames with no jump, or for a press in the air", () => {
    const p = settled();
    for (let i = 0; i < 30; i++) {
      p.update(dt, { ...NO_INPUT, moveX: 1 }, [floor]);
      expect(p.jumpedThisUpdate).toBe(false);
    }
    p.update(dt, jump, [floor]);
    for (let i = 0; i < 5; i++) p.update(dt, hold, [floor]);
    p.update(dt, jump, [floor]); // pressed in the air: buffered, not a jump
    expect(p.jumpedThisUpdate).toBe(false);
  });

  it("reports a coyote jump after walking off a ledge", () => {
    const ledge: Solid = { x: -500, y: 100, w: 500, h: 20 };
    const p = new Player(-30, 100 - 14);
    for (let i = 0; i < 10; i++) p.update(dt, NO_INPUT, [ledge]);
    while (p.grounded) p.update(dt, { ...NO_INPUT, moveX: 1 }, [ledge]);
    p.update(dt, { ...jump, moveX: 1 }, [ledge]);
    expect(p.jumpedThisUpdate).toBe(true);
  });

  it("reports a landing with the impact speed, once, only after being airborne", () => {
    const p = settled();
    // Standing still never counts as landing.
    for (let i = 0; i < 30; i++) {
      p.update(dt, NO_INPUT, [floor]);
      expect(p.landingSpeed).toBe(0);
    }
    p.update(dt, jump, [floor]);
    const landings: number[] = [];
    for (let i = 0; i < 120; i++) {
      p.update(dt, hold, [floor]);
      if (p.landingSpeed > 0) landings.push(p.landingSpeed);
    }
    expect(landings).toHaveLength(1);
    // A 40px jump comes back down at roughly sqrt(2 * gravity * height).
    expect(landings[0]).toBeGreaterThan(200);
    expect(landings[0]).toBeLessThan(300);
  });

  it("reports a harder landing for a longer fall", () => {
    const fall = (height: number) => {
      const p = new Player(0, 100 - 14 - height);
      let speed = 0;
      for (let i = 0; i < 300; i++) {
        p.update(dt, NO_INPUT, [floor]);
        speed = Math.max(speed, p.landingSpeed);
      }
      return speed;
    };
    expect(fall(5)).toBeLessThan(fall(40));
    expect(fall(40)).toBeLessThan(fall(120));
  });

  it("counts a landing inside one long update once", () => {
    const p = new Player(0, 100 - 14 - 60);
    p.update(0.5, NO_INPUT, [floor]);
    expect(p.grounded).toBe(true);
    expect(p.landingSpeed).toBeGreaterThan(0);
    p.update(dt, NO_INPUT, [floor]);
    expect(p.landingSpeed).toBe(0);
  });

  it("clears both flags at the start of every update", () => {
    const p = settled();
    p.update(dt, jump, [floor]);
    expect(p.jumpedThisUpdate).toBe(true);
    p.update(dt, hold, [floor]);
    expect(p.jumpedThisUpdate).toBe(false);
  });
});
