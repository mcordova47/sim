import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { DIALOG } from "./config";
import { choice, menu, say } from "./dialog";
import type { GameEvents } from "./events";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const hold = (dir: Controls["dir"]): Controls => ({ ...NO_INPUT, dir });
const tap = (dir: NonNullable<Controls["dir"]>): Controls => ({ ...NO_INPUT, dir, dirPressed: dir });

const think: Omit<Interactable, "zone"> = {
  id: "think",
  name: "Think",
  prompt: "Think",
  duration: 0,
  points: 5,
  dialog: menu("Think about what?", [choice("Stuff", say("Stuff is stuff.")), choice("Nothing")]),
};

// The player starts at @ facing right, with the thinking spot (T) next to them.
function level(): Level {
  const map = parseTileMap(
    ["##########", "#........#", "#..@T....#", "#........#", "##########"],
    { T: { color: "leaf", task: think } },
  );
  return { ...map, facing: "right" };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
}

function listen(game: Game) {
  const log: { name: keyof GameEvents; payload: unknown }[] = [];
  for (const name of [
    "taskStart", "taskComplete", "taskBlocked", "dialogOpen", "dialogChoose", "dialogClose",
  ] as const) {
    game.events.on(name, (payload) => log.push({ name, payload }));
  }
  return log;
}
const names = (log: { name: string }[]) => log.map((e) => e.name);

afterEach(() => vi.restoreAllMocks());

describe("Game.lockInput", () => {
  it("freezes the player and stops tasks from starting until released", () => {
    const game = new Game(level());
    const release = game.lockInput();
    expect(game.inputLocked).toBe(true);
    run(game, 1, hold("left"));
    expect([game.player.col, game.player.row]).toEqual([3, 2]);
    run(game, 0.2, hold("right"));
    game.update(dt, press);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(0);

    release();
    expect(game.inputLocked).toBe(false);
    run(game, 0.5, hold("left"));
    expect(game.player.col).toBeLessThan(3);
  });

  it("needs every lock released, and releasing twice is harmless", () => {
    const game = new Game(level());
    const a = game.lockInput();
    const b = game.lockInput();
    a();
    a();
    expect(game.inputLocked).toBe(true);
    b();
    expect(game.inputLocked).toBe(false);
  });

  it("lets a step that has started finish while locked", () => {
    const game = new Game(level());
    run(game, 0.3, hold("left")); // partway through a step
    const release = game.lockInput();
    run(game, 0.5, NO_INPUT);
    expect(game.player.stepping).toBe(false);
    release();
  });
});

