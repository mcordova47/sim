import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { APARTMENT } from "./apartment";
import { TYPING, VIEW } from "./config";
import { Game } from "./game";
import type { GameEvents } from "./events";
import { dialogOf, type Interactable } from "./interactable";
import { TypingActivity } from "./activities";
import type { Level } from "./level";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import type { CutsceneStep } from "./activities";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });
const tap = (dir: NonNullable<Controls["dir"]>): Controls => ({ ...NO_INPUT, dir, dirPressed: dir });

function seeded(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // Neighbouring seeds start out alike, so let it run a little first.
  for (let i = 0; i < 8; i++) next();
  return next;
}

type Task = Omit<Interactable, "zones">;
const base = { duration: 0, points: 100 };

// The player (@) faces right with the object (X) on the next tile, and open floor beyond.
function room(task: Task, rows = ["#########", "#.......#", "#..@X...#", "#.......#", "#########"]): Level {
  return { ...parseTileMap(rows, { X: { tasks: [task] } }), facing: "right" };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
}

function listen(game: Game) {
  const log: { name: keyof GameEvents; payload: unknown }[] = [];
  for (const name of ["taskStart", "taskComplete", "taskCancelled", "cue", "dialogOpen", "dialogClose"] as const) {
    game.events.on(name, (payload) => log.push({ name, payload }));
  }
  return log;
}
const names = (log: { name: string }[]) => log.map((e) => e.name);

afterEach(() => vi.unstubAllGlobals());

describe("a typing task in the game", () => {
  const typing: Task = { id: "work", name: "Work", prompt: "Work", ...base, activity: { type: "typing", lines: 1 } };

  it("freezes the player, takes key presses, and scores by how fast it went", () => {
    const game = new Game(room(typing), { random: seeded(3) });
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
    const where = [game.player.col, game.player.row];
    run(game, 0.5, { ...NO_INPUT, dir: "left" }); // held movement does nothing
    expect([game.player.col, game.player.row]).toEqual(where);

    // Mash fast until it ends.
    for (let i = 0; i < 600 && game.interaction.busy; i++) game.update(dt, keys("KeyA", "KeyS"));
    game.update(dt, NO_INPUT);
    expect(game.interaction.busy).toBe(false);
    const done = log.find((e) => e.name === "taskComplete")!.payload as GameEvents["taskComplete"];
    expect(done.award.qualityFactor).toBeGreaterThan(1);
    expect(done.award.points).toBeGreaterThan(100);
  });

  it("is a poor result for slow typing", () => {
    const game = new Game(room(typing), { random: seeded(3) });
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    for (let i = 0; i < 60 * (TYPING.maxSeconds + 2) && game.interaction.busy; i++) {
      game.update(dt, i % 60 === 0 ? keys("KeyA") : NO_INPUT);
    }
    game.update(dt, NO_INPUT);
    const done = log.find((e) => e.name === "taskComplete")!.payload as GameEvents["taskComplete"];
    expect(done.award.qualityFactor).toBeLessThan(1);
  });

  it("can be backed out of with Escape: no points, no cooldown", () => {
    const game = new Game(room(typing), { random: seeded(3) });
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, keys("KeyA"));
    game.update(dt, keys("Escape"));
    expect(game.interaction.busy).toBe(false);
    expect(names(log)).toEqual(["taskStart", "taskCancelled"]);
    expect(game.interaction.scoreboard.score).toBe(0);
    game.update(dt, press); // and it starts again at once
    expect(game.interaction.busy).toBe(true);
  });

  it("gives the same lines for the same seed, and different lines for another", () => {
    const lines = (seed: number) => {
      const game = new Game(room(typing), { random: seeded(seed) });
      run(game, 0.2);
      game.update(dt, press);
      return (game.interaction.active!.activity as TypingActivity).lines.join("|");
    };
    expect(lines(5)).toBe(lines(5));
    const all = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(lines));
    expect(all.size).toBeGreaterThan(1);
  });

  it("draws its picture over the HUD while it runs, inside the screen", () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, n: string) => (...a: unknown[]) => void calls.push(`${n}(${a.join(",")})`), set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const game = new Game(room(typing), { random: seeded(3) });
    run(game, 0.2);
    game.render(ctx, 1); // the first render builds the glyph cache; measure the second
    calls.length = 0;
    game.render(ctx, 1);
    const plain = calls.length;
    game.update(dt, press);
    calls.length = 0;
    game.render(ctx, 1);
    // More is drawn while the mini-game runs than for the plain room.
    expect(calls.length).toBeGreaterThan(plain);
    expect(calls.some((c) => c.startsWith("fillRect"))).toBe(true);
  });
});

