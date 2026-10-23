import type { Interactable } from "./interactable";
import { PLACEHOLDER_INTERACTABLES } from "./placeholder-interactables";
import { PLACEHOLDER_SOLIDS, PLACEHOLDER_SPAWN } from "./placeholder-room";
import type { Solid } from "./world";

// Everything the game needs to know about the room it runs in. Swapping the
// level is a one-line change where the Game is created.
export interface Level {
  solids: Solid[];
  interactables: Interactable[];
  // Top-left of the player's starting position, in pixels. Must not overlap a solid.
  spawn: { x: number; y: number };
}

export const PLACEHOLDER_LEVEL: Level = {
  solids: PLACEHOLDER_SOLIDS,
  interactables: PLACEHOLDER_INTERACTABLES,
  spawn: PLACEHOLDER_SPAWN,
};
