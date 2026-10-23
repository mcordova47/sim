// Which wall tile to draw under every wall-line character of a room map. The
// rules are written up in docs/floor-plan.md ("Wall tiles"); issue 031 draws
// with this function rather than redoing them.

export type WallKind = "back" | "front" | "left" | "right";

// The tile name for a kind of wall in a room. The main room uses the base
// names (plaster); the kitchen (drywall) and bath (tile) have their own set of
// all four kinds, as do doorways.
export function wallTileName(kind: WallKind, room: string): string {
  const suffix = room === "kitchen" || room === "bath" ? `-${room}` : "";
  if (kind === "back" || kind === "front") return `wall-${kind}${suffix}`;
  return `wall-side-${kind}${suffix}`;
}

// The doorway sprite drawn over a door's wall tile. The main room has the one
// `doorway`; the kitchen and bath have left- and right-facing versions.
export function doorwayName(kind: WallKind, room: string): string {
  if ((room !== "kitchen" && room !== "bath") || (kind !== "left" && kind !== "right")) return "doorway";
  return `doorway-${kind}-${room}`;
}

// The kind of wall under tile (col, row), or null when nothing is drawn there
// (a corner or filler: no floor beside it) or when the tile is not in a wall
// line at all. A tile is in a wall line if it is `#` or one of `wallPieces`.
// "Open" is any tile that is not in a wall line (floor, furniture, anything
// else); wall pieces and doors never count as open. First match wins:
// open south -> back, open north -> front, open east -> left, open west -> right.
export function wallKind(map: readonly string[], wallPieces: string, col: number, row: number): WallKind | null {
  const inWall = (ch: string | undefined) => ch === "#" || (ch !== undefined && wallPieces.includes(ch));
  const open = (c: number, r: number) => {
    const ch = map[r]?.[c];
    return ch !== undefined && !inWall(ch);
  };
  if (!inWall(map[row]?.[col])) return null;
  if (open(col, row + 1)) return "back";
  if (open(col, row - 1)) return "front";
  if (open(col + 1, row)) return "left";
  if (open(col - 1, row)) return "right";
  return null;
}
