import { describe, expect, it } from "vitest";
import type { Achievement } from "./data";
import { Stats } from "./stats";
import { Unlocks, isMet } from "./unlock";

const list: Achievement[] = [
  { id: "a3", name: "A", description: "a", when: { task: "a", atLeast: 3 } },
  { id: "ab", name: "B", description: "b", when: { tasks: ["a", "b"] } },
  { id: "all", name: "C", description: "c", when: { everyTask: true } },
  { id: "steps", name: "D", description: "d", when: { stat: "steps", atLeast: 2 } },
];
const ctx = { allTaskIds: ["a", "b"] };
const done = (s: Stats, id: string) => s.completed({ id }, { points: 1, chain: 1, repeatFactor: 1 }, 1);

describe("Unlocks", () => {
  it("unlocks when a condition is met and says which ones are new", () => {
    const u = new Unlocks(list);
    const s = new Stats();
    expect(u.check(s, ctx)).toEqual([]);
    s.stepped();
    s.stepped();
    expect(u.check(s, ctx).map((a) => a.id)).toEqual(["steps"]);
    expect(u.has("steps")).toBe(true);
    expect(u.has("a3")).toBe(false);
  });

  it("never unlocks the same achievement twice", () => {
    const u = new Unlocks(list);
    const s = new Stats();
    s.stepped();
    s.stepped();
    expect(u.check(s, ctx)).toHaveLength(1);
    s.stepped();
    expect(u.check(s, ctx)).toEqual([]);
    expect(u.count).toBe(1);
  });

  it("does not unlock again after loading what was saved", () => {
    const first = new Unlocks(list);
    const s = new Stats();
    s.stepped();
    s.stepped();
    first.check(s, ctx);
    const second = new Unlocks(list);
    second.load(first.ids());
    expect(second.check(s, ctx)).toEqual([]);
  });

  it("can unlock several at once", () => {
    const u = new Unlocks(list);
    const s = new Stats();
    done(s, "a");
    done(s, "b");
    expect(u.check(s, ctx).map((a) => a.id)).toEqual(["ab", "all"]);
  });

  it("ignores unknown and malformed saved ids", () => {
    const u = new Unlocks(list);
    u.load(["steps", "gone", 4, null, {}]);
    expect(u.ids()).toEqual(["steps"]);
    u.load("steps");
    expect(u.count).toBe(0);
    u.load(undefined);
    expect(u.count).toBe(0);
  });

  it("lists unlocked ids in the order of the list", () => {
    const u = new Unlocks(list);
    u.load(["steps", "ab"]);
    expect(u.ids()).toEqual(["ab", "steps"]);
  });
});

describe("isMet", () => {
  it("counts a repeated task up to the threshold", () => {
    const s = new Stats();
    done(s, "a");
    done(s, "a");
    expect(isMet(list[0].when, s, ctx)).toBe(false);
    done(s, "a");
    expect(isMet(list[0].when, s, ctx)).toBe(true);
  });

  it("needs every task for a group, and never counts an empty game as complete", () => {
    const s = new Stats();
    done(s, "a");
    expect(isMet({ tasks: ["a", "b"] }, s, ctx)).toBe(false);
    expect(isMet({ everyTask: true }, s, { allTaskIds: [] })).toBe(false);
    done(s, "b");
    expect(isMet({ everyTask: true }, s, ctx)).toBe(true);
  });
});
