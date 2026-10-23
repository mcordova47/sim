import type { Controls } from "../input/controls";
import { TILE, WALK } from "./config";
import { DELTA, type Direction } from "./direction";
import type { Grid } from "./grid";
import type { Rect } from "./world";

interface Step {
  toCol: number;
  toRow: number;
  elapsed: number;
  // How long this step takes, fixed when it starts.
  duration: number;
}

export interface TileEvent {
  col: number;
  row: number;
  direction: Direction;
}

// The player, walking tile to tile Pokemon-style. Pressing a direction you are
// not facing turns you first; holding it then steps. A step takes
// `WALK.stepTime` and the position slides smoothly between tiles. There is no
// diagonal movement and no gravity.
export class Player {
  // Top-left in pixels. Between tiles this is part way along a step.
  x: number;
  y: number;
  // Position at the start of the last update, for render interpolation.
  prevX: number;
  prevY: number;
  // The tile the player is on (while stepping, the tile being left).
  col: number;
  row: number;
  facing: Direction;

  readonly w = TILE;
  readonly h = TILE;

  // What happened during the most recent update(), for things that react to it
  // (sound, particles). They are reset at the start of each update. If a long
  // update covers several steps, `arrivedThisUpdate` is the last one.
  arrivedThisUpdate: TileEvent | null = null;
  bumpedThisUpdate: TileEvent | null = null;
  turnedThisUpdate = false;
  // Multiplies how long the next step takes (above 1 is slower), e.g. when tired.
  stepTimeScale = 1;

  private step: Step | null = null;
  // Time left before a fresh turn can become a step.
  private turnTimer = 0;
  // True once a bump has been reported, until the key is let go or changed, so
  // pushing against a wall doesn't report it every frame.
  private bumpReported = false;

  constructor(x: number, y: number, facing: Direction = "down") {
    this.col = Math.round(x / TILE);
    this.row = Math.round(y / TILE);
    this.x = this.prevX = this.col * TILE;
    this.y = this.prevY = this.row * TILE;
    this.facing = facing;
  }

  get stepping(): boolean {
    return this.step !== null;
  }

  // The tile in front of the player, as a rectangle, when they are standing
  // still. Null while walking: you can't use things mid-step.
  get target(): Rect | null {
    if (this.step) return null;
    const { dc, dr } = DELTA[this.facing];
    return { x: (this.col + dc) * TILE, y: (this.row + dr) * TILE, w: TILE, h: TILE };
  }

  update(dt: number, controls: Controls, grid: Grid): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.arrivedThisUpdate = null;
    this.bumpedThisUpdate = null;
    this.turnedThisUpdate = false;

    let time = dt;
    // Loop so a long update can finish one step and carry on into the next.
    while (time > 0) {
      if (this.step) {
        const left = this.step.duration - this.step.elapsed;
        if (time < left) {
          this.step.elapsed += time;
          break;
        }
        time -= left;
        this.arrive();
        continue;
      }

      const dir = controls.dir;
      if (!dir) {
        this.turnTimer = 0;
        this.bumpReported = false;
        break;
      }

      if (dir !== this.facing) {
        this.facing = dir;
        this.turnTimer = WALK.turnTime;
        this.turnedThisUpdate = true;
        this.bumpReported = false;
      }
      if (this.turnTimer > 0) {
        const used = Math.min(time, this.turnTimer);
        this.turnTimer -= used;
        time -= used;
        if (this.turnTimer > 0) break;
      }
      if (!this.startStep(dir, grid)) break;
    }

    this.place();
  }

  // Tries to start a step. Returns false (after reporting a bump, once) if
  // the way is blocked.
  private startStep(dir: Direction, grid: Grid): boolean {
    const { dc, dr } = DELTA[dir];
    const toCol = this.col + dc;
    const toRow = this.row + dr;
    if (grid.isBlocked(toCol, toRow)) {
      if (!this.bumpReported) {
        this.bumpReported = true;
        this.bumpedThisUpdate = { col: toCol, row: toRow, direction: dir };
      }
      return false;
    }
    this.bumpReported = false;
    this.step = { toCol, toRow, elapsed: 0, duration: WALK.stepTime * this.stepTimeScale };
    return true;
  }

  private arrive(): void {
    if (!this.step) return;
    this.col = this.step.toCol;
    this.row = this.step.toRow;
    this.step = null;
    this.arrivedThisUpdate = { col: this.col, row: this.row, direction: this.facing };
  }

  // Sets the pixel position from the tile and how far along a step we are.
  private place(): void {
    const fromX = this.col * TILE;
    const fromY = this.row * TILE;
    if (!this.step) {
      this.x = fromX;
      this.y = fromY;
      return;
    }
    const t = Math.min(1, this.step.elapsed / this.step.duration);
    this.x = fromX + (this.step.toCol * TILE - fromX) * t;
    this.y = fromY + (this.step.toRow * TILE - fromY) * t;
  }
}
