import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { DIALOG } from "./config";
import { choice, DialogRunner, menu, say } from "./dialog";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

// Issue 081: a menu that opens during or right after a typing or notes game ignores keys for a
// moment, so a key the player was still pressing cannot pick an entry.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down" };
const delayFrames = Math.ceil(DIALOG.inputDelay / dt);

describe("DialogRunner input delay", () => {
  const two = () => menu("Pick", [choice("A"), choice("B")]);

  it("ignores presses and cursor moves during the delay, then the first press picks", () => {
    const picked: string[][] = [];
    const runner = new DialogRunner({}, 200);
    runner.start(two(), (r) => picked.push(r.path), DIALOG.inputDelay);
    for (let i = 0; i < delayFrames - 3; i++) {
      runner.update(dt, i % 2 ? press : down);
    }
    expect(runner.open).toBe(true);
    const v = runner.view!;
    expect(v.kind === "menu" && v.cursor).toBe(0);
    expect(v.kind === "menu" && v.ready).toBe(false);
    for (let i = 0; i < 5; i++) runner.update(dt, NO_INPUT);
    const ready = runner.view!;
    expect(ready.kind === "menu" && ready.ready).toBe(true);
    runner.update(dt, press);
    expect(picked).toEqual([["A"]]);
  });

  it("no delay by default", () => {
    const runner = new DialogRunner({}, 200);
    runner.start(two());
    runner.update(dt, press);
    expect(runner.open).toBe(false);
  });

  it("a say does not move on during the delay either", () => {
    const runner = new DialogRunner({}, 200);
    runner.start(say("Hi."), undefined, DIALOG.inputDelay);
    runner.update(dt, press);
    expect(runner.open).toBe(true);
  });
});

const typeTask = (lines: string[]): Omit<Interactable, "zones"> => ({
  id: "work", name: "Answer emails", prompt: "Work", duration: 1, points: 10,
  activity: { type: "typing", lines: lines.length, text: lines },
});
const notesTask: Omit<Interactable, "zones"> = {
  id: "notes", name: "Practice", prompt: "Practice", duration: 1, points: 10, activity: { type: "notes", count: 1 },
};
const room = (task: Omit<Interactable, "zones">): Level => ({
  ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task] } }),
  facing: "right",
});
const menuOpen = (g: Game) => g.dialogView?.kind === "menu";

describe("the encounter menu after Answer emails", () => {
  it("is not chosen by keys still being typed, and the first press after the delay does choose", () => {
    const queue = [0.1, 0.01];
    const game = new Game(room(typeTask(["ab"])), { random: () => (queue.length ? queue.shift()! : 0.5) });
    game.deliveries.advance(60);
    game.update(dt, NO_INPUT);
    game.update(dt, press); // deliberate press starts typing
    // The last letters, one of them also E (an interact press), end the game.
    game.update(dt, { ...NO_INPUT, keys: ["KeyA"] });
    game.update(dt, { ...NO_INPUT, keys: ["KeyE"], interactPressed: true });
    expect(menuOpen(game)).toBe(true);
    // The player keeps mashing for just under the delay.
    for (let i = 0; i < delayFrames - 3; i++) game.update(dt, { ...press, keys: ["KeyE"], dirPressed: i % 2 ? "down" : "up" });
    expect(menuOpen(game)).toBe(true);
    const v = game.dialogView!;
    expect(v.kind === "menu" && v.cursor).toBe(0);
    expect(game.interaction.active?.item.encounter).toBe(true);
    for (let i = 0; i < 8; i++) game.update(dt, NO_INPUT);
    game.update(dt, press);
    expect(game.dialogView === null || game.dialogView.kind === "say" || game.interaction.active !== null).toBe(true);
    expect(game.dialogView?.kind === "menu").toBe(false); // Ignore was picked
  });
});

describe("other menus", () => {
  const g = (task: Omit<Interactable, "zones">) => new Game(room(task), { random: () => 0.5 });

  it("a menu opened while the notes game runs ignores arrows and E at first", () => {
    const game = g(notesTask);
    game.update(dt, NO_INPUT);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
    expect(game.openDialog(menu("Pick", [choice("A"), choice("B")]))).toBe(true);
    for (let i = 0; i < delayFrames - 3; i++) game.update(dt, { ...press, dirPressed: "down" });
    expect(game.dialogOpen).toBe(true);
    const v = game.dialogView!;
    expect(v.kind === "menu" && v.cursor).toBe(0);
    for (let i = 0; i < 8; i++) game.update(dt, NO_INPUT);
    game.update(dt, { ...NO_INPUT, dirPressed: "down" });
    const after = game.dialogView!;
    expect(after.kind === "menu" && after.cursor).toBe(1);
  });

  it("a menu opened by a deliberate press, with no typing game near, is not delayed", () => {
    const game = g(typeTask(["ab"]));
    for (let i = 0; i < 60; i++) game.update(dt, NO_INPUT);
    game.openDialog(menu("Pick", [choice("A"), choice("B")]));
    game.update(dt, { ...NO_INPUT, dirPressed: "down" });
    const v = game.dialogView!;
    expect(v.kind === "menu" && v.cursor).toBe(1);
    expect(v.kind === "menu" && v.ready).toBe(true);
  });
});

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

