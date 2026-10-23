import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { createActivity, validateActivity } from "../activity";
import type { Interactable } from "../interactable";
import { choice, menu } from "../dialog";
import { CutsceneActivity, type CutsceneStep } from "./cutscene";
import { fakeHost } from "./fake-host";

const dt = 1 / 60;

function scene(steps: CutsceneStep[], seed = 1) {
  const f = fakeHost(seed);
  const a = new CutsceneActivity(steps, f.host);
  const tick = (seconds = dt) => {
    for (let i = 0; i < Math.max(1, Math.round(seconds / dt)); i++) a.update(dt, NO_INPUT);
  };
  return { f, a, tick };
}

describe("CutsceneActivity", () => {
  it("is over at once with no steps", () => {
    expect(scene([]).a.done).toBe(true);
  });

  it("runs a step that takes no time and the next one in the same update", () => {
    const { f, a, tick } = scene([{ cue: "one" }, { face: "left" }, { cue: "two" }]);
    tick();
    expect(f.cues).toEqual(["one", "two"]);
    expect(f.player.facing).toBe("left");
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: true });
  });

  it("waits for the time in a wait step, then goes on", () => {
    const { f, a, tick } = scene([{ wait: 0.5 }, { cue: "after" }]);
    tick(0.4);
    expect(f.cues).toEqual([]);
    tick(0.2);
    expect(f.cues).toEqual(["after"]);
    expect(a.done).toBe(true);
  });

  it("shows text and waits for the dialog to close before the next step", () => {
    const { f, a, tick } = scene([{ say: "Hello." }, { cue: "after" }]);
    tick();
    expect(f.dialogs).toHaveLength(1);
    expect(f.dialogs[0].node).toMatchObject({ type: "say", text: "Hello." });
    tick(1);
    expect(f.cues).toEqual([]); // still reading
    expect(a.done).toBe(false);
    f.closeDialog();
    tick();
    expect(f.cues).toEqual(["after"]);
    expect(a.done).toBe(true);
  });

  it("opens one dialog per text step, in order, with the speaker", () => {
    const { f, a, tick } = scene([{ say: "One.", speaker: "Marc" }, { say: "Two." }]);
    tick();
    expect(f.dialogs[0].node).toMatchObject({ text: "One.", speaker: "Marc" });
    f.closeDialog();
    tick();
    expect(f.dialogs).toHaveLength(2);
    expect(f.dialogs[1].node).toMatchObject({ text: "Two." });
    f.closeDialog();
    tick();
    expect(a.done).toBe(true);
  });

  it("can ask a menu and waits for it to close", () => {
    const { f, a, tick } = scene([{ ask: menu("Which?", [choice("A")]) }, { cue: "after" }]);
    tick();
    expect(f.dialogs[0].node).toMatchObject({ type: "menu" });
    f.closeDialog({ path: ["A"], cancelled: false });
    tick();
    expect(f.cues).toEqual(["after"]);
    expect(a.done).toBe(true);
  });

  it("keeps trying to open text if another dialog is in the way", () => {
    const { f, a, tick } = scene([{ say: "Late." }]);
    f.blockDialogs(true);
    tick(0.5);
    expect(f.dialogs).toHaveLength(0);
    expect(a.done).toBe(false);
    f.blockDialogs(false);
    tick();
    expect(f.dialogs).toHaveLength(1);
    f.closeDialog();
    tick();
    expect(a.done).toBe(true);
  });

  it("reports progress through the steps", () => {
    const { a, tick, f } = scene([{ wait: 0.2 }, { wait: 0.2 }, { say: "x" }, { cue: "c" }]);
    expect(a.progress).toBe(0);
    tick(0.25);
    expect(a.progress).toBeGreaterThanOrEqual(0.25);
    tick(0.3);
    f.closeDialog();
    tick();
    expect(a.progress).toBe(1);
  });

  it("is skipped with Escape, which still counts as having happened", () => {
    const { a } = scene([{ wait: 100 }, { cue: "never" }]);
    expect(a.cancellable).toBe(true);
    a.cancel();
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: true });
  });

  it("does nothing more once it is over", () => {
    const { f, a, tick } = scene([{ cue: "once" }]);
    tick();
    tick();
    a.cancel();
    expect(f.cues).toEqual(["once"]);
  });
});

