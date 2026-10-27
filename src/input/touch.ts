import type { Direction } from "../game/direction";

// The touch layer's logic (issue 087, docs/mobile.md section 3), with no DOM in it so
// it can be tested: pointer events in, ordinary keyboard events out (the same `code`s
// the keyboard sends), so `Keyboard`, `readControls` and everything that listens for
// keys work with no change. The DOM side is in touch-ui.ts.

export type TouchControl = "a" | "b" | "cycle" | "list" | "mute";

// Where the touch layer sends keys. In the page this raises KeyboardEvents on window.
export interface KeySink {
  down(code: string, shift: boolean): void;
  up(code: string, shift: boolean): void;
}

export const TOUCH_KEYS = {
  dir: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" } as Record<Direction, string>,
  a: "KeyE",
  b: "Escape",
  cycle: "Tab",
  list: "KeyL",
  mute: "KeyM",
  shift: "ShiftLeft",
} as const;

export const TOUCH = {
  // The d-pad's middle, as a share of its width where nothing is pressed.
  deadZone: 0.24,
  // How long the cycle button is held to go backwards (Shift+Tab), in milliseconds.
  longPressMs: 400,
  // The length of one game update, for counting the long press.
  frameMs: 1000 / 60,
};

// Which way a point on the d-pad means. `x` and `y` are from the pad's middle and `size`
// is the pad's width. Four directions, no diagonals: the bigger offset wins.
export function dpadDirection(x: number, y: number, size: number): Direction | null {
  if (Math.hypot(x, y) < size * TOUCH.deadZone * 0.5) return null;
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  return y < 0 ? "up" : "down";
}

// Whether the touch buttons show. A touch screen shows them, a laptop does not, and a
// real keyboard (an iPad with one) hides them again. `override` is `?touch=1` or `?touch=0`.
export function touchLayerVisible(input: {
  coarse: boolean;
  maxTouchPoints: number;
  sawRealKey: boolean;
  override?: boolean | null;
}): boolean {
  if (input.override === true) return true;
  if (input.override === false) return false;
  if (input.sawRealKey) return false;
  return input.coarse && input.maxTouchPoints > 0;
}

interface KeyState {
  // Updates that have read this key as down.
  seen: number;
  // A release that came before any update saw the key: held back one update so that a quick
  // tap still counts (a key down and up between two updates would be missed).
  pendingUp: boolean;
  shift: boolean;
}

type Owner = { kind: "pad"; dir: Direction | null } | { kind: "button"; control: TouchControl };

export class TouchPad {
  private keys = new Map<string, KeyState>();
  private owners = new Map<number, Owner>();
  private presses = new Map<TouchControl, number>();
  private cycle: { held: boolean; ms: number; long: boolean; tabSent: boolean; finishing: boolean } | null = null;

  constructor(private readonly sink: KeySink) {}

  // A finger went down on a button.
  pressControl(pointerId: number, control: TouchControl): void {
    if (this.owners.has(pointerId)) this.releasePointer(pointerId);
    this.owners.set(pointerId, { kind: "button", control });
    const count = (this.presses.get(control) ?? 0) + 1;
    this.presses.set(control, count);
    if (count > 1) return;
    if (control === "cycle") {
      // A long press still finishing (Tab or Shift not yet let go): finish it first, so a
      // new press cannot orphan Shift.
      if (this.cycle) {
        this.up(TOUCH_KEYS.cycle);
        this.up(TOUCH_KEYS.shift);
      }
      this.cycle = { held: true, ms: 0, long: false, tabSent: false, finishing: false };
    } else {
      this.down(TOUCH_KEYS[control]);
    }
  }

  // A finger is on the pad, in this direction (null is the dead zone or off the pad).
  padMove(pointerId: number, dir: Direction | null): void {
    let owner = this.owners.get(pointerId);
    if (owner && owner.kind !== "pad") {
      this.releasePointer(pointerId);
      owner = undefined;
    }
    if (!owner) {
      // One finger walks; a second on the pad is ignored.
      for (const other of this.owners.values()) if (other.kind === "pad") return;
      owner = { kind: "pad", dir: null };
      this.owners.set(pointerId, owner);
    }
    if (owner.kind !== "pad" || owner.dir === dir) return;
    // Let go of the old direction first, so two are never down together.
    // At once, even if no update has read it yet: the old direction must not overlap the new.
    if (owner.dir) this.up(TOUCH_KEYS.dir[owner.dir], true);
    owner.dir = dir;
    if (dir) this.down(TOUCH_KEYS.dir[dir]);
  }

