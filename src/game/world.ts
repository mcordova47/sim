export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A rectangle the player cannot walk into. `color` is only used to draw the
// placeholder rectangles until there is art.
export interface Solid extends Rect {
  color?: string;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
