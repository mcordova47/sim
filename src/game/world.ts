export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A rectangle the player collides with. One-way solids only stop the player
// when landing from above, so they can be jumped up through.
export interface Solid extends Rect {
  oneWay?: boolean;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
