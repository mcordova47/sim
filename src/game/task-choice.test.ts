import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import { InteractionSystem } from "./interaction";
import { menu, choice, say } from "./dialog";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { parseTileMap } from "./tilemap";

// Issue 039: an object offers every task that can start now; the player cycles.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const tab: Controls = { ...NO_INPUT, keys: ["Tab"], keysDown: ["Tab"] };
const shiftTab: Controls = { ...NO_INPUT, keys: ["Tab"], keysDown: ["Tab", "ShiftLeft"] };
const qKey: Controls = { ...NO_INPUT, keys: ["KeyQ"], keysDown: ["KeyQ"] };
const zone = [{ x: 100, y: 100, w: 20, h: 20 }];
const other = [{ x: 200, y: 100, w: 20, h: 20 }];
const here = { target: { x: 105, y: 106, w: 10, h: 14 } };
const there = { target: { x: 205, y: 106, w: 10, h: 14 } };
const away = { target: null };

const task = (id: string, extra: Partial<Interactable> = {}): Interactable => ({
  id, name: id, prompt: id, duration: 0.2, points: 5, cooldown: 3, zones: zone, ...extra,
});
const A = task("a");
const B = task("b");
const C = task("c");
const D = task("d", { zones: other });

const ids = (s: InteractionSystem) => s.nearby?.id;
function step(s: InteractionSystem, player = here, controls: Controls = NO_INPUT) {
  s.update(dt, player, controls);
}
function run(s: InteractionSystem, seconds: number, player = here) {
  for (let i = 0; i < Math.ceil(seconds / dt) + 1; i++) s.update(dt, player, NO_INPUT);
}

