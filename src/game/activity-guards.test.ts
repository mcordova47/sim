import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { textWidth } from "../render/font";
import { NOTES, TYPING, VIEW } from "./config";
import { BaseActivity, registerActivity, unregisterActivity, validateActivity } from "./activity";
import { NotesActivity, SNIPPETS, TypingActivity } from "./activities";
import { CutsceneActivity } from "./activities/cutscene";
import { fakeHost } from "./activities/fake-host";
import type { GameEvents } from "./events";
import { ApartmentState } from "./state";
import { Game } from "./game";
import { InteractionSystem } from "./interaction";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });

type Task = Omit<Interactable, "zones">;
const base = { duration: 0, points: 100 };

function room(task: Task, rows = ["#########", "#.......#", "#..@X...#", "#.......#", "#########"]): Level {
  return { ...parseTileMap(rows, { X: { tasks: [task] } }), facing: "right" };
}
function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
}
function listen(game: Game) {
  const log: (keyof GameEvents)[] = [];
  for (const name of ["taskStart", "taskComplete", "taskCancelled"] as const) game.events.on(name, () => log.push(name));
  return log;
}
const item = (activity: Interactable["activity"], extra: Partial<Interactable> = {}): Interactable => ({
  id: "t", name: "T", prompt: "T", ...base, zones: [], activity, ...extra,
});

afterEach(() => vi.restoreAllMocks());

describe("scripted walk", () => {
  const walker = (walk: ("left" | "up")[]): Task => ({
    id: "walker", name: "Walk", prompt: "Walk", ...base,
    activity: { type: "cutscene", steps: [{ walk }] },
  });
  const walked = (walk: ("left" | "up")[]) => {
    const game = new Game(room(walker(walk)));
    run(game, 0.2);
    game.update(dt, press);
    run(game, 3);
    return [game.player.col, game.player.row];
  };

  it("takes exactly one tile per direction in open floor", () => {
    expect(walked(["left"])).toEqual([2, 2]);
    expect(walked(["left", "up"])).toEqual([2, 1]);
  });
});

describe("a cancelled activity never restarts from a buffered press", () => {
  const typing: Task = { id: "work", name: "Work", prompt: "Work", ...base, activity: { type: "typing", lines: 2 } };
  const mashE: Controls = { ...NO_INPUT, interactPressed: true, keys: ["KeyE"] };

  it("mashing E then Escape ends the task once", () => {
    const game = new Game(room(typing));
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    game.update(dt, mashE);
    game.update(dt, keys("Escape"));
    run(game, 0.5);
    expect(log).toEqual(["taskStart", "taskCancelled"]);
  });

  it("E and Escape in the same frame do not restart it either", () => {
    const game = new Game(room(typing));
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    game.update(dt, { ...NO_INPUT, interactPressed: true, keys: ["KeyE", "Escape"] });
    run(game, 0.5);
    expect(log).toEqual(["taskStart", "taskCancelled"]);
  });

  it("a skipped cutscene does not restart either", () => {
    const scene: Task = { id: "s", name: "S", prompt: "S", ...base, cooldown: 0, activity: { type: "cutscene", steps: [{ wait: 100 }] } };
    const game = new Game(room(scene));
    const log = listen(game);
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, mashE);
    game.update(dt, { ...keys("Escape"), interactPressed: true });
    run(game, 0.5);
    expect(log).toEqual(["taskStart", "taskComplete"]);
  });
});

describe("quality that is not a number", () => {
  class Odd extends BaseActivity {
    constructor(private readonly q: number) {
      super();
    }
    update(): void {
      this.finish({ completed: true, quality: this.q });
    }
  }
  it("counts NaN as 0 and never poisons the score", () => {
    registerActivity("odd-nan", () => new Odd(NaN));
    try {
      const sys = new InteractionSystem([{ ...item({ type: "odd-nan" }), zones: [{ x: 0, y: 0, w: 16, h: 16 }] }]);
      const at = { target: { x: 0, y: 0, w: 16, h: 16 } };
      sys.update(dt, at, press);
      sys.update(dt, at, NO_INPUT);
      expect(Number.isFinite(sys.scoreboard.score)).toBe(true);
      expect(sys.lastCompletion?.award.qualityFactor).toBe(0.5);
    } finally {
      unregisterActivity("odd-nan");
    }
  });
});

