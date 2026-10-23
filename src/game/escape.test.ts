import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";
import { APARTMENT } from "./apartment";
import { taskSpots } from "./plan-checks";
import { STATE_VARS } from "./state-vars";

// Escape during every kind of action, at every stage (issue 046). One row per
// case; each must end with no points, no apartment changes, no cooldown, the
// dialog closed, the input lock released and any view cleared.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
// What the real keyboard gives for Escape.
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };

type Task = Omit<Interactable, "zones">;
const base = { duration: 0, points: 100, effects: [{ var: "dishes", add: 1 }] } as unknown as Partial<Task>;

function room(task: Task): Level {
  const rows = ["#########", "#.......#", "#..@X...#", "#.......#", "#########"];
  return { ...parseTileMap(rows, { X: { tasks: [task] } }), facing: "right" };
}

const t = (id: string, extra: Partial<Task>): Task =>
  ({ id, name: id, prompt: id, duration: 0, points: 100, ...extra }) as Task;

interface Case {
  name: string;
  task: Task;
  // Frames of no input before Escape (lets the activity reach this stage).
  settle: number;
  // The scene moved the player away from the object, so it can't be restarted from there.
  moved?: boolean;
  // The thing that should be up when Escape is pressed.
  expectDialog?: boolean;
}

const cases: Case[] = [
  { name: "wait", task: t("wait", { duration: 5, effects: base.effects }), settle: 30 },
  { name: "dialog: menu up", task: t("dlg", { dialog: menu("Pick", [choice("A", say("a")), choice("B")]) , activity: { type: "dialog" }, effects: base.effects }), settle: 5, expectDialog: true },
  { name: "dialog: nested menu", task: t("dlg2", { dialog: menu("Pick", [choice("A", menu("Deeper", [choice("C"), choice("D")])), choice("B")]), activity: { type: "dialog" }, effects: base.effects }), settle: 5, expectDialog: true },
  { name: "cutscene: waiting step", task: t("cs1", { activity: { type: "cutscene", steps: [{ wait: 100 }] }, effects: base.effects }), settle: 30 },
  { name: "cutscene: say up", task: t("cs2", { activity: { type: "cutscene", steps: [{ say: "Hello there." }, { say: "More." }] }, effects: base.effects }), settle: 10, expectDialog: true },
  { name: "cutscene: say fully shown", task: t("cs3", { activity: { type: "cutscene", steps: [{ say: "Hi." }, { say: "More." }] }, effects: base.effects }), settle: 120, expectDialog: true },
  { name: "cutscene: ask up", task: t("cs4", { activity: { type: "cutscene", steps: [{ ask: menu("Which?", [choice("A"), choice("B")]) }] }, effects: base.effects }), settle: 5, expectDialog: true },
  { name: "cutscene: view and say", task: t("cs5", { activity: { type: "cutscene", steps: [{ view: "view-x" }, { say: "Look." }, { unview: true }] }, effects: base.effects }), settle: 120, expectDialog: true },
  { name: "cutscene: walking", task: t("cs6", { activity: { type: "cutscene", steps: [{ walk: ["down", "down"] }] }, effects: base.effects }), settle: 4, moved: true },
  { name: "typing", task: t("ty", { activity: { type: "typing", lines: 1 }, effects: base.effects }), settle: 20 },
];

describe("Escape cancels every action at any time", () => {
  for (const c of cases) {
    it(c.name, () => {
      const game = new Game(room(c.task), { random: () => 0.5 });
      const log: string[] = [];
      for (const n of ["taskStart", "taskComplete", "taskCancelled", "dialogClose"] as const) {
        game.events.on(n, () => log.push(n));
      }
      for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
      const dishes = game.state.get("dishes");
      game.update(dt, press);
      expect(game.interaction.busy).toBe(true);
      for (let i = 0; i < c.settle; i++) game.update(dt, NO_INPUT);
      expect(game.interaction.busy).toBe(true);
      if (c.expectDialog) expect(game.dialogOpen).toBe(true);

      game.update(dt, esc);
      for (let i = 0; i < 3; i++) game.update(dt, NO_INPUT);

      expect(game.interaction.busy).toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(game.interaction.scoreboard.score).toBe(0);
      expect(game.state.get("dishes")).toBe(dishes);
      expect(log).not.toContain("taskComplete");
      expect(log.filter((n) => n === "taskStart").length).toBe(1);
      expect(log.filter((n) => n === "taskCancelled").length).toBe(1);
      // No cooldown: it starts again at once.
      if (!c.moved) {
        game.update(dt, press);
        expect(game.interaction.busy).toBe(true);
      }
    });
  }
});

