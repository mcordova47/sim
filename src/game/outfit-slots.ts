import { DECOR } from "./config";
import { OUTFITS, OUTFIT_SLOTS, isOutfitSlot, outfitItemId, slotTakes, type OutfitDef, type OutfitSlotId } from "./outfits";

// Outfit slots as pure functions over plain data (issue 175, docs/outfit-slots-design.md). The store is in
// decor.ts (`Decor.equipped`); what you wear is still the decor slot `worn`, and these only decide what goes where.

// Which outfit item is equipped in each slot. A slot may be missing (nothing equipped there).
export type Equipped = Partial<Record<OutfitSlotId, string>>;

// The item that ends up worn for a slot: what is equipped there, else the EVERYDAY slot's outfit, else the
// starting clothes (an empty slot falls back to everyday, issue 164 d4).
export function resolveSlot(equipped: Equipped, slot: OutfitSlotId, list: readonly OutfitDef[] = OUTFITS): string {
  return equipped[slot] ?? equipped.everyday ?? outfitItemId(list[0]);
}

// The owned outfit items a slot takes, in OUTFITS order.
export function slotChoices(slot: OutfitSlotId, owned: ReadonlySet<string>, list: readonly OutfitDef[] = OUTFITS): string[] {
  return list.filter((o) => owned.has(outfitItemId(o)) && slotTakes(slot, outfitItemId(o), list)).map(outfitItemId);
}

// Fills each empty slot with the first owned outfit it takes; never replaces anything. Returns whether it changed.
export function autoFill(equipped: Equipped, owned: ReadonlySet<string>, list: readonly OutfitDef[] = OUTFITS): boolean {
  let changed = false;
  for (const s of OUTFIT_SLOTS) {
    if (equipped[s.id] !== undefined) continue;
    const first = slotChoices(s.id, owned, list)[0];
    if (first !== undefined) {
      equipped[s.id] = first;
      changed = true;
    }
  }
  return changed;
}

// Reads a saved `equipped` value and keeps what is usable: known slot ids only, and an item that is owned, an
// outfit and of a style the slot takes. Never throws.
export function parseEquipped(raw: unknown, owned: ReadonlySet<string>, list: readonly OutfitDef[] = OUTFITS): Equipped {
  const out: Equipped = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [slot, id] of Object.entries(raw)) {
    if (!isOutfitSlot(slot) || typeof id !== "string" || id.length > DECOR.maxIdLength) continue;
    if (owned.has(id) && slotTakes(slot, id, list)) out[slot] = id;
  }
  return out;
}
