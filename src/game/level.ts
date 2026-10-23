import type { Interactable } from "./interactable";
import type { Solid } from "./world";

// A sprite placed in the room, in pixels. Decor is wall dressing and is drawn
// behind furniture.
export interface Prop {
  sprite: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: "decor" | "furniture";
}

// What to draw besides the player. Pure data, so it can be tested without a canvas.
export interface Scene {
  // The back wall, behind everything.
  wall: { x: number; y: number; w: number; h: number };
  // Floor, ceiling and end walls, drawn over the back wall and under the props.
  shell: { x: number; y: number; w: number; h: number }[];
  props: Prop[];
}

// Everything the game needs to know about the room it runs in. Swapping the
// level is a one-line change where the Game is created.
export interface Level {
  // Size of the whole room in pixels. May be larger than the view.
  size: { width: number; height: number };
  solids: Solid[];
  interactables: Interactable[];
  // Top-left of the player's starting position, in pixels. Must not overlap a solid.
  spawn: { x: number; y: number };
  // Optional art. A level without one draws only the player and the UI.
  scene?: Scene;
}
