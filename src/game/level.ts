import type { COLOR } from "../render/colors";
import { TILE } from "./config";
import type { Direction } from "./direction";
import { validateActivity, type ValidationContext } from "./activity";
// Registers the built-in activities, so their settings can be checked here.
import "./activities";
import { Grid } from "./grid";
import type { Appearance, Variant } from "./appearance";
import type { Interactable } from "./interactable";
import type { Check } from "./state";
import { STATE_VARS } from "./state-vars";
import type { WallKind } from "./wall-tiles";
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
  // Placeholder colour (a palette name), for when the sprite is missing.
  color?: keyof typeof COLOR;
}

// Something that sits on top of a piece and can be swapped for something else
// without touching the piece (issue 063): the plant on the bookshelf. It has
// no tiles of its own, blocks nothing and offers no tasks. `slot` names the
// place, so a decor system (issue 062) can later put another item in it; the
// look is picked from `variants` each frame, like any object that changes.
export interface Prop {
  name: string;
  slot: string;
  // The sprite's top-left, in pixels, and its size.
  area: Rect;
  // The piece it sits on; it is drawn in front of it, and with it for depth.
  on: Piece;
  // Used when no variant applies.
  sprite?: string;
  variants?: Variant[];
  color?: keyof typeof COLOR;
}

// One tile of wall to draw: which sprite, and the doorway sprite over it when
// the tile is a door. Worked out by `wallKind` (see wall-tiles.ts).
export interface WallTile {
  col: number;
  row: number;
  kind: WallKind;
  sprite: string;
  doorSprite?: string;
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
  // Swappable things on top of the furniture (the plant on the bookshelf).
  props?: Prop[];
  // How to draw the room's floor and walls with the tileset. Rooms without it
  // are drawn as plain rectangles.
  floor?: { sprite: string; tiles: { col: number; row: number }[] };
  walls?: WallTile[];
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
// type with sane settings, or a state variable name that does not exist
// (`context.hasState` says which do; without a context it is the real list in
// state-vars.ts).
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
  validateStateNames(level, context ? (id) => context.hasState(id) : defaultKnownVars);
  for (const door of level.doors) {
    if (grid.isBlocked(door.col, door.row)) {
      throw new Error(`${name}: the door at col ${door.col}, row ${door.row} is blocked`);
    }
  }
}

const DEFAULT_IDS = new Set(STATE_VARS.map((v) => v.id));
const defaultKnownVars = (id: string) => DEFAULT_IDS.has(id);

// Throws, naming the room and the task or object, if anything in the level
// refers to a state variable that does not exist: a task's `requires`,
// `effects` and `pointsBonus`, a cutscene's `set` steps, a variant's `when`
// and a solid's `blockedWhen`. This is what catches a typo when the level is
// built, not when the variable is first read.
export function validateStateNames(level: Level, known: (id: string) => boolean): void {
  const name = level.id ?? "level";
  const bad: string[] = [];
  const check = (where: string, id: string) => {
    if (!known(id)) bad.push(`${where} uses the unknown state variable "${id}"`);
  };
  const checks = (where: string, list: Check[] | undefined) => list?.forEach((c) => check(where, c.var));
  for (const item of level.interactables) {
    const task = `task "${item.id}"`;
    for (const r of item.requires ?? []) checks(`${task} requires`, "anyOf" in r ? r.anyOf : [r]);
    for (const e of item.effects ?? []) check(`${task} effects`, e.var);
    if (item.pointsBonus) check(`${task} pointsBonus`, item.pointsBonus.var);
    const steps = (item.activity as { type?: string; steps?: unknown } | undefined)?.steps;
    if (item.activity?.type === "cutscene" && Array.isArray(steps)) {
      for (const step of steps as { set?: { var?: unknown } }[]) {
        if (typeof step?.set?.var === "string") check(`${task} cutscene`, step.set.var);
      }
    }
  }
  for (const { variants } of level.appearances ?? []) {
    for (const v of variants) checks(`variant "${v.sprite}"`, v.when);
  }
  for (const prop of level.props ?? []) {
    for (const v of prop.variants ?? []) checks(`prop "${prop.slot}" variant "${v.sprite}"`, v.when);
  }
  for (const s of level.solids) checks(`a solid at x ${s.x}, y ${s.y} blockedWhen`, s.blockedWhen);
  if (bad.length) throw new Error(`${name}: ${bad.join("; ")}`);
}
