import type { Direction } from "../game/direction";
import { DIRECTIONS } from "../game/direction";
import { HELD_ITEMS, POSES, heldSprite } from "../game/poses";
import { HOME_PREFIX, OUTFITS } from "../game/outfits";

// Which sprite the player is drawn with, and whether to mirror it.
export interface PlayerFrame {
  name: string;
  flip: boolean;
}

// Every file the player can be drawn from while walking about: idle and the
// two walk frames, in each direction.
const framesFor = (prefix: string): string[] =>
  DIRECTIONS.flatMap((dir) => [`${prefix}-idle-${dir}`, `${prefix}-walk-${dir}-1`, `${prefix}-walk-${dir}-2`]);

export const PLAYER_SPRITES: string[] = framesFor(HOME_PREFIX);

// Everything the player can be drawn from besides the walking frames of the
// everyday clothes: the other outfits, the doing poses and the held items.
export const OUTFIT_SPRITES: string[] = OUTFITS.slice(1).flatMap((o) => framesFor(o.prefix));
export const POSE_SPRITES: string[] = Object.values(POSES).map((p) => p.sprite);
export const HELD_SPRITES: string[] = HELD_ITEMS.flatMap((item) =>
  DIRECTIONS.map((dir) => heldSprite(item, dir)),
);

// Standing still is `player-idle-<dir>`. While a step is under way the walk
// frame is shown, and which foot alternates every step, so the cycle goes
// idle, 1, idle, 2 as you tap and 1, 2, 1, 2 as you hold a direction.
// `has` says which files exist: if a left-facing frame isn't drawn, the right
// one is mirrored instead. `prefix` picks the outfit (see outfits.ts); if that
// outfit has no art for this frame, the everyday clothes are drawn instead.
export function playerFrame(
  facing: Direction,
  stepping: boolean,
  stepsTaken: number,
  has: (name: string) => boolean = () => true,
  prefix: string = HOME_PREFIX,
): PlayerFrame {
  const foot = stepsTaken % 2 === 0 ? 1 : 2;
  const base = (dir: Direction, p: string) =>
    stepping ? `${p}-walk-${dir}-${foot}` : `${p}-idle-${dir}`;
  const pick = (p: string): PlayerFrame | null => {
    if (facing === "left" && !has(base("left", p)) && has(base("right", p))) {
      return { name: base("right", p), flip: true };
    }
    return has(base(facing, p)) ? { name: base(facing, p), flip: false } : null;
  };
  if (prefix !== HOME_PREFIX) {
    const frame = pick(prefix);
    if (frame) return frame;
  }
  return pick(HOME_PREFIX) ?? { name: base(facing, HOME_PREFIX), flip: false };
}
