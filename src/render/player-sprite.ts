import { PLAYER_ANIM } from "../game/config";

// What the frame depends on, so it can be chosen without a Player or a canvas.
export interface PoseState {
  grounded: boolean;
  vx: number;
  vy: number;
  busy: boolean;
}

export type PlayerFrame =
  | "player-idle"
  | "player-jump"
  | "player-fall"
  | "player-task"
  | `player-walk-${1 | 2 | 3 | 4}`;

export const PLAYER_FRAMES: PlayerFrame[] = [
  "player-idle",
  "player-jump",
  "player-fall",
  "player-task",
  "player-walk-1",
  "player-walk-2",
  "player-walk-3",
  "player-walk-4",
];

// Task beats everything (the player is locked in place), then the air, then
// walking, then standing. `walked` is the distance covered on the ground, which
// drives the walk cycle so the feet keep up with the speed.
export function playerFrame(state: PoseState, walked: number): PlayerFrame {
  if (state.busy) return "player-task";
  if (!state.grounded) return state.vy < 0 ? "player-jump" : "player-fall";
  if (Math.abs(state.vx) < PLAYER_ANIM.walkMinSpeed) return "player-idle";
  const step = Math.floor(walked / PLAYER_ANIM.walkFrameDistance);
  const n = (((step % PLAYER_ANIM.walkFrames) + PLAYER_ANIM.walkFrames) % PLAYER_ANIM.walkFrames) + 1;
  return `player-walk-${n}` as PlayerFrame;
}

// Tracks how far the player has walked, for the walk cycle.
export class PlayerAnimator {
  private walked = 0;

  update(dt: number, state: PoseState): void {
    if (state.grounded && !state.busy && Math.abs(state.vx) >= PLAYER_ANIM.walkMinSpeed) {
      this.walked += Math.abs(state.vx) * dt;
    } else if (state.grounded) {
      // Start the next walk from the first frame.
      this.walked = 0;
    }
  }

  frame(state: PoseState): PlayerFrame {
    return playerFrame(state, this.walked);
  }
}
