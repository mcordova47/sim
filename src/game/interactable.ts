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
  // The tiles of the object, as one rectangle per tile (so an L-shaped counter
  // is exactly its tiles). It is used by standing next to a tile and facing it.
  zones: Rect[];
}
