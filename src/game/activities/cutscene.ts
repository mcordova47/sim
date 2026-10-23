import { COLOR } from "../../render/colors";
import type { Controls } from "../../input/controls";
import { NO_INPUT } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ValidationContext } from "../activity";
import { say, type DialogNode, type DialogResult } from "../dialog";
import { DIRECTIONS, type Direction } from "../direction";

// One step of a cutscene, written as data:
//   { say: "text", speaker?: "name" }   show text and wait for it to be read
//   { ask: node }                       open a menu or dialog and wait for it to close
//   { wait: 1.5 }                       do nothing for that many seconds
//   { cue: "record-spin" }              announce a named moment (sound, animation)
//   { face: "left" }                    turn the player
//   { walk: ["left", "left", "up"] }    walk the player that many tiles
//   { goto: { col: 5, row: 1 } }        walk to that tile of the room, around furniture
//   { back: true }                      walk back to the tile the scene began on, and face as before
//   { view: "sprite-name" }             cover the world with that full-screen picture (dialogs draw over it)
//   { unview: true }                    take the picture away again
//   { set: { var: "mood", value: 1 } }  set a state variable (a flag)
// The answer of the last `ask` ends up in the result's `data`.
export type CutsceneStep =
  | { say: string; speaker?: string }
  | { ask: DialogNode }
  | { wait: number }
  | { cue: string }
  | { face: Direction }
  | { walk: Direction[] }
  | { goto: { col: number; row: number } }
  | { back: true }
  | { view: string }
  | { unview: true }
  | { set: { var: string; value: number } };

// How long a single scripted step is given before it counts as blocked.
const WALK_TIMEOUT = 1;

// A short scripted scene. It runs its steps in order; steps that wait (text,
// a menu, a pause, a walk) hold it up until they are done. Escape skips what
// is left and cancels the task (nothing is paid or applied).
export class CutsceneActivity extends BaseActivity {
  cancellable = true;

  private index = 0;
  private timer = 0;
  // Set while waiting for a dialog to close.
  private waiting = false;
  private walkIndex = 0;
  private walkFrom: { col: number; row: number } | null = null;
  // Where the scene began, for `back`.
  private readonly origin: { col: number; row: number; facing: Direction };
  // The route a `goto` or `back` found, once it has.
  private route: Direction[] | null = null;
  // What the last `ask` was answered with.
  private answer: DialogResult | undefined;
  // The full-screen picture being shown, if any. Cleared by `end`, so it goes
  // away however the scene finishes (the last step, Escape, an error).
  private viewSprite: string | null = null;

  constructor(
    private readonly steps: CutsceneStep[],
    private readonly host: ActivityHost,
  ) {
    super();
    this.origin = { col: host.player.col, row: host.player.row, facing: host.player.facing };
    if (steps.length === 0) this.end();
  }

  // Escape stops the scene like any other action: no points, no effects, no
  // cooldown. The view, the lock and the walk are let go (`finish` clears the
  // walk; the game closes a dialog the scene had open). `set` steps that already
  // ran stay applied.
  cancel(): void {
    this.viewSprite = null;
    this.finish({ completed: false });
  }

  private end(): void {
    this.viewSprite = null;
    this.finish({ completed: true, ...(this.answer !== undefined && { data: this.answer }) });
  }

