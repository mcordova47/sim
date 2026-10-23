import type { Controls } from "../input/controls";
import { DEFAULT_TASK_COOLDOWN, INTERACT_BUFFER_TIME } from "./config";
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

  // Optional hooks for things that react to a task starting, or to the player
  // pressing interact when the task in reach is still cooling down.
  onStart?: (item: Interactable) => void;
  onBlocked?: (item: Interactable, reason: "cooldown") => void;

  private readyAt = new Map<string, number>();
  // Seconds left on a remembered interact press.
  private interactBuffer = 0;

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
    if (!this.active) return 0;
    const { elapsed, item } = this.active;
    return item.duration > 0 ? Math.min(1, elapsed / item.duration) : 1;
  }

  update(dt: number, player: Interactor, controls: Controls): void {
    this.time += dt;
    this.interactBuffer = controls.interactPressed
      ? INTERACT_BUFFER_TIME
      : Math.max(0, this.interactBuffer - dt);

    if (this.active) {
      this.active.elapsed += dt;
      if (this.active.elapsed < this.active.item.duration) return;
      this.finish(this.active.item);
    }

    // The first task in reach that can be started, else the first in reach, so
    // the prompt always names the task the key will start.
    const inReach = this.items.filter((i) => overlaps(player, i.zone));
    this.nearby = inReach.find((i) => this.cooldownRemaining(i) === 0) ?? inReach[0] ?? null;

    if (
      this.nearby &&
      this.interactBuffer > 0 &&
      player.grounded &&
      this.cooldownRemaining(this.nearby) === 0
    ) {
      this.interactBuffer = 0;
      this.active = { item: this.nearby, elapsed: 0 };
      this.onStart?.(this.nearby);
      if (this.nearby.duration <= 0) this.finish(this.nearby);
    } else if (
      this.nearby &&
      controls.interactPressed &&
      player.grounded &&
      this.cooldownRemaining(this.nearby) > 0
    ) {
      this.onBlocked?.(this.nearby, "cooldown");
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
