import { describe, expect, it } from "vitest";
import { APARTMENT } from "../apartment";
import { GLYPHS, unsupportedChars } from "../../render/font";
import { VIEW } from "../config";
import { wrapText } from "../dialog";
import { textWidth } from "../../render/font";
import { ACHIEVEMENTS_UI as UI } from "../config";
import { ACHIEVEMENTS, type Condition } from "./data";
import { LIST_CAPACITY } from "./draw";
import { Stats } from "./stats";
import { isMet } from "./unlock";

const taskIds = new Set(Object.values(APARTMENT.rooms).flatMap((r) => r.interactables.map((i) => i.id)));

const taskIdsIn = (c: Condition): string[] =>
  "task" in c ? [c.task] : "tasks" in c ? c.tasks : [];

describe("achievement data", () => {
  it("lists at least 15 achievements with unique ids and names", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
  });

  it("only uses characters the pixel font draws", () => {
    for (const a of ACHIEVEMENTS) {
      expect(unsupportedChars(a.name), a.id).toEqual([]);
      expect(unsupportedChars(a.description), a.id).toEqual([]);
      // Also nothing the font draws only as a stand-in (a name is read as written).
      for (const ch of (a.name + a.description).toUpperCase()) {
        expect(ch === " " || ch in GLYPHS, `${a.id}: ${ch}`).toBe(true);
      }
    }
  });

  it("has names and descriptions that fit a toast and the list", () => {
    const inner = UI.toastWidth - 2 * UI.toastPadding;
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(0);
      expect(textWidth(a.name), `${a.id} name`).toBeLessThanOrEqual(inner);
      expect(wrapText(a.description, inner, textWidth).length, `${a.id} description`).toBeLessThanOrEqual(2);
      // The list shows two columns.
      expect(textWidth(a.name), `${a.id} in the list`).toBeLessThanOrEqual((VIEW.width - 12) / 2 - 6);
      expect(textWidth(a.description), `${a.id} in the footer`).toBeLessThanOrEqual(VIEW.width - 12);
    }
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(LIST_CAPACITY);
  });

  it("refers only to tasks that exist, and to thresholds above zero", () => {
    for (const a of ACHIEVEMENTS) {
      for (const id of taskIdsIn(a.when)) expect(taskIds.has(id), `${a.id}: ${id}`).toBe(true);
      if ("atLeast" in a.when) expect(a.when.atLeast, a.id).toBeGreaterThan(0);
      if ("tasks" in a.when) expect(a.when.tasks.length, a.id).toBeGreaterThan(0);
    }
  });

  it("can each be unlocked, and none starts unlocked", () => {
    const ctx = { allTaskIds: [...taskIds] };
    expect(ACHIEVEMENTS.filter((a) => isMet(a.when, new Stats(), ctx))).toEqual([]);
    for (const a of ACHIEVEMENTS) {
      // Build stats that satisfy just this condition.
      const w = a.when;
      const s = new Stats();
      if ("stat" in w) {
        const data = s.toJSON() as unknown as Record<string, unknown>;
        if (w.stat === "roomsVisited") for (let i = 0; i < w.atLeast; i++) s.visited(`r${i}`);
        else if (w.stat === "completions") {
          for (let i = 0; i < w.atLeast; i++) s.completed({ id: `t${i}` }, { points: 1, chain: 1, repeatFactor: 1 }, 1);
        } else {
          data[w.stat] = w.atLeast;
          s.load(data);
        }
      } else if ("task" in w) {
        for (let i = 0; i < w.atLeast; i++) s.completed({ id: w.task }, { points: 1, chain: 1, repeatFactor: 1 }, 1);
      } else {
        for (const id of "tasks" in w ? w.tasks : ctx.allTaskIds) s.completed({ id }, { points: 1, chain: 1, repeatFactor: 1 }, 1);
      }
      expect(isMet(w, s, ctx), a.id).toBe(true);
    }
  });

  it("covers the kinds of achievement the issue asks for", () => {
    const has = (f: (c: Condition) => boolean) => ACHIEVEMENTS.some((a) => f(a.when));
    expect(has((c) => "task" in c)).toBe(true);
    expect(has((c) => "tasks" in c)).toBe(true);
    expect(has((c) => "everyTask" in c)).toBe(true);
    expect(has((c) => "stat" in c && c.stat === "bestChain")).toBe(true);
    expect(has((c) => "stat" in c && c.stat === "bestAward")).toBe(true);
    expect(has((c) => "stat" in c && c.stat === "minAwards")).toBe(true);
  });
});
