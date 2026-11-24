import { unsupportedChars } from "../render/font";
import { DECOR, PLANT, TILE } from "./config";
import { DECOR_DATA, FROM_MAX, NOTE_MAX, TASK_NAME_MAX, isTestItem, itemSprites, type DecorData, type DecorItem, type DecorSlot } from "./decor-data";
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
  // Item ids an ad showed you and you did not take (issue 109c). Optional: left out when empty, so
  // older saves read the same. Never lists an owned item.
  seen?: string[];
}

// What to draw for a slot right now.
export interface DecorLook {
  sprite: string;
  color?: DecorItem["color"];
  // The item's name, for the placeholder box when the art is missing.
  label: string;
  // Pixels the sprite reaches above the slot's top and below its bottom (a late stage that overhangs, issue 149);
  // left out for a sprite the size of the slot.
  up?: number;
  down?: number;
}

// What putting an item in a slot changes: each slot and the item it will show,
// or why it is refused (a plain line in the font's capitals).
// `item` is null when the change empties the slot (only a slot without a default).
export type DecorPlan = { ok: true; changes: { slot: string; item: string | null }[] } | { ok: false; reason: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// One row of the browsable inventory (issue 109, docs/inventory-design.md).
export interface InventoryEntry {
  item: DecorItem;
  // Where it came from, a full line: "FROM: A PACKAGE".
  from: string;
  // Where it is now: the slot's "where" text, or "IN THE INVENTORY".
  where: string;
  // The object in the room that changes it, a full line ("CHANGE IT AT THE DINING TABLE"),
  // or none when nothing there can.
  changeAt?: string;
  // Something the game showed you in an ad and you did not take: drawn as a flat dark shape with `???`.
  // `from`, `where` and `changeAt` are empty for it, and the item's name and note are never shown.
  silhouette?: boolean;
}

const FROM_BY_HOW: Record<NonNullable<DecorItem["how"]>, string> = {
  start: "ALREADY HERE",
  gift: "A GIFT",
  find: "A FIND",
  delivery: "A DELIVERY",
  browse: "SOME BROWSING",
};

export const sameSize = (a: Rect, b: { w: number; h: number }) => a.w === b.w && a.h === b.h;

// An item fits a slot when its kind is allowed there, its sprite is the slot's
// size, and (if it names slots) this is one of them.
export const fits = (slot: DecorSlot, item: DecorItem): boolean =>
  slot.kinds.includes(item.kind) && sameSize(slot.area, item) && (!item.slots || item.slots.includes(slot.id));

// Throws, naming the problem, if the tables could not work: a repeated id, an
// id that does not start with its kind, a slot whose default is unknown or does
// not fit it (a slot may have no default: it starts empty), an unknown family, or a name the font cannot draw.
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
    if (item.taskName !== undefined && (unsupportedChars(item.taskName).length || item.taskName.length === 0 || item.taskName.length > TASK_NAME_MAX)) {
      bad.push(`item "${item.id}" taskName must be 1 to ${TASK_NAME_MAX} characters the font can draw`);
    }
    for (const [what, text, max] of [["note", item.note, NOTE_MAX], ["from", item.from, FROM_MAX]] as const) {
      if (text === undefined) continue;
      if (unsupportedChars(text).length) bad.push(`item "${item.id}" ${what} has letters the font cannot draw`);
      if (text.length === 0 || text.length > max) bad.push(`item "${item.id}" ${what} must be 1 to ${max} characters`);
    }
  }
  const seen = new Set<string>();
  for (const slot of data.slots) {
    if (seen.has(slot.id)) bad.push(`slot "${slot.id}" is listed twice`);
    seen.add(slot.id);
    if (!(slot.area.w > 0 && slot.area.h > 0)) bad.push(`slot "${slot.id}" has no size`);
    const item = slot.default === undefined ? undefined : items.get(slot.default);
    if (slot.default !== undefined && !item) bad.push(`slot "${slot.id}" has the unknown default "${slot.default}"`);
    else if (item && !fits(slot, item)) bad.push(`slot "${slot.id}": the default "${item.id}" does not fit (kind or size)`);
    if (unsupportedChars(slot.name).length) bad.push(`slot "${slot.id}" name has letters the font cannot draw`);
    if (slot.where && unsupportedChars(slot.where).length) bad.push(`slot "${slot.id}" "where" has letters the font cannot draw`);
    const other = slot.default === undefined ? undefined : data.slots.find((o) => o !== slot && o.default === slot.default);
    if (other && other.id > slot.id) bad.push(`slots "${slot.id}" and "${other.id}" have the same default "${slot.default}" (an item is shown in one place)`);
  }
  if (bad.length) throw new Error(`Decor data: ${bad.join("; ")}`);
}

