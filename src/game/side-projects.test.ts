import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { spriteNames } from "../render/sprite-names";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { SIDE_PROJECTS, sideProjectTask } from "./side-projects";
import { TASKS } from "./tasks";

// Issue 051: side projects, and the one written so far (this game, on a small screen).

const dt = 1 / 60;
const press = { ...NO_INPUT, interactPressed: true };
const esc = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const rooms = APARTMENT.rooms;
const ID = "side-project-game";

afterEach(() => vi.unstubAllGlobals());
const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;

function deskGame(drawn: string[] = [], only = true) {
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const sprites = { has: () => true, draw: (_c: unknown, name: string) => void drawn.push(name) };
  const keep = (id: string) => (only ? id === ID : true);
  const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => keep(i.id)) };
  const game = new Game(main, { rooms: { ...rooms, main }, random: () => 0.5, sprites });
  const spot = taskSpots(rooms.main).find((s) => s.id === ID)!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  return { game, spot, drawn };
}

describe("side projects as data", () => {
  it("each entry becomes a task with its own points, cooldown and mood", () => {
    for (const p of SIDE_PROJECTS) {
      const task = TASKS.find((t) => t.id === p.id)!;
      expect(task, p.id).toBeDefined();
      expect(task.points).toBe(p.points);
      expect(task.cooldown).toBe(p.cooldown);
      expect(task.effects).toContainEqual({ var: "mood", add: p.mood });
      expect(sideProjectTask(p)).toEqual(task);
    }
  });

  it("has unique ids and plain text the pixel font can draw", () => {
    expect(new Set(SIDE_PROJECTS.map((p) => p.id)).size).toBe(SIDE_PROJECTS.length);
    for (const p of SIDE_PROJECTS) {
      for (const text of [p.name, p.prompt, p.flavor, ...p.lines]) expect(unsupportedChars(text), text).toEqual([]);
    }
  });

  it("the picture is a sprite the game loads at start", () => {
    for (const p of SIDE_PROJECTS) expect(spriteNames(Object.values(rooms))).toContain(p.view);
  });

  it("is offered at the standing desk, after work", () => {
    const desk = rooms.main.pieces.find((p) => p.name === "standing desk")!;
    const at = (id: string) =>
      rooms.main.interactables.some(
        (i) => i.id === id && i.zones.some((z) => desk.tiles.some((t) => t.col * 16 === z.x && t.row * 16 === z.y)),
      );
    expect(at(ID)).toBe(true);
    expect(at("work")).toBe(true);
  });
});

describe("working on the side project", () => {
  it("shows the small-screen picture over the world, then puts the normal view back", () => {
    const { game, spot, drawn } = deskGame();
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe(ID);
    let shown = false;
    for (let i = 0; i < 60 * 60 && game.interaction.busy; i++) {
      expect(game.player.col).toBe(spot.stand.col);
      if (game.dialogOpen) {
        drawn.length = 0;
        game.render(ctx, 1);
        if (drawn.includes("view-side-project")) shown = true;
      }
      game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
    }
    expect(shown).toBe(true);
    expect(game.interaction.busy).toBe(false);
    drawn.length = 0;
    game.render(ctx, 1);
    expect(drawn).not.toContain("view-side-project");
    expect(game.inputLocked).toBe(false);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
  });

  it("raises mood a little, costs a little energy, and cools down", () => {
    const { game } = deskGame();
    game.state.applyEffects([{ var: "mood", set: 50 }, { var: "energy", set: 80 }]);
    game.update(dt, press);
    for (let i = 0; i < 60 * 60 && game.interaction.busy; i++) game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
    expect(game.state.get("mood")).toBeGreaterThan(50);
    expect(game.state.get("energy")).toBeLessThan(80);
    const item = rooms.main.interactables.find((i) => i.id === ID)!;
    expect(game.interaction.cooldownRemaining(item)).toBeGreaterThan(60);
  });

  it("is refused when worn out", () => {
    const { game } = deskGame();
    game.state.applyEffects([{ var: "energy", set: 3 }]);
    const item = rooms.main.interactables.find((i) => i.id === ID)!;
    expect(game.interaction.unavailableReason(item)).toBe("TOO TIRED FOR IT");
  });

  it("Escape at any point restores the view, releases the lock and pays nothing", () => {
    for (const settle of [1, 10, 40, 120]) {
      const { game, drawn } = deskGame();
      game.update(dt, press);
      for (let i = 0; i < settle; i++) game.update(dt, game.dialogOpen && i % 50 === 0 ? press : NO_INPUT);
      expect(game.interaction.busy, `settle ${settle} still running`).toBe(true);
      game.update(dt, esc);
      expect(game.interaction.busy || game.dialogOpen, `settle ${settle}`).toBe(false);
      drawn.length = 0;
      game.render(ctx, 1);
      expect(drawn).not.toContain("view-side-project");
      expect(game.inputLocked).toBe(false);
      expect(game.interaction.scoreboard.score).toBe(0);
    }
  });

  it("takes its turn at the desk once work is cooling down", () => {
    const { game } = deskGame([], false);
    game.update(dt, NO_INPUT);
    expect(game.interaction.nearby?.id).toBe("work");
    (game.interaction as unknown as { readyAt: Map<string, number> }).readyAt.set("work", 1e9);
    game.update(dt, NO_INPUT);
    expect(game.interaction.nearby?.id).toBe(ID);
  });
});