describe("choosing at an object", () => {
  it("shows the first available task, with no choice for one task", () => {
    const one = new InteractionSystem([A, D]);
    step(one);
    expect(ids(one)).toBe("a");
    expect(one.choices).toEqual([]);
    step(one, here, tab);
    expect(ids(one)).toBe("a");
    const sys = new InteractionSystem([A, B, C]);
    step(sys);
    expect(ids(sys)).toBe("a");
    expect(sys.choices.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(sys.choiceIndex).toBe(0);
  });

  it("cycles forward and wraps; Shift goes back, and wraps; Q is an alias", () => {
    const sys = new InteractionSystem([A, B, C]);
    step(sys);
    const seen: (string | undefined)[] = [];
    for (let i = 0; i < 4; i++) { step(sys, here, tab); seen.push(ids(sys)); }
    expect(seen).toEqual(["b", "c", "a", "b"]);
    step(sys, here, shiftTab);
    expect(ids(sys)).toBe("a");
    step(sys, here, shiftTab);
    expect(ids(sys)).toBe("c");
    step(sys, here, qKey);
    expect(ids(sys)).toBe("a");
    expect(sys.choiceIndex).toBe(0);
  });

  it("starts the picked task, not the first", () => {
    const sys = new InteractionSystem([A, B]);
    step(sys);
    step(sys, here, tab);
    step(sys, here, press);
    expect(sys.active?.item.id).toBe("b");
  });

  it("keeps the pick while facing the object, and forgets it on leaving or facing another", () => {
    const sys = new InteractionSystem([A, B, C, D]);
    step(sys);
    step(sys, here, tab);
    run(sys, 1);
    expect(ids(sys)).toBe("b");
    step(sys, away);
    step(sys, here);
    expect(ids(sys)).toBe("a");
    step(sys, here, tab);
    step(sys, there);
    expect(ids(sys)).toBe("d");
    step(sys, here);
    expect(ids(sys)).toBe("a");
  });

  it("keeps the pick after finishing a task when it is still available", () => {
    const sys = new InteractionSystem([A, B, C]);
    step(sys);
    step(sys, here, tab);
    step(sys, here, press);
    run(sys, 1);
    expect(sys.busy).toBe(false);
    // b is cooling down: the pick falls to the first available.
    expect(ids(sys)).toBe("a");
    expect(sys.choices.map((i) => i.id)).toEqual(["a", "c"]);
    step(sys, here, tab);
    expect(ids(sys)).toBe("c");
    // Another task finishing leaves c selected.
    const sys2 = new InteractionSystem([A, task("b", { cooldown: 0 }), C]);
    step(sys2);
    step(sys2, here, tab);
    step(sys2, here, press);
    run(sys2, 1);
    expect(ids(sys2)).toBe("b");
  });

  it("moves the pick when its task goes on cooldown or loses a requirement", () => {
    const state = new ApartmentState(STATE_VARS);
    const needsBlinds = task("b", { requires: [{ var: "blinds", min: 1, reason: "BLINDS CLOSED" }] });
    const sys = new InteractionSystem([A, needsBlinds, C], undefined, state);
    state.applyEffects([{ var: "blinds", set: 1 }]);
    step(sys);
    step(sys, here, tab);
    expect(ids(sys)).toBe("b");
    state.applyEffects([{ var: "blinds", set: 0 }]);
    step(sys);
    expect(ids(sys)).toBe("a");
    expect(sys.choices.map((i) => i.id)).toEqual(["a", "c"]);
    // Back again: the old pick is not remembered.
    state.applyEffects([{ var: "blinds", set: 1 }]);
    step(sys);
    expect(ids(sys)).toBe("a");
    expect(sys.choices.length).toBe(3);
  });

  it("does not offer tasks that cannot start, and explains the first when none can", () => {
    const state = new ApartmentState(STATE_VARS);
    const gated = (id: string) => task(id, { requires: [{ var: "blinds", min: 1, reason: `NO ${id}` }] });
    const sys = new InteractionSystem([gated("x"), gated("y")], undefined, state);
    step(sys, here, tab);
    expect(ids(sys)).toBe("x");
    expect(sys.choices).toEqual([]);
    expect(sys.unavailableReason(sys.nearby!)).toBe("NO x");
  });

  it("a cycle key never starts a task or counts as interact", () => {
    const sys = new InteractionSystem([A, B]);
    for (let i = 0; i < 5; i++) step(sys, here, tab);
    expect(sys.busy).toBe(false);
  });

  it("ignores the key while a task runs, and the frame one ends", () => {
    const sys = new InteractionSystem([A, B, C]);
    step(sys, here, press);
    expect(sys.busy).toBe(true);
    step(sys, here, tab);
    run(sys, 1);
    expect(sys.busy).toBe(false);
    expect(ids(sys)).toBe("b");
    expect(sys.choices.length).toBe(2);
  });

  it("forgets the pick when the room's tasks are swapped", () => {
    const sys = new InteractionSystem([A, B]);
    step(sys);
    step(sys, here, tab);
    sys.setItems([A, B]);
    expect(sys.choices).toEqual([]);
    step(sys);
    expect(ids(sys)).toBe("a");
  });
});

describe("choosing in the real game", () => {
  afterEach(() => vi.restoreAllMocks());
  const rooms = APARTMENT.rooms;
  const newGame = () => new Game(rooms.main, { rooms, random: () => 0.5 });
  function stand(game: Game, id: string) {
    const spot = taskSpots(rooms.main).find((s) => s.id === id)!;
    game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    game.update(dt, NO_INPUT);
  }

  it("the desk offers emails, side project, journal and tidying together", () => {
    const game = newGame();
    stand(game, "work");
    expect(game.interaction.choices.map((i) => i.id)).toEqual(["work", "side-project-game", "journal", "tidy-desk"]);
  });

  it("the sofa and the bed offer choices", () => {
    const game = newGame();
    stand(game, "doomscroll");
    expect(game.interaction.choices.length).toBeGreaterThan(1);
    const sofa = new Game(rooms.main, { rooms, random: () => 0.5 });
    const spot = taskSpots(rooms.main).find((s) => s.id === "contemplate")!;
    sofa.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    sofa.update(dt, NO_INPUT);
    expect(sofa.interaction.choices.map((i) => i.id)).toContain("contemplate");
  });

  it("exclusive tasks stay automatic: blinds", () => {
    const game = newGame();
    stand(game, "open-blinds");
    expect(game.interaction.choices).toEqual([]);
    expect(game.interaction.nearby?.id).toBe("open-blinds");
  });

  it("Tab does not cycle while a dialog is open or input is locked", () => {
    const game = newGame();
    stand(game, "work");
    const before = game.interaction.nearby?.id;
    game.dialog.start(say("Hello"));
    expect(game.dialogOpen).toBe(true);
    game.update(dt, tab);
    expect(game.interaction.nearby?.id).toBe(before);
    game.dialog.abort();
    game.update(dt, NO_INPUT);
    game.update(dt, tab);
    expect(game.interaction.nearby?.id).not.toBe(before);
  });

  it("fuzz: random keys, Escape, dialogs and locks never break the choice", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const keys = ["Tab", "KeyQ", "KeyE", "Escape", "KeyX", "ShiftLeft", "ArrowUp", "ArrowDown", "KeyA", "Space", "KeyM"];
    const objects = ["work", "doomscroll", "make-bed", "contemplate", "sort-records", "open-blinds", "coffee"];
    const game = newGame();
    let unlock: (() => void) | null = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (let i = 0; i < 6000; i++) {
      if (i % 150 === 0) stand(game, objects[Math.floor(rnd() * objects.length)]);
      const pressed = keys.filter(() => rnd() < 0.12);
      const down = [...pressed, ...keys.filter(() => rnd() < 0.05)];
      const dirs = ["up", "down", "left", "right", null] as const;
      if (unlock) { unlock(); unlock = null; }
      else if (rnd() < 0.05) unlock = game.lockInput();
      if (rnd() < 0.02 && !game.dialogOpen) game.dialog.start(rnd() < 0.5 ? say("Hi") : menu("Pick", [choice("A"), choice("B")]));
      game.update(dt, { ...NO_INPUT, keys: pressed, keysDown: down, interactPressed: pressed.includes("KeyE"), cancelPressed: pressed.includes("Escape"), dir: rnd() < 0.05 ? dirs[Math.floor(rnd() * 5)] : null });
      const s = game.interaction;
      if (s.nearby && s.choices.length > 0) {
        expect(s.choices).toContain(s.nearby);
        expect(s.choiceIndex).toBeLessThan(s.choices.length);
        expect(s.choices.every((c) => s.canStart(c))).toBe(true);
      }
      if (s.choices.length === 1) throw new Error("a choice of one");
      if (game.dialogOpen && rnd() < 0.3) game.update(dt, press);
    }
    expect(game.interaction.scoreboard.score).toBeGreaterThanOrEqual(0);
  });
});
