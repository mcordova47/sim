import { CAMERA } from "../game/config";

interface Size {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

// Follows a target around a world that can be larger than the view. The
// position is the top-left of the view in world pixels. It keeps the previous
// position too, so drawing can interpolate between simulation steps the same
// way the player does, and everything is drawn at whole-pixel offsets.
export class Camera {
  x = 0;
  y = 0;
  private prevX = 0;
  private prevY = 0;

  constructor(
    private readonly world: Size,
    private readonly view: Size,
  ) {}

  // Jump straight to the target with no smoothing, for the first frame.
  snapTo(target: Point): void {
    this.x = this.prevX = this.clampX(target.x - this.view.width / 2);
    this.y = this.prevY = this.clampY(target.y - this.view.height / 2);
  }

  update(dt: number, target: Point): void {
    this.prevX = this.x;
    this.prevY = this.y;

    // Only move once the target leaves a box around the centre of the view.
    const wantX = this.centreOn(this.x + this.view.width / 2, target.x, CAMERA.deadzoneX);
    const wantY = this.centreOn(this.y + this.view.height / 2, target.y, CAMERA.deadzoneY);

    // Exponential smoothing, so the feel doesn't depend on the step size.
    const k = 1 - Math.exp(-CAMERA.followSpeed * dt);
    this.x += (this.clampX(wantX - this.view.width / 2) - this.x) * k;
    this.y += (this.clampY(wantY - this.view.height / 2) - this.y) * k;
  }

  // Where to draw the world, interpolated between the last two steps and
  // rounded to whole pixels.
  position(alpha: number): Point {
    return {
      x: Math.round(this.prevX + (this.x - this.prevX) * alpha),
      y: Math.round(this.prevY + (this.y - this.prevY) * alpha),
    };
  }

  // The centre the view should move toward: where it is now, pulled just far
  // enough to keep the target inside the dead zone.
  private centreOn(centre: number, target: number, deadzone: number): number {
    const offset = target - centre;
    if (Math.abs(offset) <= deadzone) return centre;
    return target - Math.sign(offset) * deadzone;
  }

  // A world smaller than the view stays pinned to its top-left.
  private clampX(x: number): number {
    return Math.min(Math.max(x, 0), Math.max(0, this.world.width - this.view.width));
  }

  private clampY(y: number): number {
    return Math.min(Math.max(y, 0), Math.max(0, this.world.height - this.view.height));
  }
}