describe("cutscene set step and answers", () => {
  it("sets a state variable through the host", () => {
    const f = fakeHost();
    const a = new CutsceneActivity([{ set: { var: "bedMade", value: 1 } }], f.host);
    a.update(dt, NO_INPUT);
    expect(f.stateSets).toEqual([{ id: "bedMade", value: 1 }]);
    expect(a.done).toBe(true);
  });

  it("sets it in the real game, clamped to its range", () => {
    const t: Task = { id: "s", name: "S", prompt: "S", ...base, activity: { type: "cutscene", steps: [{ set: { var: "dishes", value: 99 } }] } };
    const game = new Game(room(t));
    run(game, 0.2);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    expect(game.state.get("dishes")).toBe(9);
  });

  it("puts the answer of an ask in the result's data, and the completion event", () => {
    const f = fakeHost();
    const a = new CutsceneActivity([{ ask: { prompt: "?", choices: [] } as never }], f.host);
    a.update(dt, NO_INPUT);
    f.closeDialog({ path: ["Yes"], cancelled: false });
    a.update(dt, NO_INPUT);
    expect(a.result).toEqual({ completed: true, data: { path: ["Yes"], cancelled: false } });
  });

  it("has no data when nothing was asked", () => {
    const a = new CutsceneActivity([{ cue: "x" }], fakeHost().host);
    a.update(dt, NO_INPUT);
    expect(a.result).toEqual({ completed: true });
  });
});

describe("a broken activity does not take the game down", () => {
  class Broken extends BaseActivity {
    cancellable = true;
    constructor(private readonly where: string) {
      super();
      if (where === "factory") throw new Error("boom");
    }
    start(): void {
      if (this.where === "start") throw new Error("boom");
    }
    update(): void {
      if (this.where === "update" || this.where === "cancel") throw new Error("boom");
    }
    cancel(): void {
      if (this.where === "cancel") throw new Error("boom");
      super.cancel();
    }
  }
  for (const where of ["factory", "start", "update", "cancel"]) {
    it(`cancels cleanly when ${where} throws`, () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      registerActivity("broken", () => new Broken(where));
      try {
        const t: Task = { id: "b", name: "B", prompt: "B", ...base, effects: [{ var: "dishes", add: 5 }], activity: { type: "broken" } };
        const game = new Game(room(t));
        const log = listen(game);
        run(game, 0.2);
        game.update(dt, press);
        run(game, 0.2);
        game.update(dt, keys("Escape"));
        run(game, 0.2);
        expect(game.interaction.busy).toBe(false);
        expect(log).toEqual(["taskStart", "taskCancelled"]);
        expect(game.state.get("dishes")).toBe(1);
        expect(game.interaction.scoreboard.score).toBe(0);
        expect(game.inputLocked).toBe(false);
        expect(game.interaction.cooldownRemaining(t as Interactable)).toBe(0);
        // The game still moves the player.
        run(game, 0.5, { ...NO_INPUT, dir: "down" });
        expect(game.player.row).toBeGreaterThan(2);
      } finally {
        unregisterActivity("broken");
      }
    });
  }
});

