import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { validateLevel } from "./level";
import { PLACEHOLDER_LEVEL } from "./placeholder-level";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";

// The state rules (issue 021) on the real task list and the real apartment.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const known = new Set(STATE_VARS.map((v) => v.id));

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
}

// A tiny room with one object that offers the given task ids, the player next to it.
function roomWith(taskIds: string[]) {
  const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: taskIds } }, { tasks: TASKS });
  return new Game({ ...level, facing: "right" });
}

describe("the state rules in the task list", () => {
  it("only name state variables that exist", () => {
    const bad: string[] = [];
    const checkName = (where: string, name: string) => {
      if (!known.has(name)) bad.push(`${where}: "${name}"`);
    };
    for (const task of TASKS) {
      for (const r of task.requires ?? []) {
        for (const c of "anyOf" in r ? r.anyOf : [r]) checkName(`${task.id} requires`, c.var);
      }
      for (const e of task.effects ?? []) checkName(`${task.id} effects`, e.var);
      if (task.pointsBonus) checkName(`${task.id} pointsBonus`, task.pointsBonus.var);
    }
    for (const room of Object.values(APARTMENT.rooms)) {
      for (const a of room.appearances ?? []) {
        for (const v of a.variants) for (const c of v.when ?? []) checkName(`${room.id} variant`, c.var);
      }
    }
    expect(bad).toEqual([]);
  });

  it("gives the bed and the sink their looks in the real rooms", () => {
    const main = APARTMENT.rooms.main.appearances ?? [];
    const kitchen = APARTMENT.rooms.kitchen.appearances ?? [];
    expect(main.some((a) => a.variants.some((v) => v.sprite === "bed-unmade"))).toBe(true);
    expect(kitchen.some((a) => a.variants.some((v) => v.sprite === "dishes-3"))).toBe(true);
  });

  it("offers sleeping at the bed and contemplating at the sofa", () => {
    const where = (id: string) =>
      Object.values(APARTMENT.rooms)
        .filter((r) => r.interactables.some((i) => i.id === id))
        .map((r) => r.id);
    expect(where("sleep")).toEqual(["main"]);
    expect(where("contemplate")).toEqual(["main"]);
  });

  it("makes dishes when you eat and clears them when you wash up", () => {
    const eat = roomWith(["eat-dinner"]);
    const before = eat.state.get("dishes");
    eat.update(dt, press);
    run(eat, 8);
    expect(eat.state.get("dishes")).toBe(before + 2);

    const wash = roomWith(["dishes"]);
    expect(wash.state.get("dishes")).toBeGreaterThan(0);
    wash.update(dt, press);
    run(wash, 8);
    expect(wash.state.get("dishes")).toBe(0);
  });

  it("won't wash dishes when there are none, and says why", () => {
    const wash = roomWith(["dishes"]);
    wash.update(dt, press);
    run(wash, 8);
    expect(wash.state.get("dishes")).toBe(0);
    const blocked: string[] = [];
    wash.events.on("taskBlocked", (e) => blocked.push(e.message ?? e.reason));
    run(wash, 50);
    wash.update(dt, press);
    expect(blocked).toEqual(["NO DIRTY DISHES"]);
  });

  it("makes the bed once, and sleeping unmakes it and restores energy", () => {
    const bed = roomWith(["make-bed", "sleep"]);
    bed.update(dt, press);
    run(bed, 4);
    expect(bed.state.get("bedMade")).toBe(1);

    // Tired enough to sleep: energy low.
    bed.state.applyEffects([{ var: "energy", set: 20 }]);
    run(bed, 31); // past the make-bed cooldown
    bed.update(dt, press); // "make the bed" is refused (already made), so sleep is offered
    run(bed, 8);
    expect(bed.state.get("energy")).toBeGreaterThan(95); // restored (it ebbs a little as time goes on)
    expect(bed.state.get("bedMade")).toBe(0);
  });

  it("stops work when too tired, and work costs energy", () => {
    const desk = roomWith(["work"]);
    const before = desk.state.get("energy");
    desk.update(dt, press);
    run(desk, 6);
    expect(desk.state.get("energy")).toBeLessThan(before);
  });

  it("builds every real room and the placeholder room with only known variables", () => {
    for (const room of [...Object.values(APARTMENT.rooms), PLACEHOLDER_LEVEL]) {
      expect(() => validateLevel(room), room.id).not.toThrow();
    }
  });

  it("fails when the room is built if a task in the list has a typo'd variable", () => {
    const typo = { ...TASKS.find((t) => t.id === "dishes")!, id: "typo-task", effects: [{ var: "dishs", add: -1 }] };
    expect(() => parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: ["typo-task"] } }, { id: "oops", tasks: [typo, ...TASKS] })).toThrow(
      /oops: task "typo-task" effects uses the unknown state variable "dishs"/,
    );
  });

  it("announces a task's changes only after all of its effects have applied (sleep)", () => {
    const bed = roomWith(["make-bed", "sleep"]);
    bed.update(dt, press);
    run(bed, 4); // bed made
    bed.state.applyEffects([{ var: "energy", set: 20 }]);
    run(bed, 31);
    const seen: { id: string; energy: number; bedMade: number }[] = [];
    bed.events.on("stateChanged", (c) =>
      seen.push({ id: c.id, energy: Math.round(bed.state.get("energy")), bedMade: bed.state.get("bedMade") }),
    );
    bed.update(dt, press);
    run(bed, 8);
    const sleepEvents = seen.filter((e) => e.id === "energy" || e.id === "bedMade");
    expect(sleepEvents.length).toBeGreaterThanOrEqual(2);
    const first = sleepEvents[0];
    expect(first.energy).toBeGreaterThan(95);
    expect(first.bedMade).toBe(0);
  });
});
