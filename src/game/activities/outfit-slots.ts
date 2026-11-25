import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { fitLabel } from "../../render/dialog-box";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { hintLine } from "../../render/hints";
import { NARROW_VIEW } from "../config";
import { BaseActivity, needHost, registerActivity } from "../activity";
import type { Decor } from "../decor";
import { OUTFIT_SLOTS, type OutfitSlotDef } from "../outfits";

// The Change clothes list (issue 175, docs/outfit-slots-design.md): a list of the four outfit slots instead of a
// list of outfits. Up and down choose a slot; left and right change the outfit equipped there (you see it on
// yourself at once); E wears that slot now; Escape leaves what you wear as it was (equipment changes already made
// stay: they are tidying, not a purchase). Like every swap it holds the clock, pays nothing and ends quietly.
// All four slots always show (Marc, 164 d9); an empty slot reads a dash (it wears the EVERYDAY outfit). No help text: the list is slot names, outfits, WORN and the keys line.
// On the narrow phone view each slot takes two rows (the slot and WORN, then the outfit).

const ROW = GLYPH_H + 2;
const MARGIN = 17;
const PAD = 5;
const HEAD = ROW + 3;
const FOOT = ROW + 2;
const EMPTY_NAME = "-";
const WORN = "WORN";

// The line of keys at the foot; on the touch layer it names the pad and the buttons.
export const footer = (): string =>
  hintLine([
    { key: "ARROWS", text: "PICK" },
    { key: "E", text: "WEAR" },
    { key: "ESC", text: "BACK" },
  ]);

export class OutfitSlotsActivity extends BaseActivity {
  cancellable = true;
  // Arrows and E are the list's keys.
  readonly readsKeys = true;
  readonly readsLetters = false;
  // No time pressure while you choose.
  readonly holdsClock = true;

  // Index into OUTFIT_SLOTS.
  cursor = 0;

  constructor(private readonly decor: Decor) {
    super();
    // Not a list at all without the worn slot (never in the real game): a quiet end.
    if (!decor.hasSlot("worn")) {
      this.finish({ completed: false, quiet: true });
      return;
    }
    const worn = decor.wornSlot();
    this.cursor = Math.max(0, OUTFIT_SLOTS.findIndex((s) => s.id === worn));
    this.show();
  }

  get slot(): OutfitSlotDef {
    return OUTFIT_SLOTS[this.cursor];
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    if (controls.cancelPressed) return this.cancel();
    if (controls.interactPressed) return this.choose();
    const d = controls.dirPressed;
    if (d === "up" || d === "down") {
      this.cursor = (this.cursor + (d === "up" ? -1 : 1) + OUTFIT_SLOTS.length) % OUTFIT_SLOTS.length;
      this.show();
    } else if (d === "left" || d === "right") this.cycle(d === "left" ? -1 : 1);
  }

  // Shows what the highlighted slot would put on you, in the room behind the list.
  private show(): void {
    this.decor.preview("worn", this.decor.resolveOutfit(this.slot.id));
  }

  // Equips the next (or previous) owned outfit the slot takes; wraps.
  private cycle(step: number): void {
    const choices = this.decor.slotChoices(this.slot.id);
    if (choices.length < 2) return;
    const at = choices.findIndex((i) => i.id === this.decor.equippedIn(this.slot.id));
    const next = choices[(at + step + choices.length) % choices.length];
    this.decor.equip(this.slot.id, next.id);
    this.show();
  }

  // E: wear the highlighted slot now.
  private choose(): void {
    this.decor.clearPreview();
    this.decor.wearSlot(this.slot.id);
    this.finish({ completed: false, quiet: true });
  }

  // Escape (and anything that drops the task): undo the preview, quietly.
  cancel(): void {
    if (this.done) return;
    this.decor.clearPreview();
    this.finish({ completed: false, quiet: true });
  }

  // The outfit name in a slot's row (a dash when the slot is empty).
  private label(slot: OutfitSlotDef): { text: string; empty: boolean } {
    const id = this.decor.equippedIn(slot.id);
    const item = id === undefined ? undefined : this.decor.item(id);
    return item ? { text: item.name, empty: false } : { text: EMPTY_NAME, empty: true };
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }, avoid?: { x: number; y: number; w: number; h: number }): void {
    if (this.done) return;
    const narrow = screen.width <= NARROW_VIEW.width;
    const slots = OUTFIT_SLOTS.length;
    const w = screen.width - 2 * MARGIN;
    const h = PAD * 2 + HEAD + slots * ROW * (narrow ? 2 : 1) + FOOT;
    // Along the bottom, or along the top when the player is in the lower half of the screen (never over them).
    const x = MARGIN;
    const low = avoid !== undefined && avoid.y + avoid.h / 2 > screen.height / 2;
    const y = low ? 4 : screen.height - 4 - h;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const opts = { color: COLOR.ink, shadow: null } as const;
    const left = x + PAD;
    const right = x + w - PAD;
    drawText(ctx, "CLOTHES", left, y + PAD, opts);
    const column = left + 8 + Math.max(...OUTFIT_SLOTS.map((s) => textWidth(s.name))) + 10;
    const wornSlot = this.decor.wornSlot();
    OUTFIT_SLOTS.forEach((s, i) => {
      const top = y + PAD + HEAD + i * ROW * (narrow ? 2 : 1);
      const here = i === this.cursor;
      if (here) {
        ctx.fillStyle = COLOR.ink;
        ctx.fillRect(left, top, 1, 5);
        ctx.fillRect(left + 1, top + 1, 1, 3);
        ctx.fillRect(left + 2, top + 2, 1, 1);
      }
      const tag = wornSlot === s.id ? WORN : "";
      if (tag) drawText(ctx, tag, right, top, { ...opts, align: "right" });
      drawText(ctx, s.name, left + 8, top, opts);
      // `< >` only when there is something to change to.
      const arrows = here && this.decor.slotChoices(s.id).length > 1;
      const name = this.label(s).text;
      const text = arrows ? `< ${name} >` : name;
      const nx = narrow ? left + 12 : column;
      const room = (tag && !narrow ? right - textWidth(tag) - 6 : right) - nx;
      drawText(ctx, fitLabel(text, room), nx, narrow ? top + ROW : top, opts);
    });
    drawText(ctx, footer(), left, y + h - PAD - GLYPH_H, opts);
  }
}

registerActivity("outfit-slots", (_spec, item, host) => new OutfitSlotsActivity(needHost(host, `Task "${item.id}"`).decor ?? missingDecor(item.id)), (_spec, item) => {
  if (typeof item.decorSlot !== "string") throw new Error(`Task "${item.id}" is the clothes list but names no decorSlot`);
});

function missingDecor(id: string): never {
  throw new Error(`Task "${id}" needs the game's decor, but the host has none`);
}