it("Escape in a nested menu of a task backs out of the whole task, not one level", () => {
  const task = t("dlg3", {
    dialog: menu("Pick", [choice("A", menu("Deeper", [choice("C"), choice("D")])), choice("B")]),
    activity: { type: "dialog" },
    effects: base.effects,
  });
  const game = new Game(room(task));
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  game.update(dt, press); // picks A, which opens the deeper menu
  expect(game.dialogOpen).toBe(true);
  game.update(dt, esc);
  expect(game.dialogOpen).toBe(false);
  expect(game.interaction.busy).toBe(false);
  expect(game.inputLocked).toBe(false);
  expect(game.interaction.scoreboard.score).toBe(0);
});

it("notes are uncancellable by design: Escape does nothing to them", () => {
  const game = new Game(room(t("nt", { activity: { type: "notes", count: 2 }, effects: base.effects })));
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  for (let i = 0; i < 30; i++) game.update(dt, NO_INPUT);
  game.update(dt, esc);
  expect(game.interaction.busy).toBe(true);
});

it("a standalone dialog (no action running) still backs out one menu level with Escape", () => {
  const game = new Game(room(t("x", { duration: 1 })));
  const node = menu("Pick", [choice("A", menu("Deeper", [choice("C")])), choice("B")]);
  expect(game.openDialog(node)).toBe(true);
  game.update(dt, press); // A
  game.update(dt, esc);
  expect(game.dialogOpen).toBe(true); // back at the first menu
  game.update(dt, esc);
  expect(game.dialogOpen).toBe(false);
});

it("the stop hint is drawn while a cancellable action runs, and not for notes or when idle", () => {
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
  });
  const drawn: string[] = [];
  const ctx = new Proxy({}, { get: (_t, k) => (k === "drawImage" ? () => drawn.push("glyph") : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
  const count = (g: Game) => {
    drawn.length = 0;
    g.render(ctx, 1);
    return drawn.length;
  };
  const go = (task: Task) => {
    const g = new Game(room(task));
    for (let i = 0; i < 12; i++) g.update(dt, NO_INPUT);
    return g;
  };
  const idle = go(t("w", { duration: 5 }));
  const idleCount = count(idle);
  idle.update(dt, press);
  expect(count(idle)).toBeGreaterThan(idleCount + 8); // "ESC TO STOP" and the progress bar
  const notes = go(t("n", { activity: { type: "notes", count: 2 } }));
  notes.update(dt, press);
  const waitCount = count(idle);
  expect(count(notes)).toBeLessThan(waitCount);
});

// The apartment's flags and counts (not the clock or energy, which tick by themselves).
const snap = (g: Game) =>
  JSON.stringify(STATE_VARS.filter((v) => !["clock", "time", "energy", "mood"].includes(v.id)).map((v) => g.state.get(v.id)));

describe("every real task, Escape pressed at many moments", () => {
  const rooms = APARTMENT.rooms;
  for (const [roomId, level] of Object.entries(rooms)) {
    for (const spot of taskSpots(level)) {
      it(`${roomId}: ${spot.id}`, () => {
        for (const frame of [1, 3, 10, 25, 60, 150, 400]) {
          vi.stubGlobal("document", {
            createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
          });
          const only = { ...level, interactables: level.interactables.filter((i) => i.id === spot.id) };
          const game = new Game(only, { rooms: { ...rooms, [roomId]: only }, random: () => 0.5 });
          game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
          game.update(dt, NO_INPUT);
          const before = snap(game);
          let started = false;
          game.events.on("taskStart", () => (started = true));
          game.update(dt, press);
          if (!started) continue;
          // Read dialogs so the scene gets going, but stop at `frame`.
          for (let i = 0; i < frame && game.interaction.busy; i++) {
            game.update(dt, game.dialogOpen && i % 40 === 39 ? press : NO_INPUT);
          }
          if (!game.interaction.busy) continue; // already over by itself
          const scoreBefore = game.interaction.scoreboard.score;
          game.update(dt, esc);
          for (let i = 0; i < 3; i++) game.update(dt, NO_INPUT);
          const active = game.interaction.active;
          if (active) {
            // Only an action that says it can't be cancelled may still be running.
            expect(active.activity.cancellable, `${spot.id} at frame ${frame}`).toBe(false);
            continue;
          }
          expect(game.dialogOpen, `${spot.id} dialog at ${frame}`).toBe(false);
          expect(game.inputLocked, `${spot.id} lock at ${frame}`).toBe(false);
          expect(game.interaction.scoreboard.score, `${spot.id} score at ${frame}`).toBe(scoreBefore);
          expect(snap(game)).toBe(before);
        }
      });
    }
  }
});