describe("activity specs are checked when the level is built", () => {
  const level = (activity: unknown) =>
    parseTileMap(["###", "#@X", "###"], { X: { tasks: [{ id: "t", name: "T", prompt: "T", ...base, activity } as Task] } });

  it("rejects an unknown type, naming the task", () => {
    expect(() => new Game(level({ type: "nope" }))).toThrow(/Task "t" has an unknown activity type "nope"/);
  });
  it("gives a clear error for a list or null", () => {
    expect(() => new Game(level([]))).toThrow(/Task "t": activity must be an object.*a list/);
    expect(() => new Game(level(null))).toThrow(/Task "t": activity must be an object/);
    expect(() => new Game(level({}))).toThrow(/needs a type/);
  });
  it("rejects bad settings", () => {
    expect(() => new Game(level({ type: "typing", lines: 0 }))).toThrow(/Task "t": typing/);
    expect(() => new Game(level({ type: "typing", lines: 99 }))).toThrow(/at most/);
    expect(() => new Game(level({ type: "notes", count: 40 }))).toThrow(/Task "t": notes.*at most/);
    expect(() => new Game(level({ type: "cutscene" }))).toThrow(/list of steps/);
    expect(() => new Game(level({ type: "cutscene", steps: [] }))).toThrow(/list of steps/);
    expect(() => new Game(level({ type: "cutscene", steps: [{ walk: ["sideways"] }] }))).toThrow(/step 1: walk/);
    expect(() => new Game(level({ type: "cutscene", steps: [{ wait: NaN }] }))).toThrow(/step 1: wait/);
    expect(() => new Game(level({ type: "cutscene", steps: [{ set: { var: "x" } }] }))).toThrow(/step 1: set/);
    expect(() => new Game(level({ type: "dialog" }))).toThrow(/no dialog/);
  });
  it("accepts good ones", () => {
    expect(() => new Game(level({ type: "typing", lines: TYPING.maxLines }))).not.toThrow();
    expect(() => new Game(level({ type: "notes", count: NOTES.maxCount }))).not.toThrow();
    expect(() => new Game(level({ type: "cutscene", steps: [{ say: "hi" }, { set: { var: "dishes", value: 0 } }] }))).not.toThrow();
    expect(() => validateActivity(item(undefined))).not.toThrow();
  });
});

describe("mini-game boxes fit the screen", () => {
  const rects = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, n: string) => (...a: unknown[]) => void calls.push(`${n}(${a.join(",")})`), set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    draw(ctx);
    vi.unstubAllGlobals();
    return calls.filter((c) => c.startsWith("fillRect(")).map((c) => c.slice(9, -1).split(",").map(Number));
  };

  it("every built-in snippet is no wider than the limit", () => {
    for (const s of SNIPPETS) expect(textWidth(s), s).toBeLessThanOrEqual(TYPING.maxLineWidth);
  });

  it("refuses lines that are too wide or too many", () => {
    expect(() => new TypingActivity(["x".repeat(60)])).toThrow(/too wide/);
    expect(() => new TypingActivity(Array(TYPING.maxLines + 1).fill("a"))).toThrow(/Too many lines/);
    expect(() => new NotesActivity(Array(NOTES.maxCount + 1).fill("up"))).toThrow(/Too many notes/);
  });

  it("the largest allowed typing and notes boxes are inside the screen", () => {
    const widest = SNIPPETS.reduce((a, b) => (textWidth(a) >= textWidth(b) ? a : b));
    const typing = new TypingActivity(Array(TYPING.maxLines).fill(widest));
    const notes = new NotesActivity(Array(NOTES.maxCount).fill("up"));
    for (const a of [typing, notes]) {
      for (const [x, y, w, h] of rects((ctx) => a.draw(ctx, VIEW))) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(VIEW.width);
        expect(y + h).toBeLessThanOrEqual(VIEW.height);
      }
    }
    // The text sits inside the typing box.
    expect(textWidth(widest) + 16).toBeLessThanOrEqual(VIEW.width);
  });
});

describe("a throwing draw cancels the task", () => {
  class BadDraw extends BaseActivity {
    cancellable = true;
    update(): void {}
    draw(): void {
      throw new Error("draw boom");
    }
  }
  it("is reported, cancelled like a throwing update, and the loop runs on", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    registerActivity("bad-draw", () => new BadDraw());
    try {
      const t: Task = { id: "d", name: "D", prompt: "D", ...base, effects: [{ var: "dishes", add: 5 }], activity: { type: "bad-draw" } };
      const game = new Game(room(t));
      const log = listen(game);
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
      vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
      run(game, 0.2);
      game.update(dt, press);
      expect(game.interaction.busy).toBe(true);
      expect(() => game.render(ctx, 0)).not.toThrow();
      expect(err).toHaveBeenCalled();
      expect(game.interaction.busy).toBe(false);
      expect(log).toEqual(["taskStart", "taskCancelled"]);
      expect(game.state.get("dishes")).toBe(1);
      expect(game.interaction.cooldownRemaining(t as Interactable)).toBe(0);
      expect(() => game.render(ctx, 0)).not.toThrow();
      run(game, 0.5, { ...NO_INPUT, dir: "down" });
      expect(game.player.row).toBeGreaterThan(2);
    } finally {
      vi.unstubAllGlobals();
      unregisterActivity("bad-draw");
    }
  });
});

