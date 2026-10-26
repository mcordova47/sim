import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { APARTMENT } from "./apartment";
import { pickVariant } from "./appearance";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";

// Issue 065: blinds on both east windows, and the dinner plate.

const dt = 1 / 60;
const rooms = APARTMENT.rooms;
const press = { ...NO_INPUT, interactPressed: true };
const newGame = () => new Game(rooms.main, { rooms, random: () => 0.5 });
// The main room offering only these tasks, so the table does not ask which one.
function onlyGame(...ids: string[]): Game {
  const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => ids.includes(i.id)) };
  return new Game(main, { rooms: { ...rooms, main }, random: () => 0.5 });
}

function finish(game: Game) {
  for (let i = 0; i < 60 * 30 && game.interaction.busy; i++) game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
}
function stand(game: Game, col: number, row: number, face: "up" | "down" | "left" | "right") {
  game.player.placeAt(col, row, face);
  game.update(dt, NO_INPUT);
}
// Does the task at this spot (by its target tile row) start, and which is offered?
function spotsFor(id: string, targetRows: number[]) {
  return taskSpots(rooms.main).filter((s) => s.id === id && targetRows.includes(s.target.row) && s.target.col === 18);
}
// The upper window's top tile (row 3) has the radiator to its west, so it is reached at row 4.
const UPPER = [4];
const LOWER = [6, 7];
function offeredAt(game: Game, row: number): string | undefined {
  const spot = taskSpots(rooms.main).find((s) => (s.id === "open-blinds" || s.id === "close-blinds") && s.target.row === row && s.target.col === 18);
  expect(spot, `a blinds spot at row ${row}`).toBeDefined();
  stand(game, spot!.stand.col, spot!.stand.row, spot!.face);
  return game.interaction.nearby?.id;
}
function doAt(game: Game, row: number) {
  offeredAt(game, row);
  game.update(dt, press);
  finish(game);
}
function runTask(game: Game, id: string) {
  const spot = taskSpots(rooms.main).find((s) => s.id === id)!;
  stand(game, spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, press);
  finish(game);
}

describe("blinds on both windows", () => {
  it("has both east windows reachable, each with the open and close tasks", () => {
    for (const rows of [UPPER, LOWER]) {
      for (const id of ["open-blinds", "close-blinds"]) expect(spotsFor(id, rows).length, `${id} rows ${rows}`).toBeGreaterThan(0);
    }
  });

  it("each window offers exactly the task that applies now, and either one changes both", () => {
    const game = newGame();
    for (const row of [UPPER[0], LOWER[0]]) expect(offeredAt(game, row)).toBe("open-blinds");
    doAt(game, UPPER[0]);
    expect(game.state.get("blinds")).toBe(1);
    for (const row of [UPPER[0], LOWER[0]]) expect(offeredAt(game, row)).toBe("close-blinds");
    for (let i = 0; i < 20 * 60; i++) game.update(dt, NO_INPUT);
    doAt(game, LOWER[0]);
    expect(game.state.get("blinds")).toBe(0);
    for (const row of [UPPER[0], LOWER[0]]) expect(offeredAt(game, row)).toBe("open-blinds");
  });

  it("draws both windows from the one blinds state", () => {
    const windows = (rooms.main.appearances ?? []).filter((a) => a.variants.some((v) => v.sprite === "window-blinds-open"));
    expect(windows.length).toBe(2);
    const st = new ApartmentState(STATE_VARS);
    for (const w of windows) expect(pickVariant(w.variants, st)?.sprite).toBe("window-blinds-closed");
    st.applyEffects([{ var: "blinds", set: 1 }]);
    for (const w of windows) expect(pickVariant(w.variants, st)?.sprite).toBe("window-blinds-open");
  });
});

describe("the dinner plate", () => {
  const plate = (g: Game) => g.state.get("plate");
  it("starts off, and is a saved state variable", () => {
    expect(newGame().state.get("plate")).toBe(0);
    expect(STATE_VARS.find((v) => v.id === "plate")).toMatchObject({ initial: 0, min: 0, max: 1 });
  });
  it("reheat and cook put it out, eat-dinner takes it away", () => {
    const eff = (id: string) => TASKS.find((t) => t.id === id)!.effects;
    expect(eff("reheat")).toContainEqual({ var: "plate", set: 1 });
    expect(eff("cook")).toContainEqual({ var: "plate", set: 1 });
    expect(eff("eat-dinner")).toContainEqual({ var: "plate", set: 0 });
  });
  it("works in play: reheat sets it, eating clears it, eating without one is still allowed", () => {
    // Eating with no plate out is still allowed (no requirement was added).
    const eat = onlyGame("eat-dinner");
    runTask(eat, "eat-dinner");
    expect(plate(eat)).toBe(0);
    expect(eat.state.get("energy")).toBeGreaterThan(0);
    const reheat = onlyGame("reheat");
    runTask(reheat, "reheat");
    expect(plate(reheat)).toBe(1);
    // Eating takes it away.
    const both = onlyGame("eat-dinner");
    both.state.applyEffects([{ var: "plate", set: 1 }]);
    runTask(both, "eat-dinner");
    expect(plate(both)).toBe(0);
  });
  it("sleeping does not clear it", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "plate", set: 1 }]);
    const sleep = rooms.main.interactables.find((i) => i.id === "sleep");
    expect(sleep).toBeDefined();
    expect(TASKS.find((t) => t.id === "sleep")!.effects ?? []).not.toContainEqual(expect.objectContaining({ var: "plate" }));
    expect(game.state.get("plate")).toBe(1);
  });
  it("switches the table between table-plate and table", () => {
    const t = (rooms.main.appearances ?? []).find((a) => a.variants.some((v) => v.sprite === "table-plate"))!;
    expect(t).toBeDefined();
    const st = new ApartmentState(STATE_VARS);
    expect(pickVariant(t.variants, st)?.sprite).toBe("table");
    st.applyEffects([{ var: "plate", set: 1 }]);
    expect(pickVariant(t.variants, st)?.sprite).toBe("table-plate");
  });
  it("loads an old save with no plate as plate 0", () => {
    const st = new ApartmentState(STATE_VARS);
    st.applyEffects(Object.entries({ dishes: 3 }).map(([id, v]) => ({ var: id, set: v })));
    expect(st.get("plate")).toBe(0);
  });
});
