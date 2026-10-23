import { describe, expect, it } from "vitest";
import { Stats } from "./stats";

const award = (points: number, chain = 1, repeatFactor = 1) => ({ points, chain, repeatFactor });

describe("Stats", () => {
  it("counts completions per task and in total", () => {
    const s = new Stats();
    s.completed({ id: "coffee" }, award(70), 70);
    s.completed({ id: "coffee" }, award(35, 1, 0.5), 105);
    s.completed({ id: "dishes" }, award(80), 185);
    expect(s.taskCount("coffee")).toBe(2);
    expect(s.taskCount("dishes")).toBe(1);
    expect(s.taskCount("nothing")).toBe(0);
    expect(s.number("completions")).toBe(3);
    expect(s.number("totalPoints")).toBe(185);
  });

  it("keeps the best chain, best award and best score", () => {
    const s = new Stats();
    s.completed({ id: "a" }, award(50, 3), 50);
    s.completed({ id: "b" }, award(20, 1), 70);
    expect(s.number("bestChain")).toBe(3);
    expect(s.number("bestAward")).toBe(50);
    expect(s.number("bestScore")).toBe(70);
  });

  it("counts a repeat that only paid the minimum", () => {
    const s = new Stats();
    s.completed({ id: "a" }, award(1, 1, 1), 1); // a cheap first completion is not a repeat
    expect(s.number("minAwards")).toBe(0);
    s.completed({ id: "a" }, award(1, 1, 0.125), 2);
    expect(s.number("minAwards")).toBe(1);
  });

  it("counts steps, bumps, cancelled tasks, rooms and time played", () => {
    const s = new Stats();
    s.stepped();
    s.stepped();
    s.bumped();
    s.cancel();
    s.visited("main");
    s.visited("main");
    s.visited("bath");
    s.played(1.5);
    s.played(-3);
    s.played(NaN);
    expect(s.number("steps")).toBe(2);
    expect(s.number("bumps")).toBe(1);
    expect(s.number("cancelled")).toBe(1);
    expect(s.number("roomsVisited")).toBe(2);
    expect(s.number("playSeconds")).toBe(1.5);
  });

  it("round trips through its saved form", () => {
    const s = new Stats();
    s.completed({ id: "a" }, award(10, 2), 10);
    s.stepped();
    s.visited("main");
    const copy = new Stats(JSON.parse(JSON.stringify(s.toJSON())));
    expect(copy.toJSON()).toEqual(s.toJSON());
  });

  it("does not let the saved copy change the live stats", () => {
    const s = new Stats();
    const data = s.toJSON();
    data.taskCounts.x = 5;
    data.rooms.push("y");
    expect(s.taskCount("x")).toBe(0);
    expect(s.number("roomsVisited")).toBe(0);
  });

  it("ignores damaged saved data field by field", () => {
    const s = new Stats({
      totalPoints: "lots",
      steps: -4,
      bumps: 7.9,
      bestChain: Infinity,
      taskCounts: { coffee: 2, dishes: "x", sleep: -1 },
      rooms: ["main", 3, "main"],
      playSeconds: "x",
      extra: true,
    });
    expect(s.number("totalPoints")).toBe(0);
    expect(s.number("steps")).toBe(0);
    expect(s.number("bumps")).toBe(7);
    expect(s.number("bestChain")).toBe(0);
    expect(s.toJSON().taskCounts).toEqual({ coffee: 2 });
    expect(s.toJSON().rooms).toEqual(["main"]);
    expect(s.number("playSeconds")).toBe(0);
  });

  it.each([null, 5, "text", [1, 2], { taskCounts: [1] }])("starts fresh from %j", (junk) => {
    const s = new Stats(junk);
    expect(s.number("completions")).toBe(0);
    expect(s.toJSON().taskCounts).toEqual({});
  });

  it("resets to nothing", () => {
    const s = new Stats();
    s.stepped();
    s.completed({ id: "a" }, award(5), 5);
    s.reset();
    expect(s.number("steps")).toBe(0);
    expect(s.number("completions")).toBe(0);
  });
});
