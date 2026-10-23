import type { Effect, Requirement } from "./state";
import type { DialogNode } from "./dialog";
import type { Rect } from "./world";

// A task the player can do, placed in the room. Pure data: adding a task
// means adding an entry to a data file, never changing the engine.
export interface Interactable {
  id: string;
  name: string;
  // Verb phrase shown when the player is in range, e.g. "Make coffee".
  prompt: string;
  // Seconds the player is locked in place doing it. 0 completes instantly.
  duration: number;
  // Points for the first completion. Repeats and combos scale this. Every
  // completion is worth at least SCORING.minPoints, so 0 here still pays that.
  points: number;
  // Seconds before it can be done again; defaults to DEFAULT_TASK_COOLDOWN.
  cooldown?: number;
  // One-line joke shown on completion.
  flavor?: string;
  // Must all hold for the task to start. Otherwise the prompt shows the reason.
  requires?: Requirement[];
  // Changes made to the state when the task finishes.
  effects?: Effect[];
  // Extra points on top of `points`: `perUnit` for each unit the variable
  // holds when the task finishes (before its effects change it).
  pointsBonus?: { var: string; perUnit: number };
  // A dialog or menu to open when the task starts (for example "contemplate").
  // Until activities exist (issue 022) a task with one is instant, and the
  // dialog runs on top of it.
  dialog?: DialogNode;
  // Area in pixels where the player must be standing to use it.
  zone: Rect;
}