export class Decor {
  // Called after what is owned or placed changes.
  onChange?: () => void;

  private readonly slots = new Map<string, DecorSlot>();
  private readonly items = new Map<string, DecorItem>();
  private owned = new Set<string>();
  // Shown in an ad and not taken, in the order seen. Never holds an owned item.
  private seen = new Set<string>();
  // Slot to item, only for slots that differ from their default (an empty slot, which has none, is absent). At most one slot shows an item.
  private placed = new Map<string, string>();
  // What the room shows while you look at the swap list (never saved): the slot
  // and the item moved into it, and (for a swap) the other slot and its new item.
  private previewed: Map<string, string | null> | null = null;

  constructor(private readonly data: DecorData = DECOR_DATA) {
    validateDecorData(data);
    for (const s of data.slots) this.slots.set(s.id, s);
    for (const i of data.items) this.items.set(i.id, i);
    this.reset(false);
  }

  // Back to today's room, nothing extra owned.
  reset(announce = true): void {
    this.owned = new Set(this.starting());
    this.seen = new Set();
    this.placed = new Map();
    this.previewed = null;
    if (announce) this.onChange?.();
  }

  // Owned from the first run: every slot's default, and anything marked "start".
  starting(): string[] {
    return [...new Set([...this.data.slots.flatMap((s) => (s.default === undefined ? [] : [s.default])), ...this.data.items.filter((i) => i.how === "start").map((i) => i.id)])];
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

  // The item the slot holds: what is placed, or the slot's default; undefined for an empty slot.
  private heldBy(slotId: string): string | undefined {
    return this.placed.get(slotId) ?? this.slots.get(slotId)!.default;
  }

  // Whether the slot can hold nothing: it has no default (issue 151).
  canBeEmpty(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    return !!slot && slot.default === undefined;
  }

  // The item in the slot as the room shows it: the one being previewed, the
  // placed one, or the slot's default; undefined when it shows nothing. Throws for a slot that does not exist.
  shownIn(slotId: string): DecorItem | undefined {
    if (!this.slots.has(slotId)) throw new Error(`Unknown decor slot "${slotId}"`);
    const id = this.previewed?.has(slotId) ? (this.previewed.get(slotId) ?? undefined) : this.heldBy(slotId);
    return id === undefined ? undefined : this.items.get(id);
  }

  // `shownIn` for a slot that always shows something (one with a default); throws for an empty slot.
  itemIn(slotId: string): DecorItem {
    const item = this.shownIn(slotId);
    if (!item) throw new Error(`Decor slot "${slotId}" is empty (use shownIn)`);
    return item;
  }

  // Whether the item really in the slot is a live one (a family that grows or droops, like the
  // snake plant) and so offers watering. Dried flowers and other still items are not (issue 105).
  isLive(slotId: string): boolean {
    const family = this.heldIn(slotId)?.family;
    const rules = family ? this.data.families[family] : undefined;
    return !!rules && (rules.stages > 0 || rules.droops);
  }

  // The state variables of slots that hold something that is not live: they stand still (issue 105),
  // so the live plant's stage, growth and dryness are as it left them when it comes back.
  frozenVars(): Set<string> {
    const ids = new Set<string>();
    for (const s of this.data.slots) {
      if (this.isLive(s.id)) continue;
      for (const v of [s.stageVar, s.growthVar, s.dryVar]) if (v) ids.add(v);
    }
    return ids;
  }

  // The item that is really in the slot, whatever is being previewed; undefined for an empty slot.
  heldIn(slotId: string): DecorItem | undefined {
    if (!this.slots.has(slotId)) throw new Error(`Unknown decor slot "${slotId}"`);
    const id = this.heldBy(slotId);
    return id === undefined ? undefined : this.items.get(id);
  }

  // `heldIn` for a slot that always holds something (one with a default); throws for an empty slot.
  placedIn(slotId: string): DecorItem {
    const item = this.heldIn(slotId);
    if (!item) throw new Error(`Decor slot "${slotId}" is empty (use heldIn)`);
    return item;
  }

  // The slot that really shows the item, if any (never the preview).
  displayedAt(itemId: string): DecorSlot | undefined {
    return this.data.slots.find((s) => this.heldBy(s.id) === itemId);
  }

  // The inventory: known items you own that no slot shows.
  inventory(): DecorItem[] {
    return this.data.items.filter((i) => this.owned.has(i.id) && !this.displayedAt(i.id));
  }

  // Everything you own for the browsable inventory, in the order you got it (starting items
  // first). Pure: reads only what is owned and shown. Items this build does not know and the
  // TEST items are left out. There is no count anywhere on purpose (docs/decor.md, collecting).
  entries(): InventoryEntry[] {
    const out: InventoryEntry[] = [];
    for (const id of this.owned) {
      const item = this.items.get(id);
      if (!item || isTestItem(item)) continue;
      const slot = this.displayedAt(id);
      const objects = (slot ? [slot] : this.data.slots.filter((s) => fits(s, item)))
        .map((s) => s.object)
        .filter((o, i, all): o is string => o !== undefined && all.indexOf(o) === i);
      out.push({
        item,
        from: `FROM: ${item.from ?? (item.how ? FROM_BY_HOW[item.how] : "SOMEWHERE")}`,
        where: slot ? (slot.where ?? slot.name) : "IN THE INVENTORY",
        changeAt: objects.length ? `CHANGE IT AT ${objects.map((o) => `THE ${o.toUpperCase()}`).join(" OR ")}` : undefined,
      });
    }
    // Then what an ad showed you and you did not take, in the order you saw it: no name, no hint.
    for (const id of this.seen) {
      const item = this.items.get(id);
      if (!item || isTestItem(item) || this.owned.has(id)) continue;
      out.push({ item, from: "", where: "", silhouette: true });
    }
    return out;
  }

  // An ad showed you this item and you did not take it. False (and nothing saved) if it is unknown,
  // owned, a TEST item or already seen.
  markSeen(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item || isTestItem(item) || this.owned.has(itemId) || this.seen.has(itemId) || this.seen.size >= DECOR.maxSeen) return false;
    this.seen.add(itemId);
    this.onChange?.();
    return true;
  }

