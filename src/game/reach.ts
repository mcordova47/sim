// Reachability check for the floor plan. Pure functions: pass in the room data
// and the player's jump limits from the physics config (issue 002).

import type { Piece, Solid } from './room';
import type { Task } from './tasks';

export type Limits = {
  // Highest ledge the player can jump up onto from a standing start, in tiles.
  maxRise: number;
  // Widest horizontal gap the player can cross while jumping, in tiles.
  maxGap: number;
  // Player height in tiles, for ceiling clearance and walking under one-way slabs.
  playerHeight: number;
};

type Surface = { id: string; x: number; w: number; height: number };

// Open stretches of bare floor. Solid pieces block it, and so do one-way slabs
// that sit too low for the player to walk under.
function floorSegments(width: number, floorY: number, solids: Solid[], playerHeight: number): Surface[] {
  const blocking = solids
    .filter((s) => !s.oneWay || floorY - s.y < playerHeight)
    .map((s) => ({ x: s.x, end: s.x + s.w }))
    .sort((a, b) => a.x - b.x);
  const segs: Surface[] = [];
  let cursor = 0;
  for (const b of blocking) {
    if (b.x > cursor) segs.push({ id: `floor@${cursor}`, x: cursor, w: b.x - cursor, height: 0 });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < width) segs.push({ id: `floor@${cursor}`, x: cursor, w: width - cursor, height: 0 });
  return segs;
}

function surfaces(width: number, floorY: number, solids: Solid[], playerHeight: number): Surface[] {
  return [
    ...floorSegments(width, floorY, solids, playerHeight),
    ...solids.map((s) => ({ id: s.id, x: s.x, w: s.w, height: floorY - s.y })),
  ];
}

const gap = (a: Surface, b: Surface) => Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));

function reachable(all: Surface[], start: Surface, limits: Limits): Set<Surface> {
  const seen = new Set<Surface>([start]);
  const queue = [start];
  while (queue.length) {
    const a = queue.pop()!;
    for (const b of all) {
      if (seen.has(b) || gap(a, b) > limits.maxGap || b.height - a.height > limits.maxRise) continue;
      seen.add(b);
      queue.push(b);
    }
  }
  return seen;
}

export type Report = {
  unreachablePieces: string[];
  unreachableTasks: string[];
  noHeadroom: string[];
};

export function check(
  room: { width: number; floorY: number; ceilingY: number },
  solids: Solid[],
  pieces: Piece[],
  tasks: Task[],
  spawn: { x: number; y: number },
  limits: Limits,
): Report {
  const all = surfaces(room.width, room.floorY, solids, limits.playerHeight);
  const spawnHeight = room.floorY - spawn.y;
  const start = all.find((s) => s.x <= spawn.x && spawn.x < s.x + s.w && s.height === spawnHeight);
  if (!start) throw new Error('spawn is not on a surface');
  const ok = reachable(all, start, limits);

  // A task is doable if the player can stand on a reachable surface under its
  // zone at the right height. A range (like the wall guitar) also allows a
  // jump from a lower surface.
  const taskReachable = (t: Task) =>
    [...ok].some(
      (s) =>
        s.x < t.zone.x + t.zone.w &&
        t.zone.x < s.x + s.w &&
        s.height <= t.zone.feetTo &&
        s.height + (t.zone.feetFrom === t.zone.feetTo ? 0 : limits.maxRise) >= t.zone.feetFrom,
    );

  const ceiling = room.floorY - room.ceilingY;
  return {
    unreachablePieces: pieces.filter((p) => !all.some((s) => s.id === p.id && ok.has(s))).map((p) => p.id),
    unreachableTasks: tasks.filter((t) => !taskReachable(t)).map((t) => t.id),
    noHeadroom: solids.filter((s) => room.floorY - s.y + limits.playerHeight > ceiling).map((s) => s.id),
  };
}