describe("walking the player by script", () => {
  // Moves the fake player when the scene holds a direction, like the game would.
  function walkScene(directions: ("left" | "right" | "up" | "down")[], blockedAfter = Infinity) {
    const s = scene([{ walk: directions }, { cue: "arrived" }]);
    let timer = 0;
    let moves = 0;
    let going: string | undefined;
    const frame = () => {
      s.a.update(dt, NO_INPUT);
      // Like the player: a step starts only from a held direction, then runs
      // to the end on its own.
      if (!s.f.player.stepping) {
        const held = s.a.playerControls?.dir;
        if (held && moves < blockedAfter) {
          s.f.player.stepping = true;
          going = held;
          timer = 0;
        }
      }
      if (s.f.player.stepping) {
        timer += dt;
        if (timer >= 0.16) {
          s.f.player.stepping = false;
          moves++;
          if (going === "left") s.f.player.col--;
          if (going === "right") s.f.player.col++;
          if (going === "up") s.f.player.row--;
          if (going === "down") s.f.player.row++;
        }
      }
    };
    return { ...s, frame, get moves() { return moves; } };
  }

  it("lets go of the key once a step has started, so the player stops after one tile", () => {
    const w = walkScene(["left"]);
    for (let i = 0; i < 300 && !w.a.done; i++) {
      const wasStepping = w.f.player.stepping;
      w.frame();
      if (wasStepping) expect(w.a.playerControls).toBeNull();
    }
    expect(w.f.player.col).toBe(4);
    expect(w.moves).toBe(1);
  });

  it("holds each direction until the player has moved a tile, then the next", () => {
    const w = walkScene(["left", "left", "up"]);
    const seen = new Set<string>();
    for (let i = 0; i < 300 && !w.a.done; i++) {
      w.frame();
      if (w.a.playerControls?.dir) seen.add(w.a.playerControls.dir);
    }
    expect(w.a.done).toBe(true);
    expect([...seen]).toEqual(["left", "up"]);
    expect(w.f.player.col).toBe(3);
    expect(w.f.player.row).toBe(4);
    expect(w.f.cues).toEqual(["arrived"]);
    expect(w.a.playerControls).toBeNull();
  });

  it("gives up on a tile the player can't enter, and goes on", () => {
    const w = walkScene(["left", "left"], 0); // never moves
    for (let i = 0; i < 300 && !w.a.done; i++) w.frame();
    expect(w.a.done).toBe(true);
    expect(w.f.player.col).toBe(5);
    expect(w.f.cues).toEqual(["arrived"]);
  });

  it("gives back control when it ends or is skipped", () => {
    const w = walkScene(["left", "left", "left"]);
    w.frame(); // the first frame holds the key
    expect(w.a.playerControls).not.toBeNull();
    w.a.cancel();
    expect(w.a.playerControls).toBeNull();
  });

  it("does nothing for an empty walk", () => {
    const w = walkScene([]);
    w.frame();
    expect(w.a.done).toBe(true);
  });
});

describe("making one from a task", () => {
  const task = (activity: Interactable["activity"]): Interactable => ({
    id: "scene",
    name: "Scene",
    prompt: "Scene",
    duration: 0,
    points: 1,
    zones: [],
    activity,
  });

  it("builds from the steps in the task data", () => {
    const a = createActivity(task({ type: "cutscene", steps: [{ cue: "x" }] }), fakeHost().host);
    expect(a).toBeInstanceOf(CutsceneActivity);
  });

  it("rejects missing steps, naming the task", () => {
    expect(() => createActivity(task({ type: "cutscene" }), fakeHost().host)).toThrow(
      'Task "scene": a cutscene needs a list of steps',
    );
  });
});

describe("goto and back", () => {
  // A host with a route planner that returns what the test says.
  function planned(route: (c: number, r: number) => ("up" | "down" | "left" | "right")[] | null) {
    const f = fakeHost();
    f.host.route = route;
    return f;
  }
  const make = (steps: CutsceneStep[], f: ReturnType<typeof fakeHost>) => new CutsceneActivity(steps, f.host);

  // Plays a walk: each update the player takes the step the scene is holding.
  function walkThrough(a: CutsceneActivity, f: ReturnType<typeof fakeHost>) {
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
    for (let i = 0; i < 2000 && !a.done; i++) {
      const dir = a.playerControls?.dir;
      if (dir && !f.player.stepping) {
        f.player.col += delta[dir][0];
        f.player.row += delta[dir][1];
      }
      a.update(1 / 60, NO_INPUT);
    }
  }

  it("walks the planned route to a tile, then back to where it began, facing as before", () => {
    const f = planned((c, r) => (c === 5 && r === 1 ? ["up", "up", "left"] : ["right", "down", "down"]));
    f.player.col = 6;
    f.player.row = 3;
    f.player.facing = "down";
    const a = make([{ goto: { col: 5, row: 1 } }, { face: "up" }, { back: true }], f);
    walkThrough(a, f);
    expect(a.done).toBe(true);
    expect({ col: f.player.col, row: f.player.row }).toEqual({ col: 6, row: 3 });
    expect(f.player.facing).toBe("down");
  });

  it("skips a goto that has no way, rather than sticking", () => {
    const f = planned(() => null);
    const a = make([{ goto: { col: 9, row: 9 } }, { cue: "after" }], f);
    walkThrough(a, f);
    expect(a.done).toBe(true);
    expect(f.cues).toEqual(["after"]);
  });

  it("is checked when the level is built", () => {
    const check = (step: unknown) => () =>
      validateActivity({ id: "t", name: "t", prompt: "t", duration: 0, points: 1, zones: [], activity: { type: "cutscene", steps: [step] } });
    expect(check({ goto: { col: 1, row: 2 } })).not.toThrow();
    expect(check({ back: true })).not.toThrow();
    expect(check({ goto: { col: 1.5, row: 2 } })).toThrow(/goto needs/);
    expect(check({ goto: 3 })).toThrow(/goto needs/);
    expect(check({ back: false })).toThrow(/back must be true/);
    expect(check({ back: true, wait: 1 })).toThrow(/exactly one/);
  });
});
