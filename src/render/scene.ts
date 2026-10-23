import { PLAYER_ANIM } from "../game/config";
import type { Prop, Scene } from "../game/level";
import { COLOR } from "./colors";
import type { PlayerFrame } from "./player-sprite";
import type { SpriteDrawer } from "./sprites";

// Decor goes behind furniture; within a layer the data order is kept (the sort
// is stable), so what is listed later draws on top.
export function orderProps(props: Prop[]): Prop[] {
  const rank = (p: Prop) => (p.layer === "decor" ? 0 : 1);
  return [...props].sort((a, b) => rank(a) - rank(b));
}

// Back wall, room shell, decor, furniture. The player and UI come after.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  sprites: SpriteDrawer,
): void {
  const { wall } = scene;
  ctx.fillStyle = COLOR.slate;
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

  ctx.fillStyle = COLOR.dusk;
  for (const s of scene.shell) ctx.fillRect(s.x, s.y, s.w, s.h);

  for (const p of orderProps(scene.props)) {
    sprites.draw(ctx, p.sprite, p.x, p.y, { width: p.w, height: p.h });
  }
}

// `x`, `y` are the hitbox's top-left in world pixels. The frames face right and
// are mirrored for facing left; the body is centred in its cell, so the same
// anchor works both ways.
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  sprites: SpriteDrawer,
  frame: PlayerFrame,
  x: number,
  y: number,
  facing: 1 | -1,
): void {
  const size = { width: PLAYER_ANIM.frameSize, height: PLAYER_ANIM.frameSize };
  sprites.draw(ctx, frame, x - PLAYER_ANIM.offsetX, y - PLAYER_ANIM.offsetY, size, facing < 0);
}
