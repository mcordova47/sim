import type { Interactable } from "./interactable";
import type { Solid } from "./world";

// Everything the game needs to know about the room it runs in. Swapping the
// level is a one-line change where the Game is created.
export interface Level {
  // Size of the whole room in pixels. May be larger than the view.
  size: { width: number; height: number };
  solids: Solid[];
  interactables: Interactable[];
  // Top-left of the player's starting position, in pixels. Must not overlap a solid.
  spawn: { x: number; y: number };
}
