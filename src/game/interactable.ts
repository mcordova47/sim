import type { Effect, Requirement } from "./state";
import type { ActivitySpec } from "./activity";
import type { DialogNode } from "./dialog";
import type { HourWindow } from "./time-of-day/hours";
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
  // Tasks that share this name are variants of one thing (the mirror at
  // different hours): only the first one that can start is offered, so the
  // player never cycles through two of the same.
  exclusive?: string;
  // One-line joke shown on completion.
  flavor?: string;
  // Must all hold for the task to start. Otherwise the prompt shows the reason.
  requires?: Requirement[];
  // Changes made to the state when the task finishes.
  effects?: Effect[];
  // Extra points on top of `points`: `perUnit` for each unit the variable
  // holds when the task finishes (before its effects change it).
  pointsBonus?: { var: string; perUnit: number };
  // Hours of the day when the task is at its best (see time-of-day/hours.ts;
  // a window may run past midnight). Finishing it then multiplies its points
  // by TIME_OF_DAY.bonusMultiplier, and its prompt says so.
  goodHours?: HourWindow[];
  // What the task is while it runs: `{ type: "typing" }`, a cutscene, and so
  // on (see activities/). Without one, it is a plain wait of `duration`
  // seconds, or the `dialog` below if there is one.
  activity?: ActivitySpec;
  // A dialog or menu that is the task ("contemplate"). Shorthand for
  // `activity: { type: "dialog" }`: the task is over, and scores, when the
  // dialog closes (and not at all if the player backs out of it).
  dialog?: DialogNode;
  // The pose the player takes while it runs (a key of POSES in poses.ts). It
  // plays only at the piece the pose belongs to; anywhere else, or with the
  // art missing, the plain player is drawn.
  pose?: string;
  // An item shown in the player's hands while it runs (poses.ts), when no pose
  // is drawn.
  held?: string;
  // The tiles of the object, as one rectangle per tile (so an L-shaped counter
  // is exactly its tiles). It is used by standing next to a tile and facing it.
  zones: Rect[];
}
