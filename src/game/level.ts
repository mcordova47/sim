import { TILE } from "./config";
import type { Direction } from "./direction";
import { validateActivity, type ValidationContext } from "./activity";
// Registers the built-in activities, so their settings can be checked here.
import "./activities";
import { Grid } from "./grid";
import type { Appearance } from "./appearance";
import type { Interactable } from "./interactable";
import { boundsOf, type Rect, type Solid } from "./world";

// A doorway. It is a walkable tile; stepping onto it takes the player to the
// tile `arrive` in the room `to`, facing `facing`. The arrival tile is next to
// the matching doorway in that room, never the doorway itself.
export interface Door {
  col: number;
  row: number;
  to: string;
  arrive: { col: number; row: number; facing: Direction };
}

// One piece of furniture or fixture, for drawing it with a sprite later. The
// sprite is drawn over `bounds`; `tiles` is what it really covers (an L-shaped
// counter has empty tiles inside its bounds).
export interface Piece {
  name: string;
  // Sprite name from the art style guide (docs/art-style.md), when it has one.
  sprite?: string;
  tiles: { col: number; row: number }[];
  bounds: Rect;
}

// Everything the game needs to know about the room it runs in.
export interface Level {
  // Names the room, so doorways in other rooms can lead here.
  id?: string;
  // Size of the room in pixels (a whole number of tiles). May be larger than the view.
  size: { width: number; height: number };
  // Walls and furniture. The player cannot walk into them.
  solids: Solid[];
  // Things the player can use. Each task's `zones` are the tiles of its
  // object; it is used by standing next to one of them and facing it.
  interactables: Interactable[];
  // Objects that look different depending on state (a made or unmade bed).
  appearances?: Appearance[];
  // Doorways to other rooms.
  doors: Door[];
  // The furniture, for sprites.
  pieces: Piece[];
  // Top-left of the tile the player starts on, in pixels. Must not be blocked.
  spawn: { x: number; y: number };
  facing?: Direction;
}

export function pieceBounds(tiles: { col: number; row: number }[]): Rect {
  return boundsOf(tiles.map((t) => ({ x: t.col * TILE, y: t.row * TILE, w: TILE, h: TILE })));
}

// Throws if the level could not be played: a size that is not whole tiles, a
// start that is off the map, in a wall or off the tile grid, or a doorway that
// is not a walkable tile of the room, or a task whose `activity` is not a known
// type with sane settings.
export function validateLevel(level: Level, context?: ValidationContext): void {
  const { width, height } = level.size;
  const name = level.id ?? "level";
  if (!(width > 0 && height > 0) || width % TILE !== 0 || height % TILE !== 0) {
    throw new Error(`${name}: size ${width}x${height} is not a whole number of ${TILE}px tiles`);
  }
  const grid = new Grid(level.size, level.solids);
  const { x, y } = level.spawn;
  if (x % TILE !== 0 || y % TILE !== 0) throw new Error(`${name}: the start is not on a tile`);
  if (grid.isBlocked(x / TILE, y / TILE)) {
    throw new Error(`${name}: the start (col ${x / TILE}, row ${y / TILE}) is not open floor`);
  }
  for (const item of level.interactables) validateActivity(item, context);
  for (const door of level.doors) {
    if (grid.isBlocked(door.col, door.row)) {
      throw new Error(`${name}: the door at col ${door.col}, row ${door.row} is blocked`);
    }
  }
}
