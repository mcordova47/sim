import type { Level } from "../game/level";
import { PLAYER_SPRITES } from "./player-sprite";

// Every sprite the game can ask for in these rooms: floors, wall and doorway
// tiles, pieces, every look of an object that changes, and the player. Used to
// load them before the first frame and to check that each one has a file.
export function spriteNames(rooms: Iterable<Level>): string[] {
  const names = new Set<string>(PLAYER_SPRITES);
  for (const level of rooms) {
    if (level.floor) names.add(level.floor.sprite);
    for (const wall of level.walls ?? []) {
      names.add(wall.sprite);
      if (wall.doorSprite) names.add(wall.doorSprite);
    }
    for (const piece of level.pieces) if (piece.sprite) names.add(piece.sprite);
    for (const { variants } of level.appearances ?? []) for (const v of variants) names.add(v.sprite);
  }
  return [...names].sort();
}