  hasSeen(itemId: string): boolean {
    return this.seen.has(itemId);
  }

  get previewing(): boolean {
    return this.previewed !== null;
  }

  // What putting an item in a slot would do (issue 073). An item is shown in one
  // place: from the inventory it replaces what is there (which goes to the
  // inventory); one shown in another slot swaps with what this slot shows, and is
  // refused, with the reason, if that item does not fit the other slot. `null` is NOTHING: it
  // empties a slot that has no default (the item goes to the inventory), and is refused for one that has.
  // An item moving into an empty slot from one that must hold something is refused too.
  plan(slotId: string, itemId: string | null): DecorPlan {
    const slot = this.slots.get(slotId);
    if (!slot) return { ok: false, reason: "YOU DO NOT HAVE THAT" };
    const now = this.heldBy(slotId);
    if (itemId === null) {
      if (!this.canBeEmpty(slotId)) return { ok: false, reason: `${slot.where ?? slot.name} CANNOT BE EMPTY` };
      return { ok: true, changes: now === undefined ? [] : [{ slot: slotId, item: null }] };
    }
    const item = this.items.get(itemId);
    if (!item || !this.owned.has(itemId)) return { ok: false, reason: "YOU DO NOT HAVE THAT" };
    if (!fits(slot, item)) return { ok: false, reason: `${item.name} DOES NOT FIT ${slot.where ?? slot.name}` };
    if (now === itemId) return { ok: true, changes: [] };
    const from = this.displayedAt(itemId);
    if (!from) return { ok: true, changes: [{ slot: slotId, item: itemId }] };
    if (now === undefined) {
      if (!this.canBeEmpty(from.id)) return { ok: false, reason: `${from.where ?? from.name} CANNOT BE EMPTY` };
      return { ok: true, changes: [{ slot: slotId, item: itemId }, { slot: from.id, item: null }] };
    }
    const current = this.items.get(now)!;
    if (!fits(from, current)) return { ok: false, reason: `${current.name} DOES NOT FIT ${from.where ?? from.name}` };
    return { ok: true, changes: [{ slot: slotId, item: itemId }, { slot: from.id, item: now }] };
  }

