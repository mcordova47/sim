import type { Controls } from "../../input/controls";
import { NO_INPUT } from "../../input/controls";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import { say, type DialogNode } from "../dialog";
import type { Direction } from "../direction";

// One step of a cutscene, written as data:
//   { say: "text", speaker?: "name" }   show text and wait for it to be read
//   { ask: node }                       open a menu or dialog and wait for it to close
//   { wait: 1.5 }                       do nothing for that many seconds
//   { cue: "record-spin" }              announce a named moment (sound, animation)
//   { face: "left" }                    turn the player
//   { walk: ["left", "left", "up"] }    walk the player that many tiles
export type CutsceneStep =
  | { say: string; speaker?: string }
  | { ask: DialogNode }
  | { wait: number }
  | { cue: string }
  | { face: Direction }
  | { walk: Direction[] };

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

  constructor(
    private readonly steps: CutsceneStep[],
    private readonly host: ActivityHost,
  ) {
    super();
    if (steps.length === 0) this.finish({ completed: true });
  }

  // A cutscene that is skipped still happened.
  cancel(): void {
    this.finish({ completed: true });
  }

  update(dt: number, _controls: Controls): void {
    // Run steps until one has to wait. A step that takes no time (a cue, a
    // turn) passes straight on to the next in the same update.
    let time = dt;
    for (let guard = 0; guard < 1000 && !this.done; guard++) {
      if (this.index >= this.steps.length) {
        this.progress = 1;
        this.finish({ completed: true });
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
    if ("ask" in step) return this.openAndWait(step.ask);
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

  private openAndWait(node: DialogNode): "waiting" | "done" {
    if (this.waiting) return "waiting";
    // If another dialog is open, try again next update.
    const opened = this.host.openDialog(node, () => {
      this.waiting = false;
      this.index++;
      this.timer = 0;
    });
    if (opened) this.waiting = true;
    return "waiting";
  }

  // Walks one tile per direction, holding the key until the player arrives.
  private walk(directions: Direction[], dt: number): "waiting" | "done" {
    const player = this.host.player;
    if (this.walkIndex >= directions.length) {
      this.playerControls = null;
      return "done";
    }
    if (this.walkFrom === null) {
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
    this.playerControls = { ...NO_INPUT, dir: directions[this.walkIndex] };
    return "waiting";
  }
}

registerActivity("cutscene", (spec, item, host) => {
  const steps = spec.steps;
  if (!Array.isArray(steps)) throw new Error(`Task "${item.id}": a cutscene needs a list of steps`);
  return new CutsceneActivity(steps as CutsceneStep[], needHost(host, `Task "${item.id}"`));
});
