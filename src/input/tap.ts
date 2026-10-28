// Taps on the picture (issue 093): a finger on the canvas becomes a point in game pixels, and
// the game says which of its on-screen buttons is under it.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A button a screen draws and a tap can press. `run` does what pressing it does. Rectangles are in
// game pixels (the picture the game draws: 320 x 192, or the phone's narrow view).
export interface TapTarget extends Rect {
  run(): void;
}

// Where a pointer at `clientX`, `clientY` is in the picture, given the canvas's rectangle on
// the page (`canvas.getBoundingClientRect()`) and the picture's size in game pixels. Null if it is
// outside the picture.
export function pointToGame(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  view: { width: number; height: number },
): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * view.width;
  const y = ((clientY - rect.top) / rect.height) * view.height;
  if (x < 0 || y < 0 || x >= view.width || y >= view.height) return null;
  return { x, y };
}

// The last target in the list that holds the point (later ones are drawn over earlier ones).
export function targetAt(targets: readonly TapTarget[], x: number, y: number): TapTarget | null {
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) return t;
  }
  return null;
}
