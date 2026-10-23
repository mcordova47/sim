import type { Direction } from "../game/direction";
import { DIRECTIONS } from "../game/direction";

// Which sprite the player is drawn with, and whether to mirror it.
export interface PlayerFrame {
  name: string;
  flip: boolean;
}

// Every file the player can be drawn from while walking about: idle and the
// two walk frames, in each direction.
export const PLAYER_SPRITES: string[] = DIRECTIONS.flatMap((dir) => [
  `player-idle-${dir}`,
  `player-walk-${dir}-1`,
  `player-walk-${dir}-2`,
]);

// Standing still is `player-idle-<dir>`. While a step is under way the walk
// frame is shown, and which foot alternates every step, so the cycle goes
// idle, 1, idle, 2 as you tap and 1, 2, 1, 2 as you hold a direction.
// `has` says which files exist: if a left-facing frame isn't drawn, the right
// one is mirrored instead.
export function playerFrame(
  facing: Direction,
  stepping: boolean,
  stepsTaken: number,
  has: (name: string) => boolean = () => true,
): PlayerFrame {
  const foot = stepsTaken % 2 === 0 ? 1 : 2;
  const base = (dir: Direction) => (stepping ? `player-walk-${dir}-${foot}` : `player-idle-${dir}`);
  if (facing === "left" && !has(base("left")) && has(base("right"))) {
    return { name: base("right"), flip: true };
  }
  return { name: base(facing), flip: false };
}
