import type { Controls } from "../input/controls";
import type { DialogNode, DialogResult } from "./dialog";
import type { Direction } from "./direction";
import type { Interactable } from "./interactable";

// An activity is what a task is while the player is doing it. Today's timed
// wait is one; a cutscene and the mini-games are others. The interaction
// system only knows this interface, so a new kind of activity is one class and
// one `registerActivity` call.

// How it ended. `quality` runs from 0 to 1 and scales the points between
// `ACTIVITY.minQualityFactor` and `maxQualityFactor`; leave it out for an
// activity that has no "how well" (a wait, a cutscene), which pays its usual
// points. A task that was `completed: false` was backed out of: no points,
// no changes to the apartment and no cooldown.
export interface ActivityResult {
  completed: boolean;
  quality?: number;
}

// What a cutscene is allowed to know about the player, and to do to them.
export interface PlayerView {
  readonly col: number;
  readonly row: number;
  readonly facing: Direction;
  readonly stepping: boolean;
  face(direction: Direction): void;
}

// What the game offers an activity.
export interface ActivityHost {
  // Opens a dialog. Returns false if one is already open.
  openDialog(node: DialogNode, onDone: (result: DialogResult) => void): boolean;
  // Announces a named moment, for sound and animation features.
  cue(name: string): void;
  readonly player: PlayerView;
  // A random number from 0 up to 1. Injected, so tests are deterministic.
  random(): number;
}

export interface Activity {
  readonly done: boolean;
  // Valid once `done` is true.
  readonly result: ActivityResult;
  // 0 to 1, for the progress bar over the player.
  readonly progress: number;
  // Whether Escape backs out of it.
  readonly cancellable: boolean;
  // Controls to give the player while it runs, for scripted movement; null
  // keeps the player where they are.
  readonly playerControls: Controls | null;
  // Called once, right after the task has been announced as started. Anything
  // with side effects (opening a dialog) belongs here and not in the constructor.
  start?(): void;
  update(dt: number, controls: Controls): void;
  // Drawn in screen space, over the HUD, while it runs.
  draw?(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void;
  // Backs out of it. Does nothing once it is done.
  cancel(): void;
}

export abstract class BaseActivity implements Activity {
  done = false;
  result: ActivityResult = { completed: false };
  progress = 0;
  cancellable = false;
  playerControls: Controls | null = null;

  abstract update(dt: number, controls: Controls): void;

  cancel(): void {
    this.finish({ completed: false });
  }

  protected finish(result: ActivityResult): void {
    if (this.done) return;
    this.done = true;
    this.result = result;
    this.playerControls = null;
  }
}

// How a task names its activity, in data: `{ type: "typing", lines: 3 }`. The
// other keys are that type's own settings.
export type ActivitySpec = { type: string } & Record<string, unknown>;

export type ActivityFactory = (
  spec: ActivitySpec,
  item: Interactable,
  host: ActivityHost | null,
) => Activity;

const registry = new Map<string, ActivityFactory>();

export function registerActivity(type: string, factory: ActivityFactory): void {
  registry.set(type, factory);
}

export function unregisterActivity(type: string): void {
  registry.delete(type);
}

export function hasActivity(type: string): boolean {
  return registry.has(type);
}

// The activity a task asks for: its `activity`, or a dialog if it has one, or a
// plain wait.
export function specFor(item: Interactable): ActivitySpec {
  if (item.activity) return item.activity;
  return item.dialog ? { type: "dialog" } : { type: "wait" };
}

export function createActivity(item: Interactable, host: ActivityHost | null): Activity {
  const spec = specFor(item);
  const factory = registry.get(spec.type);
  if (!factory) throw new Error(`Task "${item.id}" has an unknown activity type "${spec.type}"`);
  return factory(spec, item, host);
}

// For activities that talk to the game: complains clearly if there is none.
export function needHost(host: ActivityHost | null, what: string): ActivityHost {
  if (!host) throw new Error(`${what} needs the game to run it, but there is no host`);
  return host;
}