describe("strict numbers and state names at load", () => {
  const level = (activity: unknown) =>
    parseTileMap(["###", "#@X", "###"], { X: { tasks: [{ id: "t", name: "T", prompt: "T", ...base, activity } as Task] } }, { knownVars: () => true });
  it("rejects numeric strings and other non-numbers", () => {
    for (const bad of ["3", true, null, [3], {}]) {
      expect(() => new Game(level({ type: "notes", count: bad })), String(bad)).toThrow(/Task "t": notes/);
      expect(() => new Game(level({ type: "typing", lines: bad })), String(bad)).toThrow(/Task "t": typing/);
    }
    expect(() => new Game(level({ type: "notes", count: 3 }))).not.toThrow();
    expect(() => new Game(level({ type: "typing", lines: 3 }))).not.toThrow();
  });
  it("rejects a cutscene set of an unknown variable, naming the task", () => {
    const steps = [{ set: { var: "bedMade", value: 1 } }, { set: { var: "nope", value: 1 } }];
    expect(() => new Game(level({ type: "cutscene", steps }))).toThrow(/Task "t", cutscene step 2: set names an unknown state variable "nope"/);
    expect(() => new Game(level({ type: "cutscene", steps: [steps[0]] }))).not.toThrow();
  });
  it("checks against the game's own state variables", () => {
    const state = new ApartmentState([{ id: "mood", initial: 0, min: 0, max: 5, meaning: "m" }]);
    const steps = [{ set: { var: "mood", value: 2 } }];
    expect(() => new Game(level({ type: "cutscene", steps }), { state })).not.toThrow();
    expect(() => new Game(level({ type: "cutscene", steps: [{ set: { var: "dishes", value: 1 } }] }), { state })).toThrow(/unknown state variable/);
  });
});

describe("a scripted walk onto a door tile", () => {
  const door = (to: string, col: number, row: number, facing: "left" | "right") => ({ to, arrive: { col, row, facing } });
  const walker = (walk: "right"[]): Task => ({
    id: "walker", name: "Walk", prompt: "Walk", ...base,
    activity: { type: "cutscene", steps: [{ walk }, { set: { var: "bedMade", value: 1 } }] },
  });
  const rooms = (walk: "right"[], doorCol: number) => {
    const a = parseTileMap(
      ["#X....#", "#@....#"].map((r) => r.slice(0, 7)),
      { X: { tasks: [walker(walk)] }, "1": { door: door("b", 1, 1, "right") } },
      { id: "a" },
    );
    // Put the door tile in row 1 at doorCol.
    const rows = ["#X....#", "#@....#"].map((r, i) => (i === 1 ? r.slice(0, doorCol) + "1" + r.slice(doorCol + 1) : r));
    const withDoor = parseTileMap(rows, { X: { tasks: [walker(walk)] }, "1": { door: door("b", 1, 1, "right") } }, { id: "a" });
    const b = parseTileMap(["#####", "#.@.#", "#####"], {}, { id: "b" });
    void a;
    const game = new Game({ ...withDoor, facing: "up" }, { rooms: { a: withDoor, b } });
    const entered: string[] = [];
    game.events.on("room", (e) => entered.push(e.id));
    run(game, 0.2);
    game.update(dt, press);
    run(game, 4);
    return { game, entered };
  };

  it("ending on the door enters it, and the later steps run in the new room", () => {
    const { game, entered } = rooms(["right", "right", "right"], 4);
    expect(entered).toEqual(["b"]);
    expect(game.interaction.busy).toBe(false);
    expect(game.state.get("bedMade")).toBe(1);
    expect([game.player.col, game.player.row]).toEqual([1, 1]);
  });

  it("crossing a door carries the rest of the walk into the new room", () => {
    const { game, entered } = rooms(["right", "right", "right", "right"], 3);
    expect(entered).toEqual(["b"]);
    expect(game.state.get("bedMade")).toBe(1);
    expect([game.player.col, game.player.row]).toEqual([3, 1]);
  });
});
