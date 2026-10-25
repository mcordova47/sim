import { unsupportedChars } from "../render/font";
import { DECOR, PLANT, TILE } from "./config";
import { DECOR_DATA, isTestItem, itemSprites, type DecorData, type DecorItem, type DecorSlot } from "./decor-data";
import type { Level } from "./level";
import type { ApartmentState } from "./state";
import type { Rect } from "./world";

// The decor store (issue 062, docs/decor.md): which items you own and which one
// is in each slot. How you came to own something is not recorded here, and
// nothing in the game rules reads any of it.

// What is saved, as the optional `decor` field of the progress save.
export interface DecorSave {
  // Item ids. Ids this build does not know are kept (a later build may bring
  // the item back) but never offered or drawn.
  owned: string[];
  // Slot id to item id, only for slots that differ from their default.
  placed: Record<string, string>;
}

// What to draw for a slot right now.
export interface DecorLook {
  sprite: string;
  color?: DecorItem["color"];
  // The item's name, for the placeholder box when the art is missing.
  label: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const sameSize = (a: Rect, b: { w: number; h: number }) => a.w === b.w && a.h === b.h;

// An item fits a slot when its kind is allowed there, its sprite is the slot's
// size, and (if it names slots) this is one of them.
export const fits = (slot: DecorSlot, item: DecorItem): boolean =>
  slot.kinds.includes(item.kind) && sameSize(slot.area, item) && (!item.slots || item.slots.includes(slot.id));

// Throws, naming the problem, if the tables could not work: a repeated id, an
// id that does not start with its kind, a slot whose default is missing or does
// not fit it, an unknown family, or a name the font cannot draw.
export function validateDecorData(data: DecorData): void {
  const bad: string[] = [];
  const items = new Map<string, DecorItem>();
  for (const item of data.items) {
    if (items.has(item.id)) bad.push(`item "${item.id}" is listed twice`);
    items.set(item.id, item);
    if (!item.id.startsWith(`${item.kind}-`)) bad.push(`item "${item.id}" should start with its kind "${item.kind}-"`);
    if (!item.sprite) bad.push(`item "${item.id}" has no sprite`);
    if (!(item.w > 0 && item.h > 0)) bad.push(`item "${item.id}" has no size`);
    for (const id of item.slots ?? []) if (!data.slots.some((s) => s.id === id)) bad.push(`item "${item.id}" names the unknown slot "${id}"`);
    if (item.family && !data.families[item.family]) bad.push(`item "${item.id}" uses the unknown family "${item.family}"`);
    if (unsupportedChars(item.name).length) bad.push(`item "${item.id}" name has letters the font cannot draw`);
  }
  const seen = new Set<string>();
  for (const slot of data.slots) {
    if (seen.has(slot.id)) bad.push(`slot "${slot.id}" is listed twice`);
    seen.add(slot.id);
    if (!(slot.area.w > 0 && slot.area.h > 0)) bad.push(`slot "${slot.id}" has no size`);
    const item = items.get(slot.default);
    if (!item) bad.push(`slot "${slot.id}" has the unknown default "${slot.default}"`);
    else if (!fits(slot, item)) bad.push(`slot "${slot.id}": the default "${item.id}" does not fit (kind or size)`);
    if (unsupportedChars(slot.name).length) bad.push(`slot "${slot.id}" name has letters the font cannot draw`);
  }
  if (bad.length) throw new Error(`Decor data: ${bad.join("; ")}`);
}

export class Decor {
  // Called after what is owned or placed changes.
  onChange?: () => void;

  private readonly slots = new Map<string, DecorSlot>();
  private readonly items = new Map<string, DecorItem>();
  private owned = new Set<string>();
  private placed = new Map<string, string>();
  // An item shown in a slot only while you look at the swap list (never saved).
  private previewed: { slot: string; item: string } | null = null;

  constructor(private readonly data: DecorData = DECOR_DATA) {
    validateDecorData(data);
    for (const s of data.slots) this.slots.set(s.id, s);
    for (const i of data.items) this.items.set(i.id, i);
    this.reset(false);
  }

  // Back to today's room, nothing extra owned.
  reset(announce = true): void {
    this.owned = new Set(this.starting());
    this.placed = new Map();
    this.previewed = null;
    if (announce) this.onChange?.();
  }

  // Owned from the first run: every slot's default, and anything marked "start".
  starting(): string[] {
    return [...new Set([...this.data.slots.map((s) => s.default), ...this.data.items.filter((i) => i.how === "start").map((i) => i.id)])];
  }

