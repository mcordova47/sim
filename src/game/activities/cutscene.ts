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
//   { set: { var: "mood", value: 1 } }  set a state variable (a flag)
// The answer of the last `ask` ends up in the result's `data`.
export type CutsceneStep =
  | { say: string; speaker?: string }
  | { ask: DialogNode }
  | { wait: number }
  | { cue: string }
  | { face: Direction }
  | { walk: Direction[] }
  | { set: { var: string; value: number } };

// How long a single scripted step is given before it counts as blocked.
const WALK_TIMEOUT = 1;

// A short scripted scene. It runs its steps in order; steps that wait (text,
// a menu, a pause, a walk) hold it up until they are done. Escape skips what
// is left, which still counts as finishing the task.
export class CutsceneActivity extends BaseActivity {
  cancellable = true;

  private index = 0;
  private timer = 0;
  // Set while waiting for a dialog to close.
  private waiting = false;
  private walkIndex = 0;
  private walkFrom: { col: number; row: number } | null = null;
  // What the last `ask` was answered with.
  private answer: DialogResult | undefined;

  constructor(
    private readonly steps: CutsceneStep[],
    private readonly host: ActivityHost,
  ) {
    super();
    if (steps.length === 0) this.end();
  }

  // A cutscene that is skipped still happened.
  cancel(): void {
    this.end();
  }

  private end(): void {
    this.finish({ completed: true, ...(this.answer !== undefined && { data: this.answer }) });
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
    }
  }

  // Returns "waiting" if the step isn't finished, else "done".
  private run(step: CutsceneStep, dt: number): "waiting" | "done" {
    if ("say" in step) return this.openAndWait(say(step.say, undefined, step.speaker));
    if ("ask" in step) return this.openAndWait(step.ask, true);
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
    return this.walk(step.walk, dt);
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
  const keys = ["say", "ask", "wait", "cue", "face", "walk", "set"].filter((k) => k in s);
  if (keys.length !== 1) return bad("a step needs exactly one of say, ask, wait, cue, face, walk, set");
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
