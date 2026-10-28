import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { fitLabel } from "../../render/dialog-box";
import { hintLine } from "../../render/hints";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import type { Decor } from "../decor";
import type { DecorItem } from "../decor-data";

// Changing something in the room (issue 062 stage 2, docs/decor.md): a short
// list of the things you own that fit the slot. Moving the highlight shows that
// item in the room behind the list; E puts it there and Escape leaves the room
// as it was. It is not a chore: it pays nothing, changes no mood and has no
// cooldown, so both ways out are the quiet end (like the track editor's), never
// a completion and never a cancel. The preview is only a view (`Decor.preview`),
// so nothing is saved or changed until E. An item is shown in one place (issue
// 073): a row for an item shown elsewhere says where, and a line above the keys
// says what E does (swaps with the item here, or why it cannot).

// Layout, in pixels: rows shown at once, row height, the box's margin and padding.
const ROWS = 4;
const ROW = GLYPH_H + 2;
const MARGIN = 17;
const PAD = 5;
const HEAD = ROW + 3;
const NOTE = ROW + 1;
const FOOT = ROW + 2;

// The line of keys at the foot; on the touch layer it names the pad and the buttons (issue 093).
export const footer = (): string =>
  hintLine([
    { key: "UP DOWN", text: "LOOK" },
    { key: "E", text: "PUT UP" },
    { key: "ESC", text: "BACK" },
  ]);
const HERE = "(IN PLACE)";

export class SwapDecorActivity extends BaseActivity {
  cancellable = true;
  // Up, down and E are the list's keys.
  readonly readsKeys = true;
  readonly readsLetters = false;
  // No time pressure while you choose.
  readonly holdsClock = true;

  cursor = 0;
  private list: DecorItem[] = [];

  constructor(
    private readonly slotId: string,
    private readonly decor: Decor,
    private readonly host: ActivityHost,
  ) {
    super();
    this.list = decor.choices(slotId);
    // Nothing to choose from (the task is not offered then): just a quiet end.
    if (this.list.length < 2) {
      this.finish({ completed: false, quiet: true });
      return;
    }
    this.cursor = Math.max(0, this.list.findIndex((i) => i.id === decor.placedIn(slotId).id));
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    // What you own cannot shrink while this is open, but never trust that.
    this.list = this.decor.choices(this.slotId);
    if (this.list.length < 2) return this.leave();
    this.cursor = Math.min(Math.max(this.cursor, 0), this.list.length - 1);
    if (controls.cancelPressed) return this.cancel();
    if (controls.interactPressed) return this.choose();
    const step = controls.dirPressed === "up" ? -1 : controls.dirPressed === "down" ? 1 : 0;
    if (step === 0) return;
    this.cursor = (this.cursor + step + this.list.length) % this.list.length;
    this.decor.preview(this.slotId, this.list[this.cursor].id);
  }

  // E: put the highlighted item up (if it is not the one already there).
  private choose(): void {
    const item = this.list[this.cursor];
    this.decor.clearPreview();
    if (!item) return this.leave();
    const plan = this.decor.plan(this.slotId, item.id);
    const wasLive = new Map(plan.ok ? plan.changes.map((c) => [c.slot, this.decor.isLive(c.slot)] as const) : []);
    // Refused (the other slot cannot take what is here): the list stays open and says why.
    if (!plan.ok) return;
    if (plan.changes.length && this.decor.place(this.slotId, item.id)) {
      // A live plant you put in over another live plant starts small: its slot's growth and dryness start over.
      // A still item (dried flowers) standing in, or leaving, keeps the live plant's state as it was (issue 105).
      for (const c of plan.changes) {
        const slot = this.decor.slot(c.slot);
        if (slot && wasLive.get(c.slot) && this.decor.isLive(c.slot)) for (const id of [slot.stageVar, slot.growthVar, slot.dryVar]) if (id) this.host.setState(id, 0);
      }
    }
    this.finish({ completed: false, quiet: true });
  }

  // The line above the keys for the highlighted item: what E would do.
  note(item: DecorItem | undefined): string {
    if (!item || item.id === this.decor.placedIn(this.slotId).id) return "";
    const plan = this.decor.plan(this.slotId, item.id);
    if (!plan.ok) return plan.reason;
    const here = this.decor.placedIn(this.slotId);
    return this.decor.displayedAt(item.id) ? `SWAPS WITH ${here.name}` : `${here.name} GOES TO THE INVENTORY`;
  }

  // Leaves the room as it was.
  private leave(): void {
    this.decor.clearPreview();
    this.finish({ completed: false, quiet: true });
  }

  // Escape (and anything that drops the task): undo the preview, quietly.
  cancel(): void {
    if (this.done) return;
    this.leave();
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    if (this.done || this.list.length < 2) return;
    const slot = this.decor.slot(this.slotId);
    if (!slot) return;
    const rows = Math.min(ROWS, this.list.length);
    const w = screen.width - 2 * MARGIN;
    const h = PAD * 2 + HEAD + rows * ROW + NOTE + FOOT;
    // The box goes where it does not hide the thing being changed: along the
    // bottom, or along the top for a slot in the lower half of the room.
    const x = MARGIN;
    const y = slot.area.y > 70 ? 4 : screen.height - 4 - h;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const opts = { color: COLOR.ink, shadow: null } as const;
    const left = x + PAD;
    const right = x + w - PAD;
    drawText(ctx, slot.name, left, y + PAD, opts);
    drawText(ctx, `${this.cursor + 1}/${this.list.length}`, right, y + PAD, { ...opts, align: "right" });
    const first = Math.min(Math.max(this.cursor - ROWS + 1, 0), this.list.length - rows);
    const here = this.decor.placedIn(this.slotId).id;
        for (let i = 0; i < rows; i++) {
      const item = this.list[first + i];
      const top = y + PAD + HEAD + i * ROW;
      if (first + i === this.cursor) {
        // An arrow at the highlighted row.
        ctx.fillStyle = COLOR.ink;
        ctx.fillRect(left, top, 1, 5);
        ctx.fillRect(left + 1, top + 1, 1, 3);
        ctx.fillRect(left + 2, top + 2, 1, 1);
      }
      // At the right: "(IN PLACE)" for the one here, or where the item is shown now.
      const elsewhere = item.id === here ? undefined : this.decor.displayedAt(item.id);
      const tag = item.id === here ? HERE : elsewhere ? (elsewhere.where ?? elsewhere.name) : "";
      drawText(ctx, fitLabel(item.name, right - left - 10 - (tag ? textWidth(tag) + 6 : 0)), left + 8, top, opts);
      if (tag) drawText(ctx, tag, right, top, { ...opts, align: "right" });
    }
    drawText(ctx, fitLabel(this.note(this.list[this.cursor]), right - left), left, y + PAD + HEAD + rows * ROW + 1, opts);
    drawText(ctx, footer(), left, y + h - PAD - GLYPH_H, opts);
  }
}

registerActivity(
  "swap-decor",
  (_spec, item, host) => new SwapDecorActivity(item.decorSlot!, needHost(host, `Task "${item.id}"`).decor ?? missingDecor(item.id), host!),
  (_spec, item) => {
    if (typeof item.decorSlot !== "string") throw new Error(`Task "${item.id}" is a decor swap but names no decorSlot`);
  },
);

function missingDecor(id: string): never {
  throw new Error(`Task "${id}" needs the game's decor, but the host has none`);
}
