import type { Controls } from "../input/controls";
import { createActivity, type Activity, type ActivityHost, type ActivityResult } from "./activity";
// Registers the built-in activities (wait, dialog, cutscene, typing, notes).
import "./activities";
import { ACTIVITY, DEFAULT_TASK_COOLDOWN, INTERACT_BUFFER_TIME } from "./config";
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
  activity: Activity;
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
  // The player backed out of a task's activity.
  onCancelled?: (item: Interactable) => void;
  // What activities that talk to the game (a cutscene, a dialog) are given.
  host: ActivityHost | null = null;

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

  // Swaps in the tasks of another room. Scores, combos and cooldowns stay.
  setItems(items: Interactable[]): void {
    this.items = items;
    this.nearby = null;
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
    return this.active?.activity.progress ?? 0;
  }

  // Controls the running activity wants the player to get (scripted
  // movement), or null to keep them still.
  get playerControls(): Controls | null {
    return this.active?.activity.playerControls ?? null;
  }

  update(dt: number, player: Interactor, controls: Controls): void {
    this.time += dt;
    this.interactBuffer = controls.interactPressed
      ? INTERACT_BUFFER_TIME
      : Math.max(0, this.interactBuffer - dt);

    if (this.active) {
      const { item, activity } = this.active;
      // Escape backs out of an activity that allows it. (Not the X key too:
      // that is a letter in the typing game.)
      if (activity.cancellable && controls.keys.includes("Escape")) activity.cancel();
      else activity.update(dt, controls);
      if (!activity.done) return;
      this.finish(item, activity.result);
    }

    // The first task being faced that can be started, else the first being
    // faced, so the prompt always names the task the key will start.
    const target = player.target;
    const inReach = target ? this.items.filter((i) => i.zones.some((z) => overlaps(target, z))) : [];
    this.nearby = inReach.find((i) => this.canStart(i)) ?? inReach[0] ?? null;

    if (this.nearby && this.interactBuffer > 0 && this.canStart(this.nearby)) {
      this.interactBuffer = 0;
      const activity = createActivity(this.nearby, this.host);
      this.active = { item: this.nearby, activity };
      this.onStart?.(this.nearby);
      activity.start?.();
      // Some are over the moment they start (a wait of 0 seconds).
      if (activity.done) this.finish(this.nearby, activity.result);
    } else if (this.nearby && controls.interactPressed) {
      const message = this.unavailableReason(this.nearby);
      if (message !== null) this.onBlocked?.(this.nearby, "requirement", message);
      else if (this.cooldownRemaining(this.nearby) > 0) this.onBlocked?.(this.nearby, "cooldown");
    }
  }

  private finish(item: Interactable, result: ActivityResult): void {
    this.active = null;
    // Backed out: no points, no changes to the apartment and no cooldown, so
    // it can be tried again at once.
    if (!result.completed) {
      this.onCancelled?.(item);
      return;
    }
    this.readyAt.set(item.id, this.time + (item.cooldown ?? DEFAULT_TASK_COOLDOWN));

    // The bonus is worked out before the effects, which may use up what it counts.
    const bonus = item.pointsBonus
      ? Math.round(item.pointsBonus.perUnit * (this.state?.get(item.pointsBonus.var) ?? 0))
      : 0;
    this.state?.applyEffects(item.effects);
    // How well a mini-game went scales the points; no quality means no change.
    const quality = result.quality === undefined ? undefined : Math.min(1, Math.max(0, result.quality));
    const qualityFactor =
      quality === undefined
        ? 1
        : ACTIVITY.minQualityFactor + (ACTIVITY.maxQualityFactor - ACTIVITY.minQualityFactor) * quality;
    const award = this.scoreboard.complete(
      { id: item.id, points: item.points + bonus },
      this.time,
      qualityFactor,
    );
    this.lastCompletion = { item, award, time: this.time };
    this.onComplete?.(this.lastCompletion);
  }
}
