import { describe, expect, it } from "vitest";
import { NO_INPUT, readControls } from "./controls";
import type { Keyboard } from "./keyboard";

// A stand-in keyboard: which keys are down, and which went down this frame.
function fakeKeyboard() {
  const down = new Set<string>();
  const pressed = new Set<string>();
  const keyboard = {
    isDown: (code: string) => down.has(code),
    wasPressed: (code: string) => pressed.has(code),
  } as unknown as Keyboard;
  return {
    keyboard,
    press(code: string) {
      down.add(code);
      pressed.add(code);
    },
    release(code: string) {
      down.delete(code);
    },
    endFrame() {
      pressed.clear();
    },
  };
}

describe("readControls", () => {
  it("reads no direction when nothing is held", () => {
    expect(readControls(fakeKeyboard().keyboard)).toEqual(NO_INPUT);
  });

  it("reads WASD and the arrow keys", () => {
    for (const [key, dir] of [
      ["KeyW", "up"], ["ArrowUp", "up"], ["KeyS", "down"], ["ArrowDown", "down"],
      ["KeyA", "left"], ["ArrowLeft", "left"], ["KeyD", "right"], ["ArrowRight", "right"],
    ] as const) {
      const k = fakeKeyboard();
      k.press(key);
      expect(readControls(k.keyboard).dir, key).toBe(dir);
    }
  });

  it("reads the interact key as a press only for the frame it goes down", () => {
    const k = fakeKeyboard();
    k.press("KeyE");
    expect(readControls(k.keyboard).interactPressed).toBe(true);
    k.endFrame();
    expect(readControls(k.keyboard).interactPressed).toBe(false);
  });

  it("lets the newest direction win when two are held, and keeps it until let go", () => {
    const k = fakeKeyboard();
    k.press("KeyD");
    expect(readControls(k.keyboard).dir).toBe("right");
    k.endFrame();
    k.press("KeyW");
    expect(readControls(k.keyboard).dir).toBe("up");
    k.endFrame();
    expect(readControls(k.keyboard).dir).toBe("up"); // still the newer one
    k.release("KeyW");
    expect(readControls(k.keyboard).dir).toBe("right"); // falls back to what is left
    k.release("KeyD");
    expect(readControls(k.keyboard).dir).toBeNull();
  });

  it("has no jump control any more", () => {
    const k = fakeKeyboard();
    k.press("Space");
    expect(readControls(k.keyboard)).toEqual(NO_INPUT);
  });
});
