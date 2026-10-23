export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

// One tile in each direction, as a change in column and row.
export const DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};
