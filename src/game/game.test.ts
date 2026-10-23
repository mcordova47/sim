import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { Game } from "./game";
import type { Level } from "./level";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

// A flat floor with one task right where the player spawns.
const level: Level = {
  size: { width: 300, height: 120 },
  solids: [{ x: 0, y: 100, w: 300, h: 20 }],
  interactables: [
    {
      id: "sink",
      name: "Do the dishes",
      prompt: "Do the dishes",
      duration: 1,
      points: 20,
      zone: { x: 40, y: 80, w: 40, h: 20 },
    },
  ],
  spawn: { x: 50, y: 86 },
};

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

describe("Game", () => {
  it("settles the player onto the floor", () => {
    const game = new Game(level);
    run(game, 1);
    expect(game.player.grounded).toBe(true);
    expect(game.player.y + game.player.h).toBe(100);
  });

  it("moves the player with input", () => {
    const game = new Game(level);
    run(game, 0.5);
    const x = game.player.x;
    run(game, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(game.player.x).toBeGreaterThan(x);
  });

  it("runs a task: locks the player, then awards points", () => {
    const game = new Game(level);
    run(game, 0.5);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);

    // Held-right input is ignored while the task runs.
    const x = game.player.x;
    run(game, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(game.player.x).toBeLessThan(x + 1);
    expect(game.interaction.busy).toBe(true);

    run(game, 0.6);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(20);
  });

  it("doesn't need a browser to run its logic", () => {
    // update() never touches the canvas; constructing and stepping is enough.
    expect(() => run(new Game(level), 2)).not.toThrow();
  });
});