const startTask = (game: Game) => {
  game.update(dt, NO_INPUT);
  game.update(dt, press);
  expect(game.interaction.busy).toBe(true);
};

describe("global hotkeys while a key game runs", () => {
  it("L does not open the list during the typing game, nor right after it, until keys were let go", () => {
    const game = new Game(room(typeTask(["abcdef"])), { random: () => 0.5 });
    const keys = new FakeKeys();
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys, start: "main" });
    startTask(game);
    game.update(dt, { ...NO_INPUT, keys: ["KeyA"] });
    keys.press("KeyL");
    expect(feature.listVisible).toBe(false);
    for (const k of ["KeyB", "KeyC", "KeyD", "KeyE", "KeyF"]) game.update(dt, { ...NO_INPUT, keys: [k], keysDown: [k] });
    expect(game.interaction.busy).toBe(false);
    // A keydown that arrives between frames, after the game ended: still the game's.
    keys.press("KeyL");
    expect(feature.listVisible).toBe(false);
    game.update(dt, { ...NO_INPUT, keysDown: ["KeyL"] });
    keys.press("KeyL");
    expect(feature.listVisible).toBe(false);
    // Everything let go for a frame: hotkeys work again.
    game.update(dt, NO_INPUT);
    keys.press("KeyL");
    expect(feature.listVisible).toBe(true);
  });
});

describe("keys still held when a key game ends", () => {
  const left = (extra: Partial<Controls> = {}): Controls => ({ ...NO_INPUT, dir: "left", keysDown: ["ArrowLeft"], ...extra });

  it("do not walk the player after the notes game, until released once", () => {
    const game = new Game(room(notesTask), { random: () => 0.5 });
    startTask(game);
    const col = game.player.col;
    for (let i = 0; i < 200 && game.interaction.busy; i++) game.update(dt, left());
    expect(game.interaction.busy).toBe(false);
    for (let i = 0; i < 60; i++) game.update(dt, left());
    expect(game.player.col).toBe(col);
    expect(game.player.stepping).toBe(false);
    game.update(dt, NO_INPUT);
    for (let i = 0; i < 40; i++) game.update(dt, left());
    expect(game.player.col).toBeLessThan(col);
  });

  it("do not walk the player after the typing game either", () => {
    const game = new Game(room(typeTask(["ab"])), { random: () => 0.5 });
    startTask(game);
    const col = game.player.col;
    game.update(dt, { ...left(), keys: ["KeyA"], dirPressed: "left" });
    game.update(dt, { ...left(), keys: ["KeyA"], dirPressed: "left" });
    expect(game.interaction.busy).toBe(false);
    for (let i = 0; i < 40; i++) game.update(dt, left());
    expect(game.player.col).toBe(col);
  });

  it("Escape out of a game is not gated: the player can act at once", () => {
    const game = new Game(room(notesTask), { random: () => 0.5 });
    startTask(game);
    game.update(dt, { ...NO_INPUT, keys: ["Escape"], cancelPressed: true });
    expect(game.interaction.busy).toBe(false);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
  });

  it("a key whose release never arrives (Caps Lock, a Cmd letter) cannot lock the player out", () => {
    const game = new Game(room(notesTask), { random: () => 0.5 });
    startTask(game);
    const col = game.player.col;
    const stuck = (extra: Partial<Controls> = {}): Controls => ({ ...NO_INPUT, keysDown: ["CapsLock"], ...extra });
    for (let i = 0; i < 200 && game.interaction.busy; i++) game.update(dt, stuck());
    // Caps Lock alone is not a held key: after one quiet frame walking works.
    game.update(dt, stuck());
    for (let i = 0; i < 40; i++) game.update(dt, stuck({ dir: "left" }));
    expect(game.player.col).toBeLessThan(col);
  });

  it("any other stuck key lets go of the gate after a short time", () => {
    const game = new Game(room(notesTask), { random: () => 0.5 });
    startTask(game);
    const col = game.player.col;
    const stuck = (extra: Partial<Controls> = {}): Controls => ({ ...NO_INPUT, keysDown: ["KeyV"], ...extra });
    for (let i = 0; i < 200 && game.interaction.busy; i++) game.update(dt, stuck());
    for (let i = 0; i < Math.ceil((DIALOG.gateMaxSeconds + 1) / dt); i++) game.update(dt, stuck());
    for (let i = 0; i < 40; i++) game.update(dt, stuck({ dir: "left" }));
    expect(game.player.col).toBeLessThan(col);
  });
});
