import type { Decor } from "../decor";
import type { DecorItem } from "../decor-data";
import { OUTFIT_SLOTS, type OutfitSlotDef } from "../outfits";

// The OUTFITS pause page's cursor (issue 181, docs/outfit-equip-screen-design.md). It keeps only where you are
// (which column, which slot, which row, which way the character faces) and reads and writes everything else through
// `Decor`: `slotChoices`, `equippedIn`, `equip`, `wornSlot`. Nothing is written until E equips.

// The order the character turns through, as the sprites' direction names.
export const FACINGS = ["down", "left", "up", "right"] as const;
export type Facing = (typeof FACINGS)[number];

export type OutfitsFocus = "slots" | "list";

export type OutfitsKeyResult = "leave" | "handled" | "ignored";

const DIRS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" } as const;
export const TURN_CODES = ["Tab", "KeyQ"];

export class OutfitsPage {
  focus: OutfitsFocus = "slots";
  // Index into OUTFIT_SLOTS, and into that slot's choices.
  slot = 0;
  row = 0;
  // Index into FACINGS; a view only, back to facing down each time the page opens.
  facing = 0;

  constructor(private readonly decor: Decor) {}

  // Opens on the slot you are wearing, facing down.
  open(): void {
    const worn = this.decor.wornSlot();
    this.slot = Math.max(0, OUTFIT_SLOTS.findIndex((s) => s.id === worn));
    this.focus = "slots";
    this.facing = 0;
    this.syncRow();
  }

  get slotDef(): OutfitSlotDef {
    return OUTFIT_SLOTS[this.slot];
  }

  choices(): DecorItem[] {
    return this.decor.slotChoices(this.slotDef.id);
  }

  // The row of the outfit equipped in the slot (0 when there is none).
  private syncRow(): void {
    const at = this.choices().findIndex((i) => i.id === this.decor.equippedIn(this.slotDef.id));
    this.row = Math.max(0, at);
  }

  // The outfit the character wears in the preview: the highlighted one in the list, else what the slot holds, else
  // what an empty slot would put on you (the EVERYDAY outfit).
  previewId(): string {
    if (this.focus === "list") {
      const c = this.choices()[this.row];
      if (c) return c.id;
    }
    return this.decor.equippedIn(this.slotDef.id) ?? this.decor.resolveOutfit(this.slotDef.id);
  }

  // The outfit whose own note the top bar shows: the highlighted one, or the one equipped in the picked slot.
  noteItem(): DecorItem | undefined {
    const id = this.focus === "list" ? this.choices()[this.row]?.id : this.decor.equippedIn(this.slotDef.id);
    return id === undefined ? undefined : this.decor.item(id);
  }

  turn(step: number): void {
    this.facing = (this.facing + step + FACINGS.length) % FACINGS.length;
  }

  pickSlot(i: number): void {
    this.slot = Math.min(Math.max(i, 0), OUTFIT_SLOTS.length - 1);
    this.focus = "slots";
    this.syncRow();
  }

  // Into the list, on the outfit equipped there. Nothing to go into when the slot has no outfits.
  enterList(): boolean {
    if (this.choices().length === 0) return false;
    this.syncRow();
    this.focus = "list";
    return true;
  }

  highlight(row: number): void {
    const n = this.choices().length;
    if (n === 0) return;
    this.focus = "list";
    this.row = Math.min(Math.max(row, 0), n - 1);
  }

  // E in the list: equips the highlighted outfit in the slot (equipping the slot you are wearing changes your
  // clothes at once, as the bookshelf does).
  equip(): boolean {
    const c = this.choices()[this.row];
    return c !== undefined && this.decor.equip(this.slotDef.id, c.id);
  }

  // A tap on a list row: highlight it, and equip it when it was already highlighted.
  tapRow(row: number): void {
    if (this.focus === "list" && this.row === row) this.equip();
    else this.highlight(row);
  }

  key(code: string, shift = false): OutfitsKeyResult {
    if (TURN_CODES.includes(code)) {
      this.turn(shift ? -1 : 1);
      return "handled";
    }
    if (code === "Escape") {
      if (this.focus === "list") {
        this.focus = "slots";
        return "handled";
      }
      return "leave";
    }
    if (code === "KeyE") {
      if (this.focus === "list") this.equip();
      else this.enterList();
      return "handled";
    }
    const dir: "left" | "right" | "up" | "down" | undefined = (DIRS as Record<string, "left" | "right" | "up" | "down">)[code];
    if (!dir) return "ignored";
    if (this.focus === "slots") {
      if (dir === "up" || dir === "down") this.pickSlot((this.slot + (dir === "up" ? -1 : 1) + OUTFIT_SLOTS.length) % OUTFIT_SLOTS.length);
      else if (dir === "right") this.enterList();
    } else if (dir === "left") this.focus = "slots";
    else if (dir === "up" || dir === "down") {
      const n = this.choices().length;
      this.row = (this.row + (dir === "up" ? -1 : 1) + n) % n;
    }
    return "handled";
  }
}
