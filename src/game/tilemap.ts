import { COLOR } from "../render/colors";
import { TILE } from "./config";
import type { Appearance, Variant } from "./appearance";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import type { Rect, Solid } from "./world";

// Builds a level from a picture drawn in text, one character per tile:
//
//   #  wall          .  floor          @  where the player starts
//   any other character is looked up in the legend you pass in.
//
// The legend says what an object is: solid or not, a placeholder colour, and
// optionally a task. All the tiles with the same letter are one object, so
// give each separate object its own letter. The zone for its task is the
// rectangle around those tiles, used by standing next to it and facing it.
export interface ObjectDef {
  // Walkable if false. Defaults to true.
  solid?: boolean;
  // Placeholder colour (a name from the palette) until there is art.
  color?: keyof typeof COLOR;
  task?: Omit<Interactable, "zone">;
  // Several tasks on one object (the first that can be done is offered).
  tasks?: Omit<Interactable, "zone">[];
  // Ways the object looks depending on state; see appearance.ts. The object is
  // drawn from these instead of from `color`.
  variants?: Variant[];
  // Only blocks while all of these hold (see Solid.blockedWhen).
  blockedWhen?: Solid["blockedWhen"];
}

export function parseTileMap(rows: string[], legend: Record<string, ObjectDef>): Level {
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) throw new Error("The map is empty");

  const solids: Solid[] = [];
  const tilesByChar = new Map<string, { col: number; row: number }[]>();
  let spawn: { x: number; y: number } | null = null;

  rows.forEach((line, row) => {
    if (line.length !== cols) {
      throw new Error(`Row ${row} is ${line.length} tiles wide, expected ${cols}`);
    }
    [...line].forEach((ch, col) => {
      const rect = { x: col * TILE, y: row * TILE, w: TILE, h: TILE };
      if (ch === ".") return;
      if (ch === "#") {
        solids.push({ ...rect, color: COLOR.dusk });
        return;
      }
      if (ch === "@") {
        if (spawn) throw new Error(`More than one start (@), second at row ${row}, col ${col}`);
        spawn = { x: rect.x, y: rect.y };
        return;
      }
      const def = legend[ch];
      if (!def) throw new Error(`Unknown character "${ch}" at row ${row}, col ${col}`);
      const tiles = tilesByChar.get(ch) ?? [];
      tiles.push({ col, row });
      tilesByChar.set(ch, tiles);
      if (def.solid !== false) {
        solids.push({
          ...rect,
          color: def.color ? COLOR[def.color] : COLOR.mist,
          ...(def.blockedWhen && { blockedWhen: def.blockedWhen }),
          ...(def.variants && { hidden: true }),
        });
      }
    });
  });
  if (!spawn) throw new Error("The map has no start (@)");

  const interactables: Interactable[] = [];
  const appearances: Appearance[] = [];
  for (const [ch, tiles] of tilesByChar) {
    if (!isOneObject(tiles)) {
      throw new Error(`The tiles for "${ch}" are not all touching; give each object its own letter`);
    }
    const def = legend[ch];
    const zone = boundingRect(tiles);
    for (const task of [...(def.task ? [def.task] : []), ...(def.tasks ?? [])]) {
      interactables.push({ ...task, zone });
    }
    if (def.variants) appearances.push({ area: zone, variants: def.variants });
  }

  return {
    size: { width: cols * TILE, height: rows.length * TILE },
    solids,
    interactables,
    appearances,
    spawn,
  };
}

function boundingRect(tiles: { col: number; row: number }[]): Rect {
  const cols = tiles.map((t) => t.col);
  const rows = tiles.map((t) => t.row);
  const x = Math.min(...cols);
  const y = Math.min(...rows);
  return {
    x: x * TILE,
    y: y * TILE,
    w: (Math.max(...cols) - x + 1) * TILE,
    h: (Math.max(...rows) - y + 1) * TILE,
  };
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