  hasSlot(slotId: string): boolean {
    return this.slots.has(slotId);
  }

  slot(slotId: string): DecorSlot | undefined {
    return this.slots.get(slotId);
  }

  item(itemId: string): DecorItem | undefined {
    return this.items.get(itemId);
  }

  // The item in the slot: the one being previewed, the placed one, or the slot's
  // default. Throws for a slot that does not exist.
  itemIn(slotId: string): DecorItem {
    const slot = this.slots.get(slotId);
    if (!slot) throw new Error(`Unknown decor slot "${slotId}"`);
    const shown = this.previewed?.slot === slotId ? this.previewed.item : undefined;
    return this.items.get(shown ?? this.placed.get(slotId) ?? slot.default)!;
  }

  // The item that is really in the slot, whatever is being previewed.
  placedIn(slotId: string): DecorItem {
    const slot = this.slots.get(slotId);
    if (!slot) throw new Error(`Unknown decor slot "${slotId}"`);
    return this.items.get(this.placed.get(slotId) ?? slot.default)!;
  }

  get previewing(): boolean {
    return this.previewed !== null;
  }

  // Shows an item in a slot without placing it: only for what you could place
  // (owned and fitting). It is not saved, does not count as a change, and
  // `clearPreview` (or `place`, `reset`, `load`) puts the room back. Anything
  // else clears the preview. One preview at a time.
  preview(slotId: string, itemId: string): boolean {
    const ok = this.choices(slotId).some((i) => i.id === itemId);
    this.previewed = ok ? { slot: slotId, item: itemId } : null;
    return ok;
  }

  clearPreview(): void {
    this.previewed = null;
  }

  owns(itemId: string): boolean {
    return this.owned.has(itemId);
  }

  // Adds a known item to what you own. False if it is unknown or already owned.
  own(itemId: string): boolean {
    if (!this.items.has(itemId) || this.owned.has(itemId) || this.owned.size >= DECOR.maxOwned) return false;
    this.owned.add(itemId);
    this.onChange?.();
    return true;
  }

  // The ids of the TEST items (dev only, see decor-dev.ts).
  testItemIds(): string[] {
    return this.data.items.filter(isTestItem).map((i) => i.id);
  }

  // The items that can go in the slot: owned ones that fit, the default first.
  choices(slotId: string): DecorItem[] {
    const slot = this.slots.get(slotId);
    if (!slot) return [];
    const list = this.data.items.filter((i) => this.owned.has(i.id) && fits(slot, i));
    return [this.items.get(slot.default)!, ...list.filter((i) => i.id !== slot.default)];
  }

  // Puts an owned item that fits into the slot. False (and nothing changes) for
  // an unknown slot or item, one that does not fit, or one you do not own.
  place(slotId: string, itemId: string): boolean {
    const slot = this.slots.get(slotId);
    const item = this.items.get(itemId);
    if (!slot || !item || !fits(slot, item) || !this.owned.has(itemId)) return false;
    this.previewed = null;
    const before = this.itemIn(slotId).id;
    if (itemId === slot.default) this.placed.delete(slotId);
    else this.placed.set(slotId, itemId);
    if (before !== itemId) this.onChange?.();
    return true;
  }

  // What the slot looks like now. Items with a family follow the plant's state by
  // the family's rules: `<family>-wilted` when drooping, `<family>-<stage>` when
  // it grows, and the item's own sprite when it does neither (so a plant that
  // never grows never droops).
  look(slotId: string, state: ApartmentState): DecorLook {
    const slot = this.slots.get(slotId);
    const item = this.itemIn(slotId);
    const rules = item.family ? this.data.families[item.family] : undefined;
    const base: DecorLook = { sprite: item.sprite, color: item.color, label: item.name };
    if (!item.family || !rules) return base;
    const dry = slot?.dryVar && state.has(slot.dryVar) ? state.get(slot.dryVar) : 0;
    if (rules.droops && dry >= PLANT.droopAfterHours) return { ...base, sprite: `${item.family}-wilted`, color: "butter" };
    if (rules.stages > 0) {
      const stage = slot?.stageVar && state.has(slot.stageVar) ? Math.floor(state.get(slot.stageVar)) : 0;
      return { ...base, sprite: `${item.family}-${Math.min(Math.max(stage, 0), rules.stages - 1)}` };
    }
    return base;
  }

