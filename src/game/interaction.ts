import type { Controls } from "../input/controls";
import { DEFAULT_TASK_COOLDOWN, INTERACT_BUFFER_TIME } from "./config";
import type { Interactable } from "./interactable";
import { Scoreboard, type Award } from "./scoring";
import type { ApartmentState } from "./state";
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

// What the interaction system needs to know about the player: the tile they
// are facing, or null while they are mid-step and can't use anything.
export interface Interactor {
  target: Rect | null;
}

// Finds the interactable the player is facing, starts tasks on the interact
// key, and awards points when they finish. While `busy` the caller should feed
// the player no input.
export class InteractionSystem {
  readonly scoreboard = new Scoreboard();
  // Game time in seconds, advanced by update().
  time = 0;
  // The interactable the player is facing right now, if any.
  nearby: Interactable | null = null;
  active: ActiveTask | null = null;
  lastCompletion: CompletionEvent | null = null;

  // Optional hooks for things that react to a task starting, or to the player
  // pressing interact when the task in reach is still cooling down.
  onStart?: (item: Interactable) => void;
  // `message` is the unmet requirement's reason when `reason` is "requirement".
  onBlocked?: (item: Interactable, reason: "cooldown" | "requirement", message?: string) => void;

  private readyAt = new Map<string, number>();
  // Seconds left on a remembered interact press.
  private interactBuffer = 0;

  constructor(
    private items: Interactable[],
    private onComplete?: (event: CompletionEvent) => void,
    private readonly state?: ApartmentState,
  ) {}

  // Forgets a remembered interact press. Called when something else takes the
  // controls (a dialog), so a press made just before doesn't start a task
  // when the controls come back.
  clearPressBuffer(): void {
    this.interactBuffer = 0;
  }

  get busy(): boolean {
    return this.active !== null;
  }

  // 0 when the task can be started now.
  cooldownRemaining(item: Interactable): number {
    return Math.max(0, (this.readyAt.get(item.id) ?? 0) - this.time);
  }

  // Why the task can't be done now (its first unmet requirement), or null.
  unavailableReason(item: Interactable): string | null {
    if (!item.requires?.length) return null;
    if (!this.state) throw new Error(`Task "${item.id}" has requirements but there is no state`);
    return this.state.unmetReason(item.requires);
  }

  // Off cooldown and every requirement met.
  canStart(item: Interactable): boolean {
    return this.cooldownRemaining(item) === 0 && this.unavailableReason(item) === null;
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

    // The first task being faced that can be started, else the first being
    // faced, so the prompt always names the task the key will start.
    const target = player.target;
    const inReach = target ? this.items.filter((i) => overlaps(target, i.zone)) : [];
    this.nearby = inReach.find((i) => this.canStart(i)) ?? inReach[0] ?? null;

    if (this.nearby && this.interactBuffer > 0 && this.canStart(this.nearby)) {
      this.interactBuffer = 0;
      this.active = { item: this.nearby, elapsed: 0 };
      this.onStart?.(this.nearby);
      if (this.nearby.duration <= 0) this.finish(this.nearby);
    } else if (this.nearby && controls.interactPressed) {
      const message = this.unavailableReason(this.nearby);
      if (message !== null) this.onBlocked?.(this.nearby, "requirement", message);
      else if (this.cooldownRemaining(this.nearby) > 0) this.onBlocked?.(this.nearby, "cooldown");
    }
  }

  private finish(item: Interactable): void {
    this.active = null;
    this.readyAt.set(item.id, this.time + (item.cooldown ?? DEFAULT_TASK_COOLDOWN));

    // The bonus is worked out before the effects, which may use up what it counts.
    const bonus = item.pointsBonus
      ? Math.round(item.pointsBonus.perUnit * (this.state?.get(item.pointsBonus.var) ?? 0))
      : 0;
    this.state?.applyEffects(item.effects);
    const award = this.scoreboard.complete({ id: item.id, points: item.points + bonus }, this.time);
    this.lastCompletion = { item, award, time: this.time };
    this.onComplete?.(this.lastCompletion);
  }
}
