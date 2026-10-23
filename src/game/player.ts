import type { Controls } from "../input/controls";
import { PLAYER, TIMESTEP } from "./config";
import { overlaps, type Solid } from "./world";

const JUMP_SPEED = Math.sqrt(2 * PLAYER.gravity * PLAYER.jumpHeight);

// Approach `target` by at most `step`.
function approach(value: number, target: number, step: number): number {
  if (value < target) return Math.min(value + step, target);
  return Math.max(value - step, target);
}

// Largest slice simulated in one go. Longer updates are split into slices of
// at most this, so speed never carries the player through a thin solid.
const MAX_SUBSTEP = TIMESTEP;
const EPSILON = 1e-9;

export class Player {
  x: number;
  y: number;
  // Position at the start of the last update, for render interpolation.
  prevX: number;
  prevY: number;
  vx = 0;
  vy = 0;
  grounded = false;
  facing: 1 | -1 = 1;

  readonly w = PLAYER.width;
  readonly h = PLAYER.height;

  private coyote = 0;
  private jumpBuffer = 0;

  constructor(x: number, y: number) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
  }

  update(dt: number, controls: Controls, solids: Solid[]): void {
    this.prevX = this.x;
    this.prevY = this.y;

    this.resolveOverlaps(solids);

    const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP - EPSILON));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      // A press is a single-frame event, so only the first slice sees it.
      this.step(step, i === 0 ? controls : { ...controls, jumpPressed: false }, solids);
    }
  }

  private step(dt: number, controls: Controls, solids: Solid[]): void {
    this.applyHorizontalInput(dt, controls.moveX);
    this.applyJump(dt, controls);

    this.vy = Math.min(this.vy + PLAYER.gravity * dt, PLAYER.maxFallSpeed);

    this.moveX(dt, solids);
    this.moveY(dt, solids);
  }

  // If we start inside a solid (bad spawn, a future moving platform), push out
  // along the axis with the least penetration. Ties prefer up, then sideways.
  private resolveOverlaps(solids: Solid[]): void {
    // A push can land us in a neighbouring solid, so settle over a few passes.
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const s of solids) {
        if (s.oneWay || !overlaps(this, s)) continue;
        const up = this.y + this.h - s.y;
        const left = this.x + this.w - s.x;
        const right = s.x + s.w - this.x;
        const down = s.y + s.h - this.y;
        const least = Math.min(up, left, right, down);
        if (least === up) {
          this.y = s.y - this.h;
          if (this.vy > 0) this.vy = 0;
          this.grounded = true;
        } else if (least === left) {
          this.x = s.x - this.w;
          if (this.vx > 0) this.vx = 0;
        } else if (least === right) {
          this.x = s.x + s.w;
          if (this.vx < 0) this.vx = 0;
        } else {
          this.y = s.y + s.h;
          if (this.vy < 0) this.vy = 0;
        }
        moved = true;
      }
      if (!moved) return;
    }
  }

  private applyHorizontalInput(dt: number, moveX: number): void {
    const accel = this.grounded ? PLAYER.groundAccel : PLAYER.airAccel;
    const friction = this.grounded ? PLAYER.groundFriction : PLAYER.airFriction;
    if (moveX !== 0) {
      this.vx = approach(this.vx, moveX * PLAYER.maxSpeed, accel * dt);
      this.facing = moveX > 0 ? 1 : -1;
    } else {
      this.vx = approach(this.vx, 0, friction * dt);
    }
  }

  private applyJump(dt: number, controls: Controls): void {
    this.coyote = this.grounded ? PLAYER.coyoteTime : Math.max(0, this.coyote - dt);
    this.jumpBuffer = controls.jumpPressed
      ? PLAYER.jumpBufferTime
      : Math.max(0, this.jumpBuffer - dt);

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -JUMP_SPEED;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.grounded = false;
    }

    // Variable jump height: letting go early cuts the rise short.
    if (!controls.jumpHeld && this.vy < 0) {
      this.vy *= PLAYER.jumpCutFactor;
    }
  }

  private moveX(dt: number, solids: Solid[]): void {
    this.x += this.vx * dt;
    for (const s of solids) {
      if (s.oneWay || !overlaps(this, s)) continue;
      this.x = this.vx > 0 ? s.x - this.w : s.x + s.w;
      this.vx = 0;
    }
  }

  private moveY(dt: number, solids: Solid[]): void {
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.grounded = false;

    for (const s of solids) {
      if (!overlaps(this, s)) continue;
      if (this.vy > 0) {
        // One-way platforms only catch us if we were above them last step.
        if (s.oneWay && prevBottom > s.y) continue;
        this.y = s.y - this.h;
        this.vy = 0;
        this.grounded = true;
      } else if (this.vy < 0 && !s.oneWay) {
        this.y = s.y + s.h;
        this.vy = 0;
      }
    }
  }
}