  // The picture of a `view` step, over the world and the HUD. The game draws a
  // dialog on top of it. Without the game's sprites (tests) it is a labelled panel.
  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    if (this.viewSprite === null || this.done) return;
    const sprites = this.host.sprites;
    if (sprites?.has(this.viewSprite)) {
      sprites.draw(ctx, this.viewSprite, 0, 0, screen);
      return;
    }
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(0, 0, screen.width, screen.height);
    sprites?.draw(ctx, this.viewSprite, 0, 0, screen);
  }

  update(dt: number, _controls: Controls): void {
    // Run steps until one has to wait. A step that takes no time (a cue, a
    // turn) passes straight on to the next in the same update.
    let time = dt;
    for (let guard = 0; guard < 1000 && !this.done; guard++) {
      if (this.index >= this.steps.length) {
        this.progress = 1;
        this.end();
        return;
      }
      this.progress = this.index / this.steps.length;
      const spent = this.run(this.steps[this.index], time);
      if (spent === "waiting") return;
      time = 0;
      this.index++;
      this.timer = 0;
      this.walkIndex = 0;
      this.walkFrom = null;
      this.route = null;
    }
  }

  // Returns "waiting" if the step isn't finished, else "done".
  private run(step: CutsceneStep, dt: number): "waiting" | "done" {
    if ("say" in step) return this.openAndWait(say(step.say, undefined, step.speaker));
    if ("ask" in step) return this.openAndWait(step.ask, true);
    if ("view" in step) {
      this.viewSprite = step.view;
      return "done";
    }
    if ("unview" in step) {
      this.viewSprite = null;
      return "done";
    }
    if ("set" in step) {
      this.host.setState(step.set.var, step.set.value);
      return "done";
    }
    if ("wait" in step) {
      this.timer += dt;
      return this.timer >= step.wait ? "done" : "waiting";
    }
    if ("cue" in step) {
      this.host.cue(step.cue);
      return "done";
    }
    if ("face" in step) {
      this.host.player.face(step.face);
      return "done";
    }
    if ("goto" in step || "back" in step) {
      // Work out the way once, when the step starts. No way (or a host that
      // cannot plan one) means the step is skipped, so a scene never sticks.
      if (this.route === null) this.route = this.host.route?.(...this.destination(step)) ?? [];
      const walked = this.walk(this.route, dt);
      // Home again: face the way they were facing (the sofa).
      if (walked === "done" && "back" in step) this.host.player.face(this.origin.facing);
      return walked;
    }
    return this.walk(step.walk, dt);
  }

  private destination(step: { goto: { col: number; row: number } } | { back: true }): [number, number] {
    const to = "goto" in step ? step.goto : this.origin;
    return [to.col, to.row];
  }

  private openAndWait(node: DialogNode, keepAnswer = false): "waiting" | "done" {
    if (this.waiting) return "waiting";
    // If another dialog is open, try again next update.
    const opened = this.host.openDialog(node, (result) => {
      if (keepAnswer) this.answer = result;
      this.waiting = false;
      this.index++;
      this.timer = 0;
    });
    if (opened) this.waiting = true;
    return "waiting";
  }

  // Walks one tile per direction. The key is held only until the step has
  // started; the player then finishes it with no input, so on arrival they
  // don't carry straight on into a second tile.
  private walk(directions: Direction[], dt: number): "waiting" | "done" {
    const player = this.host.player;
    if (this.walkIndex >= directions.length) {
      this.playerControls = null;
      return "done";
    }
    if (this.walkFrom === null) {
      // Let a step already under way finish first.
      if (player.stepping) return "waiting";
      this.walkFrom = { col: player.col, row: player.row };
      this.timer = 0;
    }
    this.timer += dt;
    const arrived =
      !player.stepping && (player.col !== this.walkFrom.col || player.row !== this.walkFrom.row);
    if (arrived || this.timer > WALK_TIMEOUT) {
      // On to the next tile (a blocked one is skipped after the timeout).
      this.walkIndex++;
      this.walkFrom = null;
      this.playerControls = null;
      return this.walkIndex >= directions.length ? "done" : "waiting";
    }
    // Hold the key only until the step has started.
    this.playerControls = player.stepping ? null : { ...NO_INPUT, dir: directions[this.walkIndex] };
    return "waiting";
  }
}

function validateStep(step: unknown, where: string, context?: ValidationContext): void {
  const bad = (why: string) => {
    throw new Error(`${where}: ${why}`);
  };
  if (typeof step !== "object" || step === null || Array.isArray(step)) return bad("a step must be an object");
  const s = step as Record<string, unknown>;
  const keys = ["say", "ask", "wait", "cue", "face", "walk", "goto", "back", "view", "unview", "set"].filter((k) => k in s);
  if (keys.length !== 1) return bad("a step needs exactly one of say, ask, wait, cue, face, walk, goto, back, view, unview, set");
  switch (keys[0]) {
    case "say":
    case "cue":
      if (typeof s[keys[0]] !== "string") bad(`${keys[0]} needs text`);
      break;
    case "ask":
      if (typeof s.ask !== "object" || s.ask === null) bad("ask needs a dialog or menu");
      break;
    case "wait":
      if (typeof s.wait !== "number" || !Number.isFinite(s.wait) || s.wait < 0) bad("wait needs a number of seconds, 0 or more");
      break;
    case "face":
      if (!DIRECTIONS.includes(s.face as Direction)) bad("face needs up, down, left or right");
      break;
    case "walk":
      if (!Array.isArray(s.walk) || s.walk.some((d) => !DIRECTIONS.includes(d as Direction))) {
        bad("walk needs a list of up, down, left or right");
      }
      break;
    case "goto": {
      const g = s.goto as { col?: unknown; row?: unknown } | null;
      if (!g || !Number.isInteger(g.col) || !Number.isInteger(g.row)) bad("goto needs { col, row } with whole numbers");
      break;
    }
    case "back":
      if (s.back !== true) bad("back must be true");
      break;
    case "view":
      if (typeof s.view !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.view)) bad("view needs a sprite name");
      break;
    case "unview":
      if (s.unview !== true) bad("unview must be true");
      break;
    case "set": {
      const v = s.set as { var?: unknown; value?: unknown } | null;
      if (!v || typeof v.var !== "string" || typeof v.value !== "number" || !Number.isFinite(v.value)) {
        bad("set needs { var, value } with a variable name and a number");
      } else if (context && !context.hasState(v.var as string)) {
        bad(`set names an unknown state variable "${v.var}"`);
      }
    }
  }
}

function validate(spec: Record<string, unknown>, item: { id: string }, context?: ValidationContext): CutsceneStep[] {
  const steps = spec.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error(`Task "${item.id}": a cutscene needs a list of steps, one or more`);
  }
  steps.forEach((step, i) => validateStep(step, `Task "${item.id}", cutscene step ${i + 1}`, context));
  return steps as CutsceneStep[];
}

registerActivity(
  "cutscene",
  (spec, item, host) => new CutsceneActivity(validate(spec, item), needHost(host, `Task "${item.id}"`)),
  (spec, item, context) => void validate(spec, item, context),
);
