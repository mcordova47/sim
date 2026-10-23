import type { Direction } from "./direction";
import type { Interactable } from "./interactable";
import type { Appearance } from "./appearance";
import type { Solid } from "./world";

// Everything the game needs to know about the room it runs in. Swapping the
// level is a one-line change where the Game is created.
export interface Level {
  // Size of the room in pixels (a whole number of tiles). May be larger than the view.
  size: { width: number; height: number };
  // Walls and furniture. The player cannot walk into them.
  solids: Solid[];
  // Things the player can use. Each `zone` covers the tiles of the object, and
  // is used by standing next to it and facing it.
  interactables: Interactable[];
  // Objects that look different depending on state.
  appearances?: Appearance[];
  // Top-left of the tile the player starts on, in pixels. Must not be blocked.
  spawn: { x: number; y: number };
  facing?: Direction;
}
