// One place that turns a desktop key name into the label for the controls in use (issue 093).
// Every on-screen hint that names a key goes through here, so the touch layer shows the
// buttons a player can press (A, B, the pad, CHOICE, PAUSE) and the desktop shows the keys.
//
// The mode is read live, each time something is drawn: the touch layer can show and hide
// while the game runs (a real key hides it, a touch brings it back), and a hint drawn after
// that must follow. main.ts calls `setTouchHints` from the layer's visibility callback.

let touch = false;

export function setTouchHints(on: boolean): void {
  touch = on;
}

export function touchHints(): boolean {
  return touch;
}

// The desktop key names the game uses in hints, as written in the hint text.
export type HintKey = "E" | "ESC" | "ENTER" | "L" | "UP DOWN" | "ARROWS" | "TAB";

// What each one is on the touch layer. A key missing here has no touch name: if a hint uses
// one, the desktop key stays in the text (the list is in the issue's log).
const TOUCH_NAME: Record<HintKey, string> = {
  E: "A",
  ESC: "B",
  // The key screen's A sends Enter while the game wants text, so Enter is A there.
  ENTER: "A",
  L: "PAUSE",
  "UP DOWN": "PAD",
  ARROWS: "PAD",
  TAB: "CHOICE",
};

// The label for a desktop key under the current controls. The text is returned unchanged on
// the desktop and for a key with no touch name.
export function keyLabel(key: string): string {
  if (!touch) return key;
  return TOUCH_NAME[key.toUpperCase() as HintKey] ?? key;
}

// One part of a hint line: a key, and what it does. `touch` overrides the key on the touch
// layer: a string is shown in its place, `null` drops the part (the action has its own
// tappable button there), and leaving it out uses `keyLabel`.
export interface HintPart {
  key: string;
  text: string;
  touch?: string | null;
}

// A hint line: "E: PUT UP   ESC: BACK" on the desktop, "A: PUT UP   B: BACK" on touch.
export function hintLine(parts: readonly HintPart[], gap = "   "): string {
  return parts
    .map((p) => {
      if (!touch) return `${p.key}: ${p.text}`;
      if (p.touch === null) return null;
      return `${p.touch ?? keyLabel(p.key)}: ${p.text}`;
    })
    .filter((s): s is string => s !== null)
    .join(gap);
}

// "ESC TO STOP" on the desktop, "B TO STOP" on touch.
export function stopHintText(): string {
  return `${keyLabel("ESC")} TO STOP`;
}
