import type { Controls } from "../../input/controls";
import { SLEEP } from "../config";
import { sleepSceneAt, sleepTotal, type SleepKind, type SleepScene } from "../sleep";
import { BaseActivity, registerActivity } from "../activity";
import type { Effect } from "../state";

// The sleep sequence (issue 078): a timed task that holds the clock still and
// publishes a `scene` each frame (how dark, how far toward the new morning, the
// banner) for the light to draw. It changes no state itself: the payout and the
// clock jump are the task's effects, applied when it finishes, and Escape
// applies none, so a cancel is correct by construction. Gone is gone: the scene
// is read from the running activity, so there is nothing to undo.
export class SleepActivity extends BaseActivity {
  cancellable = true;
  readonly holdsClock: boolean;
  private elapsed = 0;
  scene: SleepScene;

  constructor(private readonly kind: SleepKind, private readonly skipHours: number) {
    super();
    this.holdsClock = SLEEP[kind].holdClock;
    this.scene = sleepSceneAt(kind, 0, skipHours);
  }

  update(dt: number, _controls: Controls): void {
    if (this.done) return;
    const total = sleepTotal(SLEEP[this.kind]);
    this.elapsed += dt;
    this.progress = Math.min(1, this.elapsed / total);
    this.scene = sleepSceneAt(this.kind, this.elapsed, this.skipHours);
    if (this.elapsed >= total) this.finish({ completed: true });
  }
}

// How many game hours the task's effects move the clock (read from the data, so
// the wake light always matches where the clock will land).
export function clockJump(effects: readonly Effect[] | undefined): number {
  let hours = 0;
  for (const e of effects ?? []) if (e.var === "clock" && typeof e.add === "number") hours += e.add;
  return hours;
}

registerActivity(
  "sleep",
  (spec, item) => new SleepActivity(spec.kind === "nap" ? "nap" : "sleep", clockJump(item.effects)),
  (spec, item) => {
    if (spec.kind !== "sleep" && spec.kind !== "nap") {
      throw new Error(`Task "${item.id}": a sleep activity needs kind "sleep" or "nap"`);
    }
  },
);
