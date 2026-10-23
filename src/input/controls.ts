import { Keyboard } from "./keyboard";

const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
const JUMP = ["Space", "KeyW", "ArrowUp"];
const INTERACT = ["KeyE"];

export interface Controls {
  // -1 left, 0 none, 1 right
  moveX: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  interactPressed: boolean;
}

// What the player gets while locked into a task.
export const NO_INPUT: Controls = {
  moveX: 0,
  jumpPressed: false,
  jumpHeld: false,
  interactPressed: false,
};

const anyDown = (keyboard: Keyboard, codes: string[]) =>
  codes.some((c) => keyboard.isDown(c));

// Translates raw keys into game actions, so rebinding lives in one place.
export function readControls(keyboard: Keyboard): Controls {
  const left = anyDown(keyboard, LEFT);
  const right = anyDown(keyboard, RIGHT);
  return {
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    jumpPressed: JUMP.some((c) => keyboard.wasPressed(c)),
    jumpHeld: anyDown(keyboard, JUMP),
    interactPressed: INTERACT.some((c) => keyboard.wasPressed(c)),
  };
}