describe("Game dialogs", () => {
  it("opens a dialog when a task with one starts, and freezes the player", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    // The dialog opens as the task starts; the task itself is instant.
    expect(names(log)).toEqual(["taskStart", "dialogOpen", "taskComplete"]);
    expect(game.dialogOpen).toBe(true);
    expect(game.inputLocked).toBe(true);
    run(game, 1, hold("left"));
    expect([game.player.col, game.player.row]).toEqual([3, 2]);
  });

  it("doesn't let the press that opened the dialog also choose an entry", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    expect(names(log)).not.toContain("dialogChoose");
    expect(game.dialogOpen).toBe(true);
  });

  it("runs the whole conversation: choose, read the reply, close, then walk again", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press); // opens
    game.update(dt, press); // choose "Stuff"
    expect(log.at(-1)).toMatchObject({
      name: "dialogChoose",
      payload: { label: "Stuff", path: ["Stuff"] },
    });
    run(game, 1); // the reply types out
    game.update(dt, press); // finish the page (already showing)
    expect(game.dialogOpen).toBe(false);
    expect(names(log).at(-1)).toBe("dialogClose");
    expect(game.inputLocked).toBe(false);
    run(game, 0.5, hold("left"));
    expect(game.player.col).toBeLessThan(3);
  });

  it("closes on cancel, and gives the controls back", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    game.update(dt, { ...NO_INPUT, cancelPressed: true });
    expect(game.dialogOpen).toBe(false);
    expect(names(log)).toEqual(["taskStart", "dialogOpen", "taskComplete", "dialogClose"]);
    expect(game.inputLocked).toBe(false);
  });

  it("moves the menu cursor with direction presses and not with held keys", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    game.update(dt, hold("down")); // held, not pressed: nothing happens
    game.update(dt, press);
    expect(log.at(-1)).toMatchObject({ payload: { label: "Stuff" } });
  });

  it("moves the cursor down and picks the second entry", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    game.update(dt, tap("down"));
    game.update(dt, press);
    expect(log.at(-2)).toMatchObject({ name: "dialogChoose", payload: { label: "Nothing" } });
    expect(game.dialogOpen).toBe(false); // "Nothing" has no reply
  });

  it("stands the game clock still while the dialog is open", () => {
    const game = new Game(level());
    game.update(dt, press);
    const before = game.interaction.time;
    run(game, 3);
    expect(game.interaction.time).toBe(before);
    game.update(dt, { ...NO_INPUT, cancelPressed: true });
    run(game, 1);
    expect(game.interaction.time).toBeGreaterThan(before + 0.9);
    expect(DIALOG.pauseClock).toBe(true);
  });

  it("doesn't count the press that closes the dialog as a press on a cooling task", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press); // task ran, now cooling down; dialog open
    game.update(dt, press); // choose "Stuff"
    run(game, 1);
    game.update(dt, press); // close
    expect(names(log)).not.toContain("taskBlocked");
    // A fresh press after closing is refused as usual.
    game.update(dt, NO_INPUT);
    game.update(dt, press);
    expect(names(log)).toContain("taskBlocked");
  });

  it("won't open a second dialog on top of the first", () => {
    const game = new Game(level());
    game.update(dt, press);
    expect(game.openDialog(say("another"))).toBe(false);
  });

  it("can be opened directly, with the controls handed back when it closes", () => {
    const game = new Game(level());
    const log = listen(game);
    expect(game.openDialog(say("Hello."))).toBe(true);
    expect(names(log)).toEqual(["dialogOpen"]);
    run(game, 1);
    game.update(dt, press);
    expect(names(log)).toEqual(["dialogOpen", "dialogClose"]);
    expect(game.inputLocked).toBe(false);
  });

  it("keeps another lock in place after a dialog closes", () => {
    const game = new Game(level());
    const other = game.lockInput();
    game.openDialog(say("Hello."));
    run(game, 1);
    game.update(dt, press);
    expect(game.dialogOpen).toBe(false);
    expect(game.inputLocked).toBe(true);
    other();
    expect(game.inputLocked).toBe(false);
  });
});

describe("Game dialog results", () => {
  it("reports what was picked when the dialog closes, in the event and the callback", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press); // the task opens its own dialog
    game.update(dt, press); // choose "Stuff"
    run(game, 1);
    game.update(dt, press); // close
    expect(log.at(-1)).toMatchObject({ name: "dialogClose", payload: { path: ["Stuff"] } });

    const got: string[][] = [];
    const g2 = new Game(level());
    const l2 = listen(g2);
    g2.openDialog(menu("Pick", [choice("A"), choice("B")]), (r) => got.push(r.path));
    g2.update(dt, tap("down"));
    g2.update(dt, press); // B
    expect(got).toEqual([["B"]]);
    expect(l2.at(-1)).toMatchObject({ name: "dialogClose", payload: { path: ["B"] } });
  });

  it("gives an empty path when the dialog is backed out of", () => {
    const game = new Game(level());
    const log = listen(game);
    game.update(dt, press);
    game.update(dt, { ...NO_INPUT, cancelPressed: true });
    expect(log.at(-1)).toMatchObject({ name: "dialogClose", payload: { path: [] } });
  });
});

describe("a press made just before a dialog opens", () => {
  it("is forgotten, so it doesn't start a task when the dialog closes", () => {
    // Facing a wall (up), so a press does nothing yet but is remembered for a moment.
    const game = new Game({ ...level(), facing: "up" });
    const log = listen(game);
    game.update(dt, press);
    game.openDialog(say("Hello."));
    run(game, 1);
    game.update(dt, press); // closes the dialog
    expect(game.dialogOpen).toBe(false);
    // Turn to face the thinking spot; no new press.
    run(game, 0.3, hold("right"));
    expect(names(log)).not.toContain("taskStart");
    expect(game.interaction.busy).toBe(false);
  });
});