describe("a notes task in the game", () => {
  const notes: Task = { id: "guitar", name: "Guitar", prompt: "Guitar", ...base, activity: { type: "notes", count: 3 } };

  it("reads direction presses, and scores by how many were right", () => {
    const rng = seeded(11);
    const game = new Game(room(notes), { random: seeded(11) });
    const expected = Array.from({ length: 3 }, () => (["up", "down", "left", "right"] as const)[Math.floor(rng() * 4)]);
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    for (const dir of expected) {
      for (let i = 0; i < 240; i++) {
        game.update(dt, NO_INPUT);
        const current = (game.interaction.active?.activity as { current?: string } | undefined)?.current;
        if (current) break;
      }
      game.update(dt, tap(dir));
    }
    game.update(dt, NO_INPUT);
    const done = log.find((e) => e.name === "taskComplete")!.payload as GameEvents["taskComplete"];
    expect(done.award.qualityFactor).toBe(1.5); // all right
  });

  it("scores low when nothing is pressed", () => {
    const game = new Game(room(notes), { random: seeded(11) });
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    run(game, 20);
    const done = log.find((e) => e.name === "taskComplete")!.payload as GameEvents["taskComplete"];
    expect(done.award.qualityFactor).toBe(0.5);
  });
});

describe("a cutscene in the game", () => {
  const steps: CutsceneStep[] = [
    { say: "One." },
    { cue: "spin" },
    { wait: 0.3 },
    { say: "Two." },
  ];
  const scene: Task = { id: "scene", name: "Scene", prompt: "Scene", ...base, activity: { type: "cutscene", steps } };

  it("runs its steps, opening text and waiting for it, announcing cues, and scores at the end", () => {
    const game = new Game(room(scene));
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    expect(game.interaction.scoreboard.score).toBe(0);

    // Read the first text: finish the page, then close it.
    run(game, 1);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    expect(log.filter((e) => e.name === "cue").map((e) => (e.payload as { name: string }).name)).toEqual(["spin"]);
    // After the pause, the second text opens.
    run(game, 0.5);
    expect(game.dialogOpen).toBe(true);
    run(game, 1);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    game.update(dt, NO_INPUT);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
    expect(names(log).filter((n) => n === "dialogOpen")).toHaveLength(2);
    expect(names(log)).toContain("taskComplete");
  });

  it("stands the game clock still while its text is open", () => {
    const game = new Game(room(scene));
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    const clock = game.state.get("clock");
    run(game, 3);
    expect(game.state.get("clock")).toBe(clock);
  });

  it("walks the player by script, and the player is theirs again afterwards", () => {
    const walker: Task = {
      id: "walker", name: "Walk", prompt: "Walk", ...base,
      activity: { type: "cutscene", steps: [{ walk: ["down", "down"] }, { face: "up" }] },
    };
    const game = new Game(room(walker, ["#########", "#.......#", "#..@X...#", "#.......#", "#.......#", "#########"]));
    run(game, 0.2);
    game.update(dt, press);
    const start = game.player.row;
    // The player's own keys are ignored until the scene is over.
    for (let i = 0; i < 300 && game.interaction.busy; i++) game.update(dt, { ...NO_INPUT, dir: "up" });
    expect(game.player.row).toBe(start + 2);
    expect(game.player.facing).toBe("up");
    expect(game.interaction.busy).toBe(false);
    run(game, 0.5, { ...NO_INPUT, dir: "right" });
    expect(game.player.col).toBeGreaterThan(3);
  });

  it("is cancelled with Escape and pays nothing", () => {
    const long: Task = { id: "long", name: "Long", prompt: "Long", ...base, activity: { type: "cutscene", steps: [{ wait: 100 }] } };
    const game = new Game(room(long));
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    game.update(dt, keys("Escape"));
    game.update(dt, NO_INPUT);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(0);
  });
});

describe("the real task list", () => {
  it("gives work to the typing game, the guitar to the notes game and the record player to a menu", () => {
    const byId = new Map(TASKS.map((t) => [t.id, t]));
    expect(byId.get("work")!.activity?.type).toBe("typing");
    expect(byId.get("guitar")!.activity?.type).toBe("notes");
    expect(dialogOf(byId.get("record-play")!)?.type).toBe("menu");
  });

  it("only uses characters the pixel font can draw in every cutscene's text", () => {
    const problems: string[] = [];
    for (const task of TASKS) {
      const steps = (task.activity?.steps ?? []) as CutsceneStep[];
      for (const step of steps) {
        if ("say" in step) {
          const bad = unsupportedChars(step.say + (step.speaker ?? ""));
          if (bad.length) problems.push(`${task.id}: ${step.say.slice(0, 30)} ${bad.join(" ")}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("builds an activity for every task in the real apartment (no unknown types)", () => {
    const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms });
    expect(game).toBeDefined();
    for (const room of Object.values(APARTMENT.rooms)) {
      for (const task of room.interactables) {
        if (task.activity) expect(["wait", "dialog", "cutscene", "typing", "notes", "make-track", "swap-decor", "flashcards"]).toContain(task.activity.type);
      }
    }
    expect(VIEW.width).toBeGreaterThan(0);
  });
});
