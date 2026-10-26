import type { Controls } from "../input/controls";
import type { DialogNode, DialogResult } from "./dialog";
import type { Direction } from "./direction";
import type { SpriteDrawer } from "../render/sprites";
import type { Interactable } from "./interactable";
import type { Track } from "./music/track";
import type { Decor } from "./decor";
import type { Effect } from "./state";

// An activity is what a task is while the player is doing it. Today's timed
// wait is one; a cutscene and the mini-games are others. The interaction
// system only knows this interface, so a new kind of activity is one class and
// one `registerActivity` call.

// How it ended. `quality` runs from 0 to 1 and scales the points between
// `ACTIVITY.minQualityFactor` and `maxQualityFactor`; leave it out for an
// activity that has no "how well" (a wait, a cutscene), which pays its usual
// points. A NaN quality counts as 0.
//
// `completed: false` means the task was backed out of or failed to run: no
// points, no changes to the apartment (its `effects` do not apply) and no
// cooldown, so it can be started again at once; `taskCancelled` fires.
//
// `data` is an optional outcome the activity wants to pass on (a cutscene puts
// the answer of its last `ask` there). It is handed on in the completion event
// and does not affect the score.
export interface ActivityResult {
  completed: boolean;
  // With `completed: false`: the activity is simply over, and that is not a
  // cancel. Nothing is paid, no cooldown starts and `taskCancelled` does not
  // fire (the track editor's normal exit). Ignored when `completed` is true.
  quiet?: boolean;
  quality?: number;
  data?: unknown;
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
  // Sets a variable of the apartment's state (a flag), clamped to its range.
  setState(id: string, value: number): void;
  readonly player: PlayerView;
  // The steps (one direction per tile) from where the player stands to the
  // tile `col`, `row` in this room, around furniture and not through doorways,
  // or null if there is no way. Empty if they are already there.
  route?(col: number, row: number): Direction[] | null;
  // Where full-screen pictures come from (a cutscene's `view`). Missing in tests.
  readonly sprites?: SpriteDrawer;
  // Reads a variable of the apartment's state. Missing in tests.
  getState?(id: string): number;
  // A random number from 0 up to 1. Injected, so tests are deterministic.
  random(): number;
  // Plays `track` over the music for a preview (the track editor), or puts the
  // record back with null. `live` swaps the track at the end of the loop that
  // is playing instead of restarting it. Missing in tests.
  previewTrack?(track: Track | null, live?: boolean): void;
  // A short note sounded for a key press, at `freq` Hz (the track editor).
  blip?(freq: number): void;
  // One letter of mumblespeak, at `pitch` times the base blip (the flashcards). Missing in tests.
  voice?(pitch: number): void;
  // Pays points and applies `effects` for the running task right now, as if it
  // had finished, without ending it. Returns the points, or null if nothing was paid.
  reward?(points: number, effects: Effect[]): number | null;
  // The decor you own and have placed (the swap list). Missing in tests.
  readonly decor?: Decor;
  // Opens the packages waiting by the door (adds the items, shows one line each). Missing in tests.
  collectDeliveries?(): void;
  // Game minutes played so far (the clock held still by an activity does not count).
  gameMinutes?(): number;
}

export interface Activity {
  readonly done: boolean;
  // Valid once `done` is true.
  readonly result: ActivityResult;
  // 0 to 1, for the progress bar over the player.
  readonly progress: number;
  // Whether Escape backs out of it.
  readonly cancellable: boolean;
  // True for an activity that reads raw keys (typing: E is a letter), so a
  // press of the interact key made during it is its own and is not kept to
  // start another task afterwards.
  readonly readsKeys?: boolean;
  // True while letters it reads are text, so the mute key is a letter too. When
  // missing, `readsKeys` decides (typing: always; the track editor: while naming).
  readonly readsLetters?: boolean;
  // True for an activity with no time pressure: the apartment's clock, energy
  // and mood stand still while it runs (the track editor).
  readonly holdsClock?: boolean;
  // Controls to give the player while it runs, for scripted movement; null
  // keeps the player where they are.
  readonly playerControls: Controls | null;
  // Called once, right after the task has been announced as started (in the
  // same frame as the opening press, which `update` does not see). Anything
  // with side effects (opening a dialog) belongs here and not in the constructor.
  start?(): void;
  // Called every frame while the task runs, except while a dialog is open (the
  // clock stands still then, see `DIALOG.pauseClock`).
  update(dt: number, controls: Controls): void;
  // Drawn in screen space, over the HUD, while it runs.
  draw?(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void;
  // Backs out of it. The interaction system calls it only when Escape is
  // pressed and `cancellable` is true (or by the game when Escape is pressed
  // while the activity's dialog is up). It
  // is not called when the activity finishes by itself. Does nothing once done.
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

// Checks a spec's settings without building anything; throws a message that
// names the task. Run for every task when a level is built.
// `context` says what the game knows (for now, which state variables exist); it
// is missing when a task is checked with no game around.
export interface ValidationContext {
  hasState(id: string): boolean;
}
export type ActivityValidator = (spec: ActivitySpec, item: Interactable, context?: ValidationContext) => void;

const registry = new Map<string, { factory: ActivityFactory; validate?: ActivityValidator }>();

export function registerActivity(
  type: string,
  factory: ActivityFactory,
  validate?: ActivityValidator,
): void {
  registry.set(type, { factory, validate });
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

// Throws, naming the task, if its `activity` is not a known type with sane
// settings. Called when a level is built, so a typo shows up then and not on
// the first press of the interact key.
export function validateActivity(item: Interactable, context?: ValidationContext): void {
  const raw: unknown = item.activity;
  if (raw !== undefined) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`Task "${item.id}": activity must be an object like { type: "wait" }, not ${Array.isArray(raw) ? "a list" : String(raw)}`);
    }
    if (typeof (raw as ActivitySpec).type !== "string") {
      throw new Error(`Task "${item.id}": activity needs a type, like { type: "wait" }`);
    }
  }
  const spec = specFor(item);
  const entry = registry.get(spec.type);
  if (!entry) throw new Error(`Task "${item.id}" has an unknown activity type "${spec.type}"`);
  entry.validate?.(spec, item, context);
}

export function createActivity(item: Interactable, host: ActivityHost | null): Activity {
  validateActivity(item);
  const spec = specFor(item);
  return registry.get(spec.type)!.factory(spec, item, host);
}

// For activities that talk to the game: complains clearly if there is none.
export function needHost(host: ActivityHost | null, what: string): ActivityHost {
  if (!host) throw new Error(`${what} needs the game to run it, but there is no host`);
  return host;
}