  // Shows what `place` would do without doing it: for what you could place
  // (owned, fitting, and not refused). It is not saved, does not count as a
  // change, and `clearPreview` (or `place`, `reset`, `load`) puts the room back.
  // Anything else clears the preview. One preview at a time.
  preview(slotId: string, itemId: string | null): boolean {
    const plan = this.plan(slotId, itemId);
    this.previewed = plan.ok ? new Map(plan.changes.map((c) => [c.slot, c.item])) : null;
    return plan.ok;
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
    // If it was a silhouette, it simply becomes the item.
    this.seen.delete(itemId);
    this.onChange?.();
    return true;
  }

  // The ids of the TEST items (dev only, see decor-dev.ts).
  testItemIds(): string[] {
    return this.data.items.filter(isTestItem).map((i) => i.id);
  }

  // The items that can go in the slot: owned ones that fit, in table order. Some
  // may be shown elsewhere or refused (ask `plan`).
  choices(slotId: string): DecorItem[] {
    const slot = this.slots.get(slotId);
    if (!slot) return [];
    return this.data.items.filter((i) => this.owned.has(i.id) && fits(slot, i));
  }

  // Whether the slot has something to change to: an owned item that fits it and
  // is in the inventory (not shown anywhere), or an emptiable slot that shows something (so it
  // can be cleared again). The swap task is only offered then,
  // so a fresh game, where every owned item is on show, has no new prompts. (Once
  // the list is open it also shows items displayed elsewhere, which swap.)
  canChange(slotId: string): boolean {
    return this.choices(slotId).some((i) => !this.displayedAt(i.id)) || (this.canBeEmpty(slotId) && this.heldBy(slotId) !== undefined);
  }

  // Puts an owned item that fits into the slot, by `plan` (`null` empties an emptiable slot). False (and nothing
  // changes) for an unknown slot or item, one you do not own, one that does not
  // fit, or a swap the other slot refuses.
  place(slotId: string, itemId: string | null): boolean {
    const plan = this.plan(slotId, itemId);
    this.previewed = null;
    if (!plan.ok) return false;
    for (const c of plan.changes) {
      if ((c.item ?? undefined) === this.slots.get(c.slot)!.default) this.placed.delete(c.slot);
      else this.placed.set(c.slot, c.item!);
    }
    if (plan.changes.length) this.onChange?.();
    return true;
  }

  // What the slot looks like now. Items with a family follow the plant's state by
  // the family's rules: `<family>-wilted` when drooping, `<family>-<stage>` when
  // it grows, and the item's own sprite when it does neither (so a plant that
  // never grows never droops). Null for an empty slot: nothing is drawn.
  lookAt(slotId: string, state: ApartmentState): DecorLook | null {
    return this.shownIn(slotId) ? this.look(slotId, state) : null;
  }

  // `lookAt` for a slot that always shows something; throws for an empty slot.
  look(slotId: string, state: ApartmentState): DecorLook {
    const slot = this.slots.get(slotId);
    const item = this.itemIn(slotId);
    const rules = item.family ? this.data.families[item.family] : undefined;
    const base: DecorLook = { sprite: item.sprite, color: item.color, label: item.name };
    if (!item.family || !rules) return base;
    const dry = slot?.dryVar && state.has(slot.dryVar) ? state.get(slot.dryVar) : 0;
    const raw = slot?.stageVar && state.has(slot.stageVar) ? Math.floor(state.get(slot.stageVar)) : 0;
    // A stage above the family's last (a hand-edited save) shows the last one.
    const stage = Math.min(Math.max(raw, 0), Math.max(rules.stages - 1, 0));
    const over = rules.stages > 0 ? rules.overhang?.[stage] : undefined;
    const reach = over ? { ...(over.up && { up: over.up }), ...(over.down && { down: over.down }) } : {};
    if (rules.droops && dry >= PLANT.droopAfterHours) {
      return { ...base, sprite: over ? `${item.family}-wilted-${stage}` : `${item.family}-wilted`, color: "butter", ...reach };
    }
    if (rules.stages > 0) return { ...base, sprite: `${item.family}-${stage}`, ...reach };
    return base;
  }

  // The name a task shows (issue 149, Interactable.itemWord): the task's own `name`, with its `itemWord` replaced by
  // the `taskName` of the item that is really in its `liveSlot`. The plain name when there is no such word or item name.
  taskName(task: { name: string; itemWord?: string; liveSlot?: string }): string {
    if (!task.itemWord || !task.liveSlot) return task.name;
    const word = this.heldIn(task.liveSlot)?.taskName;
    if (!word) return task.name;
    const at = task.name.lastIndexOf(task.itemWord);
    return at < 0 ? task.name : task.name.slice(0, at) + word + task.name.slice(at + task.itemWord.length);
  }

