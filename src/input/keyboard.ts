// Keys are identified by KeyboardEvent.code (physical key), e.g. "KeyA", "Space".
const PREVENT_DEFAULT = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

export class Keyboard {
  private held = new Set<string>();
  private pressed = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.pressed.add(e.code);
    });
    target.addEventListener("keyup", (e) => {
      this.held.delete(e.code);
    });
    // Avoid keys getting stuck down when focus leaves the page.
    target.addEventListener("blur", () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  // True only on the update step after the key went down.
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  // The codes of every key that went down since the last endFrame().
  pressedKeys(): string[] {
    return [...this.pressed];
  }

  // Call once at the end of each update step.
  endFrame(): void {
    this.pressed.clear();
  }
}
