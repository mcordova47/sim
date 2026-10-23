import { afterEach, describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { DIALOG } from "./config";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

// Where dialogs (023) meet the apartment state (021): the apartment's clock
// and energy are game time too, so they stand still while a dialog is open.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

function level(): Level {
  return {
    ...parseTileMap(["######", "#.@T.#", "######"], {
      T: {
        task: {
          id: "think",
          name: "Think",
          prompt: "Think",
          duration: 0,
          points: 1,
          dialog: menu("Hm?", [choice("Yes", say("Yes."))]),
        },
      },
    }),
    facing: "right",
  };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
}

const original = DIALOG.pauseClock;
afterEach(() => {
  DIALOG.pauseClock = original;
});

describe("dialogs and the apartment state", () => {
  it("stops the apartment clock and energy while a dialog is open, and resumes after", () => {
    const game = new Game(level());
    run(game, 1);
    game.openDialog(say("A long thought.".repeat(8)));
    const clock = game.state.get("clock");
    const energy = game.state.get("energy");
    run(game, 5);
    expect(game.dialogOpen).toBe(true);
    expect(game.state.get("clock")).toBe(clock);
    expect(game.state.get("energy")).toBe(energy);

    // Finish and close, then time moves again.
    for (let i = 0; i < 20 && game.dialogOpen; i++) {
      game.update(dt, press);
      game.update(dt, NO_INPUT);
    }
    expect(game.dialogOpen).toBe(false);
    run(game, 5);
    expect(game.state.get("clock")).not.toBe(clock);
  });

  it("lets the apartment clock run while a dialog is open if pauseClock is off", () => {
    DIALOG.pauseClock = false;
    const game = new Game(level());
    game.openDialog(say("A long thought.".repeat(8)));
    const clock = game.state.get("clock");
    run(game, 5);
    expect(game.dialogOpen).toBe(true);
    expect(game.state.get("clock")).not.toBe(clock);
  });

  it("doesn't show a yawn from energy that fell while a dialog was open", () => {
    const game = new Game(level());
    game.state.applyEffects([{ var: "energy", set: 26 }]);
    game.openDialog(say("Thinking.".repeat(20)));
    run(game, 10);
    expect(game.state.get("energy")).toBe(26);
  });

  it("still reports a dialog task's points and effects", () => {
    const game = new Game(level());
    run(game, 0.2);
    game.update(dt, press);
    expect(game.dialogOpen).toBe(true);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
  });
});
