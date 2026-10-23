import { PLAYER, TILE } from "./config";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { PIECES, ROOM, SOLIDS, SPAWN } from "./room";
import { TASKS, type Task } from "./tasks";
import type { Solid } from "./world";

// Builds the playable level from the floor plan in room.ts and tasks.ts. Those
// files are written in tiles (1 tile = 1 ft) measured up from the floor; the
// engine works in pixels with y growing downward. All conversion lives here.

const px = (tiles: number) => tiles * TILE;

// A task's zone is a rectangle the player's body must overlap. The data gives
// the range of heights the player's feet can be at, so the rectangle runs from
// a body-height above the highest feet position down to the lowest.
export function taskToInteractable(task: Task, floorY: number = ROOM.floorY): Interactable {
  const feetTop = px(floorY - task.zone.feetTo);
  const feetBottom = px(floorY - task.zone.feetFrom);
  return {
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    duration: task.duration,
    points: task.points,
    flavor: task.flavor,
    zone: {
      x: px(task.zone.x),
      y: feetTop - PLAYER.height,
      w: px(task.zone.w),
      h: feetBottom - feetTop + PLAYER.height,
    },
  };
}

// Furniture collision plus the floor, ceiling and end walls of the apartment.
// The walls and floor are one tile thick and sit just outside the room.
export function buildSolids(): Solid[] {
  const width = px(ROOM.width);
  const floor = px(ROOM.floorY);
  const ceiling = px(ROOM.ceilingY);

  const shell: Solid[] = [
    { x: 0, y: floor, w: width, h: TILE },
    { x: 0, y: ceiling - TILE, w: width, h: TILE },
    { x: -TILE, y: 0, w: TILE, h: floor + TILE },
    { x: width, y: 0, w: TILE, h: floor + TILE },
  ];

  const furniture: Solid[] = SOLIDS.map((s) => ({
    x: px(s.x),
    y: px(s.y),
    w: px(s.w),
    h: px(s.h),
    oneWay: s.oneWay,
  }));

  return [...shell, ...furniture];
}

// The spawn in room.ts gives the left edge and the height the feet stand at.
export function buildSpawn(): { x: number; y: number } {
  return { x: px(SPAWN.x), y: px(SPAWN.y) - PLAYER.height };
}

export function buildApartmentLevel(): Level {
  return {
    size: { width: px(ROOM.width), height: px(ROOM.height) },
    solids: buildSolids(),
    interactables: TASKS.map((t) => taskToInteractable(t)),
    spawn: buildSpawn(),
  };
}

export const APARTMENT_LEVEL: Level = buildApartmentLevel();

// Every piece id that has a task, for tests and tools.
export const PIECE_IDS = PIECES.map((p) => p.id);
