import { describe, expect, it } from "vitest";
import { TILE } from "./config";
import { validateLevel, type Level } from "./level";

const level: Level = {
  id: "r",
  size: { width: 4 * TILE, height: 3 * TILE },
  solids: [{ x: 0, y: 0, w: TILE, h: TILE }],
  interactables: [],
  doors: [],
  pieces: [],
  spawn: { x: TILE, y: TILE },
};

describe("validateLevel", () => {
  it("accepts a playable level", () => {
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("rejects a size that is not whole tiles", () => {
    expect(() => validateLevel({ ...level, size: { width: 70, height: 48 } })).toThrow("whole number");
    expect(() => validateLevel({ ...level, size: { width: 0, height: 48 } })).toThrow("whole number");
  });

  it("rejects a start in a wall, off the map or off the tile grid", () => {
    expect(() => validateLevel({ ...level, spawn: { x: 0, y: 0 } })).toThrow("not open floor");
    expect(() => validateLevel({ ...level, spawn: { x: 9 * TILE, y: 0 } })).toThrow("not open floor");
    expect(() => validateLevel({ ...level, spawn: { x: 5, y: TILE } })).toThrow("not on a tile");
  });

  it("rejects a door on a blocked tile", () => {
    const door = { col: 0, row: 0, to: "x", arrive: { col: 1, row: 1, facing: "down" as const } };
    expect(() => validateLevel({ ...level, doors: [door] })).toThrow("door");
  });

  describe("state variable names", () => {
    const task = {
      id: "t", name: "T", prompt: "Do", duration: 1, points: 1,
      zones: [{ x: 2 * TILE, y: TILE, w: TILE, h: TILE }],
    };
    const withTask = (extra: object): Level => ({ ...level, interactables: [{ ...task, ...extra }] });

    it("accepts known names", () => {
      const ok = withTask({
        requires: [{ var: "dishes", min: 1, reason: "NO" }, { anyOf: [{ var: "energy", max: 5 }], reason: "NO" }],
        effects: [{ var: "dishes", add: -1 }],
        pointsBonus: { var: "dishes", perUnit: 1 },
      });
      expect(() => validateLevel(ok)).not.toThrow();
    });

    it("names the room, task and place of a typo in requires, effects or pointsBonus", () => {
      expect(() => validateLevel(withTask({ requires: [{ var: "dishs", min: 1, reason: "NO" }] }))).toThrow(
        /r: task "t" requires uses the unknown state variable "dishs"/,
      );
      expect(() => validateLevel(withTask({ requires: [{ anyOf: [{ var: "enrgy" }], reason: "NO" }] }))).toThrow(/enrgy/);
      expect(() => validateLevel(withTask({ effects: [{ var: "bedmade", set: 1 }] }))).toThrow(/task "t" effects.*bedmade/);
      expect(() => validateLevel(withTask({ pointsBonus: { var: "dish", perUnit: 1 } }))).toThrow(/task "t" pointsBonus.*dish/);
    });

    it("catches a typo in a cutscene's set step, a variant rule and a solid's blockedWhen", () => {
      const cutscene = { activity: { type: "cutscene", steps: [{ set: { var: "mood", value: 1 } }] } };
      expect(() => validateLevel(withTask(cutscene))).toThrow(/cutscene.*mood/);
      const variants = { area: { x: 0, y: 0, w: TILE, h: TILE }, variants: [{ sprite: "s", when: [{ var: "zzz" }] }] };
      expect(() => validateLevel({ ...level, appearances: [variants] })).toThrow(/variant "s".*zzz/);
      const solid = { x: 3 * TILE, y: TILE, w: TILE, h: TILE, blockedWhen: [{ var: "qqq" }] };
      expect(() => validateLevel({ ...level, solids: [...level.solids, solid] })).toThrow(/blockedWhen.*qqq/);
    });

    it("checks against the names given", () => {
      const lvl = withTask({ effects: [{ var: "mood", add: 1 }] });
      expect(() => validateLevel(lvl, (id) => id === "mood")).not.toThrow();
    });
  });
});
