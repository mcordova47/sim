import type { Controls } from "../../input/controls";
import { BaseActivity, registerActivity } from "../activity";

// The plain timed task: the player holds still for `duration` seconds. A
// duration of 0 is over at once.
export class WaitActivity extends BaseActivity {
  cancellable = true;
  private elapsed = 0;

  constructor(private readonly duration: number) {
    super();
    if (!(duration > 0)) {
      this.progress = 1;
      this.finish({ completed: true });
    }
  }

  update(dt: number, _controls: Controls): void {
    if (this.done) return;
    this.elapsed += dt;
    this.progress = Math.min(1, this.elapsed / this.duration);
    if (this.elapsed >= this.duration) this.finish({ completed: true });
  }
}

registerActivity(
  "wait",
  (_spec, item) => new WaitActivity(item.duration),
  (_spec, item) => {
    if (typeof item.duration !== "number" || Number.isNaN(item.duration)) {
      throw new Error(`Task "${item.id}": a wait needs a duration in seconds`);
    }
  },
);
