import type { Controls } from "../../input/controls";
import type { TapTarget } from "../../input/tap";
import { COLOR, withAlpha } from "../../render/colors";
import { drawText } from "../../render/font";
import type { SpriteDrawer } from "../../render/sprites";
import { BaseActivity, needHost, registerActivity } from "../activity";
import type { Decor } from "../decor";
import { closeName, type DecorItem } from "../decor-data";
import { wrapText } from "../dialog";

// Looking closely at something you display (issue 185, stage B of docs/trinket-display-design.md): a card over the
// dimmed room with a large picture of the item, its name, where it came from and its note. It is a look, not a chore:
// it pays nothing, changes nothing, stores nothing and has no cooldown or sound, so it always ends quietly. E, Escape
// or a tap anywhere closes it and you are in exactly the room you left. The clock stands still while it is open.

// The picture is a 48 x 48 close-up named `<item sprite>-close`, drawn at 3x (144 px, Marc's d10).
export const CLOSE_SIZE = 48;
export const CLOSE_SCALE = 3;
const FIELD = CLOSE_SIZE * CLOSE_SCALE + 4;
const LINE = 9;
const DIM = withAlpha(COLOR.night, 0.72);

export { closeName };

// Which picture the card draws and how big: the close-up at 3x, or, while the close-up is missing, the item's small
// 16 x 16 sprite at 8x (so nothing breaks while art is missing).
export function closeUp(has: (name: string) => boolean, sprite: string): { name: string; size: number; scale: number } {
  if (has(closeName(sprite))) return { name: closeName(sprite), size: CLOSE_SIZE, scale: CLOSE_SCALE };
  return { name: sprite, size: 16, scale: 8 };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExamineLayout {
  card: Rect;
  // The 2 px bordered field, and the top left of the picture inside it.
  field: Rect;
  picture: { x: number; y: number };
  name: { x: number; y: number; align: "left" };
  from: { x: number; y: number; align: "left" | "right" };
  note: { x: number; y: number; width: number; pitch: number };
  arrow: { x: number; y: number };
}

// Where everything goes for a view: the wide 320 x 192 (picture on the left, text on the right) or the phone's
// 224 x 208 (picture on top, text below). A pure function of the size, so it is tested without a canvas.
export function examineLayout(view: { width: number; height: number }): ExamineLayout {
  if (view.width >= 300) {
    const card = { x: 12, y: 22, w: view.width - 24, h: view.height - 28 };
    const field = { x: card.x + 8, y: card.y + 8, w: FIELD, h: FIELD };
    const left = field.x + FIELD + 10;
    const width = card.x + card.w - 12 - left;
    return {
      card,
      field,
      picture: { x: field.x + 2, y: field.y + 2 },
      name: { x: left, y: field.y + 2, align: "left" },
      from: { x: left, y: field.y + 12, align: "left" },
      note: { x: left, y: field.y + 30, width, pitch: LINE },
      arrow: { x: card.x + card.w - 11, y: card.y + card.h - 9 },
    };
  }
  const card = { x: 4, y: 16, w: view.width - 8, h: view.height - 18 };
  const field = { x: Math.floor((view.width - FIELD) / 2), y: card.y + 3, w: FIELD, h: FIELD };
  const left = card.x + 8;
  const rowY = field.y + FIELD + 3;
  return {
    card,
    field,
    picture: { x: field.x + 2, y: field.y + 2 },
    name: { x: left, y: rowY, align: "left" },
    from: { x: card.x + card.w - 8, y: rowY, align: "right" },
    note: { x: left, y: rowY + LINE, width: card.w - 16, pitch: LINE },
    arrow: { x: card.x + card.w - 11, y: card.y + card.h - 9 },
  };
}

export class ExamineActivity extends BaseActivity {
  cancellable = true;
  readonly readsKeys = true;
  readonly readsLetters = false;
  // No time pressure while you look.
  readonly holdsClock = true;
  // The card needs no "ESC: STOP" over it, and no banner over the player.
  readonly hidesStopHint = true;
  private readonly item: DecorItem | undefined;

  constructor(
    slotId: string,
    decor: Decor,
    private readonly sprites: SpriteDrawer | undefined,
  ) {
    super();
    this.item = decor.heldIn(slotId);
    // Nothing is there (the task is not offered then): just a quiet end.
    if (!this.item) this.finish({ completed: false, quiet: true });
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    if (controls.cancelPressed || controls.interactPressed) this.close();
  }

  cancel(): void {
    this.close();
  }

  private close(): void {
    this.finish({ completed: false, quiet: true });
  }

  // A tap anywhere closes it.
  tapTargets(screen: { width: number; height: number }): TapTarget[] {
    if (this.done) return [];
    return [{ x: 0, y: 0, w: screen.width, h: screen.height, run: () => this.close() }];
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const item = this.item;
    if (this.done || !item) return;
    const lay = examineLayout(screen);
    ctx.fillStyle = DIM;
    ctx.fillRect(0, 0, screen.width, screen.height);
    const { card, field } = lay;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(card.x + 1, card.y + 1, card.w - 2, card.h - 2);
    // The picture's field: a 2 px ink border round a night square.
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(field.x, field.y, field.w, field.h);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(field.x + 2, field.y + 2, field.w - 4, field.h - 4);
    const sprites = this.sprites;
    if (sprites) {
      const pic = closeUp((n) => sprites.has(n), item.sprite);
      const side = pic.size * pic.scale;
      // Centred in the field (the 8x fallback is smaller than the close-up).
      const x = lay.picture.x + Math.floor((FIELD - 4 - side) / 2);
      const y = lay.picture.y + Math.floor((FIELD - 4 - side) / 2);
      if (sprites.has(pic.name) && sprites.drawRegion) {
        ctx.save();
        ctx.translate(x, y);
        sprites.drawRegion(ctx, pic.name, { x: 0, y: 0, w: pic.size, h: pic.size }, { width: side, height: side });
        ctx.restore();
      } else if (sprites.has(pic.name)) sprites.draw(ctx, pic.name, x, y, { width: side, height: side });
    }
    const opts = { color: COLOR.ink, shadow: null } as const;
    drawText(ctx, item.name, lay.name.x, lay.name.y, opts);
    if (item.from) drawText(ctx, `FROM: ${item.from}`, lay.from.x, lay.from.y, { color: COLOR.dusk, shadow: null, align: lay.from.align });
    wrapText(item.note ?? "", lay.note.width).forEach((line, i) => drawText(ctx, line, lay.note.x, lay.note.y + i * lay.note.pitch, opts));
  }
}

registerActivity(
  "examine",
  (_spec, item, host) => new ExamineActivity(item.heldSlot!, needHost(host, `Task "${item.id}"`).decor ?? missingDecor(item.id), host?.sprites),
  (_spec, item) => {
    if (typeof item.heldSlot !== "string") throw new Error(`Task "${item.id}" is an examine but names no heldSlot`);
  },
);

function missingDecor(id: string): never {
  throw new Error(`Task "${id}" needs the game's decor, but the host has none`);
}
