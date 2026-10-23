import { DECOR_DATA, itemSprites } from "../game/decor-data";
import type { Level } from "../game/level";
import { TASKS } from "../game/tasks";
import { GOOD_HOUR_ICON } from "./world-ui";
import { HELD_SPRITES, OUTFIT_SPRITES, PLAYER_SPRITES, POSE_SPRITES } from "./player-sprite";

// Every sprite the game can ask for in these rooms: floors, wall and doorway
// tiles, pieces, every look of an object that changes, the player in every outfit, the doing poses and the held items. Used to
// load them before the first frame and to check that each one has a file.
export function spriteNames(rooms: Iterable<Level>): string[] {
  const names = new Set<string>([...PLAYER_SPRITES, ...OUTFIT_SPRITES, ...POSE_SPRITES, ...HELD_SPRITES, GOOD_HOUR_ICON]);
  for (const level of rooms) {
    if (level.floor) names.add(level.floor.sprite);
    for (const wall of level.walls ?? []) {
      names.add(wall.sprite);
      if (wall.doorSprite) names.add(wall.doorSprite);
    }
    for (const piece of level.pieces) if (piece.sprite) names.add(piece.sprite);
    for (const { variants } of level.appearances ?? []) for (const v of variants) names.add(v.sprite);
    for (const prop of level.props ?? []) {
      if (prop.sprite) names.add(prop.sprite);
      for (const v of prop.variants ?? []) names.add(v.sprite);
    }
  }
  // Every look of every decor item, placed or not (issue 062).
  for (const item of DECOR_DATA.items) for (const name of itemSprites(item, DECOR_DATA.families)) names.add(name);
  // Full-screen pictures a task's cutscene shows (`view` steps).
  for (const task of TASKS) {
    const spec = task.activity;
    if (spec?.type !== "cutscene" || !Array.isArray(spec.steps)) continue;
    for (const step of spec.steps) if (step && typeof (step as { view?: unknown }).view === "string") names.add((step as { view: string }).view);
  }
  return [...names].sort();
}
