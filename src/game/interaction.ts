import type { Controls } from "../input/controls";
import { DEFAULT_TASK_COOLDOWN } from "./config";
import type { Interactable } from "./interactable";
import { Scoreboard, type Award } from "./scoring";
import { overlaps, type Rect } from "./world";

export interface CompletionEvent {
  item: Interactable;
  award: Award;
  time: number;
}

interface ActiveTask {
  item: Interactable;
  elapsed: number;
}

// What the interaction system needs to know about the player.
export type Interactor = Rect & { grounded: boolean };

// Finds the interactable the player is standing in, starts tasks on the
// interact key, and awards points when they finish. While `busy` the caller
// should feed the player no input.
export class InteractionSystem {
  readonly scoreboard = new Scoreboard();
  // Game time in seconds, advanced by update().
  time = 0;
  // The interactable in range right now, if any.
  nearby: Interactable | null = null;
  active: ActiveTask | null = null;
  lastCompletion: CompletionEvent | null = null;

  private readyAt = new Map<string, number>();

  constructor(
    private items: Interactable[],
    private onComplete?: (event: CompletionEvent) => void,
  ) {}

  get busy(): boolean {
    return this.active !== null;
  }

  // 0 when the task can be started now.
  cooldownRemaining(item: Interactable): number {
    return Math.max(0, (this.readyAt.get(item.id) ?? 0) - this.time);
  }

  // 0..1 progress of the running task.
  get progress(): number {
    return this.active ? Math.min(1, this.active.elapsed / this.active.item.duration) : 0;
  }

  update(dt: number, player: Interactor, controls: Controls): void {
    this.time += dt;

    if (this.active) {
      this.active.elapsed += dt;
      if (this.active.elapsed >= this.active.item.duration) this.finish(this.active.item);
      return;
    }

    this.nearby = this.items.find((i) => overlaps(player, i.zone)) ?? null;

    if (
      this.nearby &&
      controls.interactPressed &&
      player.grounded &&
      this.cooldownRemaining(this.nearby) === 0
    ) {
      this.active = { item: this.nearby, elapsed: 0 };
    }
  }

  private finish(item: Interactable): void {
    this.active = null;
    this.readyAt.set(item.id, this.time + (item.cooldown ?? DEFAULT_TASK_COOLDOWN));

    const award = this.scoreboard.complete(item, this.time);
    this.lastCompletion = { item, award, time: this.time };
    this.onComplete?.(this.lastCompletion);
  }
}