  // The growth rules of the plant in the slot: the last stage it can reach and the waterings for each step.
  // The snake plant's (PLANT) when the item has no family or no stages (nothing is growing then anyway).
  growth(slotId: string): { lastStage: number; wateringsToGrow: number[] } {
    const family = this.heldIn(slotId)?.family;
    const rules = family ? this.data.families[family] : undefined;
    if (!rules || rules.stages < 1) return { lastStage: PLANT.lastStage, wateringsToGrow: PLANT.wateringsToGrow };
    return { lastStage: rules.stages - 1, wateringsToGrow: rules.wateringsToGrow ?? PLANT.wateringsToGrow };
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
    this.seen = new Set(parsed.seen ?? []);
    this.placed = new Map(Object.entries(parsed.placed));
    this.previewed = null;
    this.onChange?.();
  }

  toJSON(): DecorSave {
    const save: DecorSave = { owned: [...this.owned], placed: Object.fromEntries(this.placed) };
    if (this.seen.size > 0) save.seen = [...this.seen];
    return save;
  }
}

// Reads a saved decor value, never throwing. Missing or wrong-shaped data gives
// today's room. Owned: only short strings, no repeats, at most DECOR.maxOwned,
// the starting items always there (ids this build lacks are kept). Placed: an
// item is shown in one place (issue 073), so older saves that placed one item in
// two slots are repaired in a fixed order, the order of the slots table: a
// placement is kept if the slot exists, the item is known, fits it, is owned and
// is not already shown by an earlier slot. A slot left without one shows its
// default if that is free, else the first free owned item that fits it (the
// rest of the items are in the inventory). If even that fails, every slot shows
// its default.
export function parseDecor(raw: unknown, data: DecorData = DECOR_DATA): DecorSave {
  const items = new Map(data.items.map((i) => [i.id, i]));
  const owned = new Set<string>([...data.slots.flatMap((s) => (s.default === undefined ? [] : [s.default])), ...data.items.filter((i) => i.how === "start").map((i) => i.id)]);
  if (isRecord(raw) && Array.isArray(raw.owned)) {
    for (const id of raw.owned.slice(0, DECOR.maxOwned)) {
      if (owned.size >= DECOR.maxOwned) break;
      if (typeof id === "string" && id.length > 0 && id.length <= DECOR.maxIdLength) owned.add(id);
    }
  }
  const asked = new Map<string, unknown>(isRecord(raw) && isRecord(raw.placed) ? Object.entries(raw.placed).slice(0, DECOR.maxPlaced) : []);
  const shows = new Map<string, string>();
  const used = new Set<string>();
  for (const slot of data.slots) {
    const id = asked.get(slot.id);
    const item = typeof id === "string" ? items.get(id) : undefined;
    if (!item || !fits(slot, item) || !owned.has(item.id) || used.has(item.id)) continue;
    shows.set(slot.id, item.id);
    used.add(item.id);
  }
  let complete = true;
  for (const slot of data.slots) {
    if (shows.has(slot.id)) continue;
    // A slot without a default is simply empty when nothing valid was placed in it.
    if (slot.default === undefined) continue;
    const pick = !used.has(slot.default) ? slot.default : data.items.find((i) => owned.has(i.id) && !used.has(i.id) && fits(slot, i))?.id;
    if (pick === undefined) complete = false;
    else {
      shows.set(slot.id, pick);
      used.add(pick);
    }
  }
  const placed: Record<string, string> = {};
  if (complete) for (const slot of data.slots) {
    const shown = shows.get(slot.id);
    if (shown !== undefined && shown !== slot.default) placed[slot.id] = shown;
  }
  // Seen: short strings, no repeats, at most DECOR.maxSeen, never an owned id (read last, so it is
  // judged against the owned list as repaired above).
  const seen: string[] = [];
  if (isRecord(raw) && Array.isArray(raw.seen)) {
    for (const id of raw.seen.slice(0, DECOR.maxSeen * 2)) {
      if (seen.length >= DECOR.maxSeen) break;
      if (typeof id === "string" && id.length > 0 && id.length <= DECOR.maxIdLength && !owned.has(id) && !seen.includes(id)) seen.push(id);
    }
  }
  return seen.length > 0 ? { owned: [...owned], placed, seen } : { owned: [...owned], placed };
}
