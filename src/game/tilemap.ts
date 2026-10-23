import { COLOR } from "../render/colors";
import { TILE } from "./config";
import type { Direction } from "./direction";
import type { Interactable } from "./interactable";
import { pieceBounds, validateLevel, type Door, type Level, type Piece } from "./level";
import type { Solid } from "./world";

// Builds a level from a picture drawn in text, one character per tile:
//
//   #  wall          .  floor          @  where the player starts
//   any other character is looked up in the legend you pass in.
//
// The legend says what an object is: solid or not, a placeholder colour, a
// sprite name, and which tasks it offers. All the tiles with the same letter
// are one object, so give each separate object its own letter. Its tasks are
// used by standing next to one of its tiles and facing it, and only its own
// tiles count, so an L-shaped counter has no usable gap in its corner.
//
// Objects can sit in the wall too (a window), and a legend entry with `door`
// is a doorway: one walkable tile that leads to another room.
export interface ObjectDef {
  // What it is, for the piece list. Defaults to the legend letter.
  name?: string;
  // Walkable if false. Defaults to true; a door is never solid.
  solid?: boolean;
  // Placeholder colour (a name from the palette) until there is art.
  color?: keyof typeof COLOR;
  // Sprite name from the art style guide.
  sprite?: string;
  // Ids from the task list. Each becomes a task at this object.
  tasks?: string[];
  // Makes the tile a doorway to another room.
  door?: Omit<Door, "col" | "row">;
}

export interface MapOptions {
  // The tasks the legend's ids refer to.
  tasks?: readonly Omit<Interactable, "zones">[];
  // The room's name, for doorways and error messages.
  id?: string;
  // Which way the player faces at the start. Defaults to down.
  facing?: Direction;
}

const RESERVED = ["#", ".", "@"];

export function parseTileMap(
  input: string[],
  legend: Record<string, ObjectDef>,
  options: MapOptions = {},
): Level {
  const where = options.id ? `${options.id}: ` : "";
  // Lines may come with Windows line endings.
  const rows = input.map((line) => {
    if (typeof line !== "string") throw new Error(`${where}Every row of the map must be text`);
    return line.replace(/\r$/, "");
  });
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) throw new Error(`${where}The map is empty`);

  const tasksById = new Map((options.tasks ?? []).map((t) => [t.id, t]));
  for (const [ch, def] of Object.entries(legend)) {
    if ([...ch].length !== 1) throw new Error(`${where}Legend key "${ch}" must be one character`);
    if (RESERVED.includes(ch)) {
      throw new Error(`${where}Legend key "${ch}" is built in (# wall, . floor, @ start)`);
    }
    if (def.color && !(def.color in COLOR)) {
      throw new Error(`${where}Legend "${ch}" has an unknown colour "${def.color}"`);
    }
    if (def.door && def.solid) throw new Error(`${where}Legend "${ch}" is a door, so it can't be solid`);
    for (const id of def.tasks ?? []) {
      if (!tasksById.has(id)) throw new Error(`${where}Legend "${ch}" names an unknown task "${id}"`);
    }
  }

  const solids: Solid[] = [];
  const tilesByChar = new Map<string, { col: number; row: number }[]>();
  let spawn: { x: number; y: number } | null = null;

  rows.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`${where}Row ${row} is ${line.length} tiles wide, expected ${cols}`);
    }
    [...line].forEach((ch, col) => {
      const rect = { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
      if (ch === ".") return;
      if (ch === "#") {
        solids.push({ ...rect, color: COLOR.dusk });
        return;
      }
      if (ch === "@") {
        if (spawn) {
          throw new Error(`${where}More than one start (@), second at row ${row}, col ${col}`);
        }
        spawn = { x: rect.x, y: rect.y };
        return;
      }
      const def = legend[ch];
      if (!def) throw new Error(`${where}Unknown character "${ch}" at row ${row}, col ${col}`);
      const tiles = tilesByChar.get(ch) ?? [];
      tiles.push({ col, row });
      tilesByChar.set(ch, tiles);
      if (def.solid !== false && !def.door) {
        solids.push({ ...rect, color: def.color ? COLOR[def.color] : COLOR.mist });
      }
    });
  });
  if (!spawn) throw new Error(`${where}The map has no start (@)`);

  const interactables: Interactable[] = [];
  const doors: Door[] = [];
  const pieces: Piece[] = [];
  for (const [ch, tiles] of tilesByChar) {
    const def = legend[ch];
    if (!isOneObject(tiles)) {
      throw new Error(`${where}The tiles for "${ch}" are not all touching; give each object its own letter`);
    }
    if (def.door) {
      if (tiles.length !== 1) {
        throw new Error(`${where}Door "${ch}" must be one tile, not ${tiles.length}`);
      }
      doors.push({ ...def.door, col: tiles[0].col, row: tiles[0].row });
      continue;
    }
    pieces.push({ name: def.name ?? ch, sprite: def.sprite, tiles, bounds: pieceBounds(tiles) });
    const zones = tiles.map((t) => ({ x: t.col * TILE, y: t.row * TILE, w: TILE, h: TILE }));
    for (const id of def.tasks ?? []) interactables.push({ ...tasksById.get(id)!, zones });
  }

  const level: Level = {
    id: options.id,
    size: { width: cols * TILE, height: rows.length * TILE },
    solids,
    interactables,
    doors,
    pieces,
    spawn,
    facing: options.facing,
  };
  validateLevel(level);
  return level;
}

// True if every tile can be reached from the first by stepping over neighbours.
function isOneObject(tiles: { col: number; row: number }[]): boolean {
  const key = (t: { col: number; row: number }) => `${t.col},${t.row}`;
  const all = new Set(tiles.map(key));
  const seen = new Set<string>([key(tiles[0])]);
  const queue = [tiles[0]];
  while (queue.length) {
    const { col, row } = queue.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { col: col + dc, row: row + dr };
      if (all.has(key(next)) && !seen.has(key(next))) {
        seen.add(key(next));
        queue.push(next);
      }
    }
  }
  return seen.size === all.size;
}