  // Every sprite name the items can ask for (to load them).
  spriteNames(): string[] {
    return this.data.items.flatMap((i) => itemSprites(i, this.data.families));
  }

  // Throws if a level refers to a slot that does not exist, or draws one at a
  // size that is not the slot's. A prop in a slot this store does not know is left alone.
  checkLevel(level: Level): void {
    const where = level.id ?? "level";
    const check = (what: string, slotId: string, area: Rect, mustExist: boolean) => {
      const slot = this.slots.get(slotId);
      if (!slot) {
        if (mustExist) throw new Error(`${where}: ${what} uses the unknown decor slot "${slotId}"`);
        return;
      }
      if (!sameSize(slot.area, area)) {
        throw new Error(`${where}: ${what} is ${area.w}x${area.h} but decor slot "${slotId}" is ${slot.area.w}x${slot.area.h}`);
      }
      if (slot.area.x !== area.x || slot.area.y !== area.y) {
        throw new Error(`${where}: ${what} is at ${area.x},${area.y} but decor slot "${slotId}" is at ${slot.area.x},${slot.area.y}`);
      }
    };
    for (const a of level.appearances ?? []) if (a.slot !== undefined) check(`an object`, a.slot, a.area, true);
    for (const p of level.props ?? []) check(`prop "${p.name}"`, p.slot, p.area, false);
  }

  // What is wrong with the swap tasks in a room, in words (none if all is well):
  // a slot that names its object must have its swap task on exactly that
  // object's tiles. Only for a room whose id is the slot's room. Checked by a
  // test over the real apartment (tests that strip a room's tasks are fine).
  swapProblems(level: Level): string[] {
    const bad: string[] = [];
    for (const slot of this.data.slots) {
      if (!slot.object || level.id !== slot.room) continue;
      const piece = level.pieces.find((p) => p.name === slot.object);
      if (!piece) {
        bad.push(`slot "${slot.id}" names the object "${slot.object}", which is not in the room`);
        continue;
      }
      const task = level.interactables.find((i) => i.decorSlot === slot.id);
      const tiles = new Set(piece.tiles.map((t) => `${t.col * TILE},${t.row * TILE}`));
      const zones = task?.zones.map((z) => `${z.x},${z.y}`) ?? [];
      if (!task || zones.length !== tiles.size || !zones.every((z) => tiles.has(z))) {
        bad.push(`slot "${slot.id}" needs its swap task on the "${slot.object}"`);
      }
    }
    return bad;
  }

  // Reads a saved `decor` value and replaces the store's contents with what is usable.
  load(raw: unknown): void {
    const parsed = parseDecor(raw, this.data);
    this.owned = new Set(parsed.owned);
    this.placed = new Map(Object.entries(parsed.placed));
    this.previewed = null;
    this.onChange?.();
  }

  toJSON(): DecorSave {
    return { owned: [...this.owned], placed: Object.fromEntries(this.placed) };
  }
}

// Reads a saved decor value, never throwing. Missing or wrong-shaped data gives
// today's room. Owned: only short strings, no repeats, at most DECOR.maxOwned,
// the starting items always there (ids this build lacks are kept). Placed: a
// slot is kept only if it exists, the item is known, fits it and is owned;
// anything else falls back to the slot's default.
export function parseDecor(raw: unknown, data: DecorData = DECOR_DATA): DecorSave {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const slots = new Map(data.slots.map((s) => [s.id, s]));
  const owned = new Set<string>([...data.slots.map((s) => s.default), ...data.items.filter((i) => i.how === "start").map((i) => i.id)]);
  const placed: Record<string, string> = {};
  if (!isRecord(raw)) return { owned: [...owned], placed };
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned.slice(0, DECOR.maxOwned)) {
      if (owned.size >= DECOR.maxOwned) break;
      if (typeof id === "string" && id.length > 0 && id.length <= DECOR.maxIdLength) owned.add(id);
    }
  }
  if (isRecord(raw.placed)) {
    for (const [slotId, itemId] of Object.entries(raw.placed).slice(0, DECOR.maxPlaced)) {
      const slot = slots.get(slotId);
      if (!slot || typeof itemId !== "string") continue;
      const item = items.get(itemId);
      if (!item || !fits(slot, item) || !owned.has(itemId) || itemId === slot.default) continue;
      placed[slotId] = itemId;
    }
  }
  return { owned: [...owned], placed };
}
