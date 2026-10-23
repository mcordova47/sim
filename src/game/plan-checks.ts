// Checks over a set of rooms that no one should have to do by eye: where each
// task can be done from, whether the player can walk to it, and whether the
// doorways pair up. Used by the floor plan tests; usable by any tool that
// edits the plan.

import { TILE } from "./config";
import { DELTA, DIRECTIONS, type Direction } from "./direction";
import { Grid } from "./grid";
import type { Level } from "./level";

export interface Tile {
  col: number;
  row: number;
}

// Where a task can be done from: stand on `stand` and face `face`, which looks
// at the tile `target` of the object.
export interface Spot {
  id: string;
  stand: Tile;
  face: Direction;
  target: Tile;
}

// Every spot for every task in a room: each walkable tile next to a tile of
// the object, with the direction to face it. A task whose object is on more
// than one wall, or in more than one place, simply has more spots.
export function taskSpots(level: Level): Spot[] {
  const grid = new Grid(level.size, level.solids);
  const spots: Spot[] = [];
  for (const item of level.interactables) {
    for (const zone of item.zones) {
      const target = { col: zone.x / TILE, row: zone.y / TILE };
      for (const face of DIRECTIONS) {
        const stand = { col: target.col - DELTA[face].dc, row: target.row - DELTA[face].dr };
        if (!grid.isBlocked(stand.col, stand.row)) spots.push({ id: item.id, stand, face, target });
      }
    }
  }
  return spots;
}

export interface Place extends Tile {
  room: string;
}

const key = (p: Place) => `${p.room},${p.col},${p.row}`;

// Every place the player can walk to from `from`, going through doorways. The
// player is carried to the arrival tile of the other room when they step onto
// a door, so the door tile itself is reached but not stood on.
export function reachablePlaces(rooms: Record<string, Level>, from: Place): Map<string, Place> {
  const grids = new Map(Object.entries(rooms).map(([id, l]) => [id, new Grid(l.size, l.solids)]));
  const seen = new Map<string, Place>([[key(from), from]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.pop()!;
    for (const dir of DIRECTIONS) {
      let next: Place = { room: here.room, col: here.col + DELTA[dir].dc, row: here.row + DELTA[dir].dr };
      if (grids.get(next.room)!.isBlocked(next.col, next.row)) continue;
      const door = rooms[next.room].doors.find((d) => d.col === next.col && d.row === next.row);
      if (door) {
        // Note the doorway as reached, then carry on from the other side.
        seen.set(key(next), next);
        next = { room: door.to, col: door.arrive.col, row: door.arrive.row };
      }
      if (!seen.has(key(next))) {
        seen.set(key(next), next);
        queue.push(next);
      }
    }
  }
  return seen;
}

// Problems with how a set of rooms are joined, as readable lines. Empty when
// every doorway pairs up with one back, arrives on open floor next to that
// doorway and faces away from it.
export function doorProblems(rooms: Record<string, Level>): string[] {
  const problems: string[] = [];
  for (const [id, room] of Object.entries(rooms)) {
    const grid = new Grid(room.size, room.solids);
    for (const door of room.doors) {
      const at = `${id} door (col ${door.col}, row ${door.row}) to ${door.to}`;
      const other = rooms[door.to];
      if (!other) {
        problems.push(`${at}: there is no room "${door.to}"`);
        continue;
      }
      const { arrive } = door;
      const otherGrid = new Grid(other.size, other.solids);
      if (otherGrid.isBlocked(arrive.col, arrive.row)) {
        problems.push(`${at}: arrives on a blocked tile (col ${arrive.col}, row ${arrive.row})`);
        continue;
      }
      // The matching doorway is the one in the other room that touches the arrival tile.
      const back = other.doors.filter(
        (d) => Math.abs(d.col - arrive.col) + Math.abs(d.row - arrive.row) === 1,
      );
      if (back.length !== 1) {
        problems.push(`${at}: arrives next to ${back.length} doorways in ${door.to}, expected 1`);
        continue;
      }
      const [pair] = back;
      if (pair.to !== id) problems.push(`${at}: its doorway in ${door.to} leads to ${pair.to}, not ${id}`);
      const away = DIRECTIONS.find(
        (d) => pair.col + DELTA[d].dc === arrive.col && pair.row + DELTA[d].dr === arrive.row,
      );
      if (arrive.facing !== away) {
        problems.push(`${at}: arrives facing ${arrive.facing}, expected ${away} (away from the doorway)`);
      }
      // And the way back must land on the tile just inside this doorway.
      const home = pair.arrive;
      if (Math.abs(home.col - door.col) + Math.abs(home.row - door.row) !== 1 || grid.isBlocked(home.col, home.row)) {
        problems.push(`${at}: the doorway back arrives at (col ${home.col}, row ${home.row}), not on open floor next to this one`);
      }
    }
  }
  return problems;
}
