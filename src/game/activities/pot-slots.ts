import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { fitLabel } from "../../render/dialog-box";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import { NARROW_VIEW } from "../config";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import type { Decor } from "../decor";
import type { DecorItem } from "../decor-data";

// The Change plants list (issue 182, docs/plant-pots-design.md, Marc's answer to d1 of issue 182): the bookshelf's
// three pots (the vase, the bowl and the plant pot) as a list of slots like the clothes list (activities/outfit-slots.ts),
// not a list of plants. Up and down choose a pot; left and right choose the plant for it (you see it in the room behind
// the list at once); E puts the chosen plants up; Escape leaves the room as it was. Like every swap it holds the clock,
// pays nothing and ends quietly. Nothing is saved until E. No help text: pot names, plants and the keys line. The empty
// vase, bowl and pot are choices like any other (they are always owned, so they are always in the cycle).
// On the narrow phone view each pot takes two rows (its name, then the plant).

const ROW = GLYPH_H + 2;
const MARGIN = 17;
const PAD = 5;
const HEAD = ROW + 3;
const FOOT = ROW + 2;
const TITLE = "PLANTS";

// The line of keys at the foot; on the touch layer it names the pad and the buttons.
export const footer = (): string =>
  hintLine([
    { key: "ARROWS", text: "PICK" },
    { key: "E", text: "SET" },
    { key: "ESC", text: "BACK" },
  ]);

export class PotSlotsActivity extends BaseActivity {
  cancellable = true;
  // Arrows and E are the list's keys.
  readonly readsKeys = true;
  readonly readsLetters = false;
  // No time pressure while you choose.
  readonly holdsClock = true;

  // Index into `pots`.
  cursor = 0;
  // The slots in the list, in table order (north to south), and the item picked for each (not yet placed).
  readonly pots: string[];
  private readonly picks: Record<string, string> = {};

  constructor(
    private readonly slotId: string,
    private readonly decor: Decor,
    private readonly host: ActivityHost,
  ) {
    super();
    this.pots = decor.groupOf(slotId).filter((id) => decor.slot(id) && decor.heldIn(id));
    // Not a list without a pot that holds something (never in the real game): a quiet end.
    if (this.pots.length === 0) {
      this.finish({ completed: false, quiet: true });
      return;
    }
    for (const id of this.pots) this.picks[id] = decor.heldIn(id)!.id;
  }

  get slot(): string {
    return this.pots[this.cursor];
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    // What you own cannot shrink while this is open, but never trust that (a reset from the achievements list): no spare
    // left means the task is no longer offered, so the list just ends quietly.
    if (!this.decor.canChange(this.slotId)) return this.cancel();
    if (controls.cancelPressed) return this.cancel();
    if (controls.interactPressed) return this.choose();
    const d = controls.dirPressed;
    if (d === "up" || d === "down") this.cursor = (this.cursor + (d === "up" ? -1 : 1) + this.pots.length) % this.pots.length;
    else if (d === "left" || d === "right") this.cycle(d === "left" ? -1 : 1);
  }

  // The plants the highlighted pot could hold now, in table order.
  private choices(slot: string): DecorItem[] {
    return this.decor.choices(slot).filter((i) => this.decor.plan(slot, i.id).ok);
  }

  // Picks the next (or previous) plant for the highlighted pot; wraps.
  private cycle(step: number): void {
    const choices = this.choices(this.slot);
    if (choices.length < 2) return;
    const at = choices.findIndex((i) => i.id === this.picks[this.slot]);
    this.picks[this.slot] = choices[(at + step + choices.length) % choices.length].id;
    this.decor.previewMany(this.picks);
  }

  // E: put the picked plants up. A live plant that takes the place of another live plant starts small, as in the
  // swap list (issue 105): its slot's growth and dryness start over; a still item keeps them as they were.
  private choose(): void {
    this.decor.clearPreview();
    for (const slot of this.pots) {
      const pick = this.picks[slot];
      if (pick === this.decor.heldIn(slot)?.id) continue;
      const wasLive = this.decor.isLive(slot);
      if (!this.decor.place(slot, pick)) continue;
      const def = this.decor.slot(slot);
      if (def && wasLive && this.decor.isLive(slot)) for (const id of [def.stageVar, def.growthVar, def.dryVar]) if (id) this.host.setState(id, 0);
    }
    this.finish({ completed: false, quiet: true });
  }

  // Escape (and anything that drops the task): undo the preview, quietly.
  cancel(): void {
    if (this.done) return;
    this.decor.clearPreview();
    this.finish({ completed: false, quiet: true });
  }

  private name(slot: string): string {
    const def = this.decor.slot(slot);
    return def?.label ?? def?.name ?? slot;
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }, avoid?: { x: number; y: number; w: number; h: number }): void {
    if (this.done) return;
    const narrow = screen.width <= NARROW_VIEW.width;
    const per = ROW * (narrow ? 2 : 1);
    const w = screen.width - 2 * MARGIN;
    const h = PAD * 2 + HEAD + this.pots.length * per + FOOT;
    // Along the bottom, so the pots at the top of the room stay in view while you pick; along the top only when the
    // player would be under the box (never over them).
    const x = MARGIN;
    const bottom = screen.height - 4 - h;
    const y = avoid !== undefined && avoid.y + avoid.h > bottom ? 4 : bottom;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const opts = { color: COLOR.ink, shadow: null } as const;
    const left = x + PAD;
    const right = x + w - PAD;
    drawText(ctx, TITLE, left, y + PAD, opts);
    const column = left + 8 + Math.max(...this.pots.map((s) => textWidth(this.name(s)))) + 10;
    this.pots.forEach((slot, i) => {
      const top = y + PAD + HEAD + i * per;
      const here = i === this.cursor;
      if (here) {
        ctx.fillStyle = COLOR.ink;
        ctx.fillRect(left, top, 1, 5);
        ctx.fillRect(left + 1, top + 1, 1, 3);
        ctx.fillRect(left + 2, top + 2, 1, 1);
      }
      drawText(ctx, this.name(slot), left + 8, top, opts);
      // `< >` only when there is something to change to.
      const name = this.decor.item(this.picks[slot])?.name ?? "-";
      const text = here && this.choices(slot).length > 1 ? `< ${name} >` : name;
      const nx = narrow ? left + 12 : column;
      drawText(ctx, fitLabel(text, right - nx), nx, narrow ? top + ROW : top, opts);
    });
    drawText(ctx, footer(), left, y + h - PAD - GLYPH_H, opts);
  }
}

registerActivity(
  "pot-slots",
  (_spec, item, host) => new PotSlotsActivity(item.decorSlot!, needHost(host, `Task "${item.id}"`).decor ?? missingDecor(item.id), host!),
  (_spec, item) => {
    if (typeof item.decorSlot !== "string") throw new Error(`Task "${item.id}" is the plants list but names no decorSlot`);
  },
);

function missingDecor(id: string): never {
  throw new Error(`Task "${id}" needs the game's decor, but the host has none`);
}
