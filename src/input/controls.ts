import { DIRECTIONS, type Direction } from "../game/direction";
import { Keyboard } from "./keyboard";

const KEYS: Record<Direction, string[]> = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
};
const INTERACT = ["KeyE"];
const CANCEL = ["Escape", "KeyX"];

export interface Controls {
  // The direction being held, or null. With several held, the newest wins.
  dir: Direction | null;
  // A direction that went down this frame (menus move one entry per press).
  dirPressed: Direction | null;
  interactPressed: boolean;
  // Back out of a menu.
  cancelPressed: boolean;
  // The code of every key that went down this frame, for mini-games that read
  // typing or particular keys (for example "KeyA", "Space", "Escape").
  keys: string[];
  // The code of every key held right now, and of every key let go this frame
  // (for "hold and release on cue" mini-games).
  keysDown: string[];
  keysReleased: string[];
}

// What the player gets while locked into a task.
export const NO_INPUT: Controls = {
  dir: null,
  dirPressed: null,
  interactPressed: false,
  cancelPressed: false,
  keys: [],
  keysDown: [],
  keysReleased: [],
};

const anyDown = (keyboard: Keyboard, codes: string[]) =>
  codes.some((c) => keyboard.isDown(c));

// The direction that won last time, so holding two keys keeps the newer one
// until it is let go.
const lastDir = new WeakMap<Keyboard, Direction>();

// Translates raw keys into game actions, so rebinding lives in one place.
export function readControls(keyboard: Keyboard): Controls {
  const held = DIRECTIONS.filter((d) => anyDown(keyboard, KEYS[d]));
  let dir: Direction | null = null;
  let dirPressed: Direction | null = null;
  if (held.length > 0) {
    const justPressed = held.filter((d) => KEYS[d].some((c) => keyboard.wasPressed(c)));
    dirPressed = justPressed.at(-1) ?? null;
    const previous = lastDir.get(keyboard);
    dir = justPressed.at(-1) ?? (previous && held.includes(previous) ? previous : held[0]);
    lastDir.set(keyboard, dir);
  } else {
    lastDir.delete(keyboard);
  }
  return {
    dir,
    dirPressed,
    interactPressed: INTERACT.some((c) => keyboard.wasPressed(c)),
    cancelPressed: CANCEL.some((c) => keyboard.wasPressed(c)),
    keys: keyboard.pressedKeys(),
    keysDown: keyboard.heldKeys(),
    keysReleased: keyboard.releasedKeys(),
  };
}