  // A finger lifted, or the system took it (pointercancel).
  releasePointer(pointerId: number): void {
    const owner = this.owners.get(pointerId);
    if (!owner) return;
    this.owners.delete(pointerId);
    if (owner.kind === "pad") {
      if (owner.dir) this.up(TOUCH_KEYS.dir[owner.dir]);
      return;
    }
    const count = (this.presses.get(owner.control) ?? 1) - 1;
    if (count > 0) {
      this.presses.set(owner.control, count);
      return;
    }
    this.presses.delete(owner.control);
    if (owner.control === "cycle") this.releaseCycle();
    else this.up(TOUCH_KEYS[owner.control]);
  }

  // Lets go of everything at once: blur, the page hidden, the layer switched off. The loop
  // may be stopped, so nothing is held back for a later update.
  releaseAll(): void {
    this.owners.clear();
    this.presses.clear();
    this.cycle = null;
    for (const [code, state] of [...this.keys]) {
      this.keys.delete(code);
      this.sink.up(code, state.shift);
    }
  }

  // The codes held right now (for tests and for the stray-key checks).
  held(): string[] {
    return [...this.keys.keys()];
  }

  // Call once at the end of every game update, after the keyboard's own endFrame.
  afterFrame(): void {
    for (const [code, state] of [...this.keys]) {
      state.seen++;
      if (state.pendingUp) {
        this.keys.delete(code);
        this.sink.up(code, state.shift);
      }
    }
    const c = this.cycle;
    if (!c) return;
    if (c.held && !c.long) {
      c.ms += TOUCH.frameMs;
      if (c.ms >= TOUCH.longPressMs) {
        c.long = true;
        // Shift goes down now and Tab on a later update, so Shift is held while Tab is read.
        this.down(TOUCH_KEYS.shift, true);
      }
    } else if (c.long && !c.tabSent) {
      c.tabSent = true;
      this.down(TOUCH_KEYS.cycle, true);
      if (!c.held) c.finishing = true;
      if (!c.held) this.up(TOUCH_KEYS.cycle);
    }
    if (c.finishing && !this.keys.has(TOUCH_KEYS.cycle)) {
      this.up(TOUCH_KEYS.shift);
      this.cycle = null;
    }
  }

  private releaseCycle(): void {
    const c = this.cycle;
    if (!c) return;
    c.held = false;
    if (!c.long) {
      // A short press: Tab, forward.
      this.cycle = null;
      this.down(TOUCH_KEYS.cycle);
      this.up(TOUCH_KEYS.cycle);
      return;
    }
    if (c.tabSent) {
      c.finishing = true;
      this.up(TOUCH_KEYS.cycle);
    }
    // Otherwise Tab still goes down at the next afterFrame, then both let go.
  }

  private down(code: string, shift = false): void {
    const state = this.keys.get(code);
    if (state) {
      if (!state.pendingUp) return;
      // Pressed again before the held-back release: finish that one, then press anew.
      this.keys.delete(code);
      this.sink.up(code, state.shift);
    }
    this.keys.set(code, { seen: 0, pendingUp: false, shift });
    this.sink.down(code, shift);
  }

  private up(code: string, now = false): void {
    const state = this.keys.get(code);
    if (!state) return;
    if (state.seen === 0 && !now) {
      state.pendingUp = true;
      return;
    }
    this.keys.delete(code);
    this.sink.up(code, state.shift);
  }
}

const KEY_NAMES: Record<string, string> = {
  Escape: "Escape",
  Tab: "Tab",
  ShiftLeft: "Shift",
};

// A sink that raises KeyboardEvents on a target (window). They are not trusted events, so
// `isTrusted` tells them from a real keyboard.
export function eventKeySink(target: { dispatchEvent(event: Event): boolean }): KeySink {
  const send = (type: string, code: string, shift: boolean) => {
    const key = KEY_NAMES[code] ?? (code.startsWith("Key") ? code.slice(3).toLowerCase() : code);
    target.dispatchEvent(new KeyboardEvent(type, { code, key, shiftKey: shift, bubbles: true, cancelable: true }));
  };
  return {
    down: (code, shift) => send("keydown", code, shift),
    up: (code, shift) => send("keyup", code, shift),
  };
}
