import { TILE } from "../game/config";
import type { Level } from "../game/level";
import { COLOR } from "./colors";
import type { SpriteDrawer } from "./sprites";

// Draws sprites for the game, or tells it to fall back to the plain coloured
// rectangles. Without a sprite source (tests) it is inactive and everything is
// a rectangle. With one, a sprite that is missing draws as a rectangle too, and
// is logged once, not every frame.
export class RoomPainter {
  private readonly warned = new Set<string>();

  constructor(private readonly sprites?: SpriteDrawer) {}

  get active(): boolean {
    return this.sprites !== undefined;
  }

  // True if the sprite is loaded; says nothing when it isn't.
  has(name: string): boolean {
    return this.sprites?.has(name) ?? false;
  }

  // True if the sprite can be drawn. A missing one is logged the first time.
  available(name: string): boolean {
    if (!this.sprites) return false;
    if (this.sprites.has(name)) return true;
    if (!this.warned.has(name)) {
      this.warned.add(name);
      console.warn(`Sprite "${name}" is missing; drawing a coloured rectangle instead`);
    }
    return false;
  }

  // Draws the sprite with its top-left at (x, y). Returns false if it can't.
  draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, flip = false): boolean {
    if (!this.available(name)) return false;
    this.sprites!.draw(ctx, name, x, y, undefined, flip);
    return true;
  }

  // Draws one window `from` of a sprite with its top-left at (x, y), at its own
  // size (the breath band of the sleeper). Does nothing if the sprite source
  // cannot cut windows, so the sleeper just does not breathe.
  drawRegion(
    ctx: CanvasRenderingContext2D,
    name: string,
    from: { x: number; y: number; w: number; h: number },
    x: number,
    y: number,
  ): boolean {
    if (!this.sprites?.drawRegion || !this.sprites.has(name)) return false;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    this.sprites.drawRegion(ctx, name, from, { width: from.w, height: from.h });
    ctx.restore();
    return true;
  }
}

const key = (col: number, row: number) => `${col},${row}`;

// The floor and the walls of a room, under everything else. A tile whose
// sprite is missing is drawn the old way: a chequered floor, a dusk wall.
export function drawFloorAndWalls(
  ctx: CanvasRenderingContext2D,
  level: Level,
  painter: RoomPainter,
): void {
  const cols = level.size.width / TILE;
  const rows = level.size.height / TILE;
  const tiled = painter.active && level.floor && level.walls;
  const floor = tiled ? new Set(level.floor!.tiles.map((t) => key(t.col, t.row))) : null;
  const checker = (col: number, row: number) => {
    ctx.fillStyle = (col + row) % 2 === 0 ? COLOR.night : COLOR.slate;
    ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
  };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (floor && !floor.has(key(col, row))) continue;
      if (!(floor && painter.draw(ctx, level.floor!.sprite, col * TILE, row * TILE))) checker(col, row);
    }
  }
  if (!tiled) return;
  for (const wall of level.walls!) {
    const x = wall.col * TILE;
    const y = wall.row * TILE;
    if (wall.doorSprite && painter.available(wall.doorSprite)) {
      painter.draw(ctx, wall.sprite, x, y);
      painter.draw(ctx, wall.doorSprite, x, y);
    } else if (wall.doorSprite) {
      checker(wall.col, wall.row);
    } else if (!painter.draw(ctx, wall.sprite, x, y)) {
      ctx.fillStyle = COLOR.dusk;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
}
