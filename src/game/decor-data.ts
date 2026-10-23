import type { COLOR } from "../render/colors";
import type { Rect } from "./world";

// What can be changed in the apartment and what you can put there (issue 062,
// docs/decor.md). Like state-vars.ts this is data: adding an item is a line
// here and a sprite, adding a slot is a line here and a `slot` on the object.
// Nothing here costs anything or is ever required.

export type DecorKind = "art" | "plant" | "lamp" | "prop" | "rug" | "instrument" | "plugin";

// A place that holds one item. `area` is where the item's sprite is drawn, in
// pixels from the room's top left; an item fits only if its size is the same.
export interface DecorSlot {
  id: string;
  room: string;
  // What a prompt calls it (capitals, digits and basic punctuation only: the font).
  name: string;
  area: Rect;
  kinds: DecorKind[];
  // The item shown on a fresh game, and the fallback when a saved one is gone.
  default: string;
  // For a slot that holds a growing plant: the state variables the plant's
  // stage and dryness live in (stage belongs to the slot, not the item).
  stageVar?: string;
  dryVar?: string;
}

export interface DecorItem {
  // Starts with its kind and a dash ("art-barn", "plant-snake").
  id: string;
  name: string;
  kind: DecorKind;
  // The sprite to draw. For an item with a `family` it is the name used before
  // any rules apply (and the placeholder), such as "plant-1".
  sprite: string;
  // A set of sprites chosen by rules from state: `<family>-0..` for the stage and
  // `<family>-wilted` for drooping, as the family's rules say (FAMILIES).
  family?: string;
  // If set, the item only fits these slots (even if another has its size). Today's
  // three paintings are each tied to their own wall, so that a fresh game has
  // nothing to swap until something new arrives.
  slots?: string[];
  // Pixels. Must equal the slot's area size to fit.
  w: number;
  h: number;
  // Placeholder colour while the art is missing.
  color?: keyof typeof COLOR;
  // One deadpan line for when it goes up (stage 2 on).
  note?: string;
  // Where it came from, for later. Nothing reads these in stage 1.
  how?: "start" | "gift" | "find" | "delivery" | "browse";
  tags?: string[];
}

// How a family of sprites follows the plant's state. `stages` is how many
// stage sprites there are (0 for one that never grows: it then just uses the
// item's `sprite`), `droops` is whether a long dry spell shows `<family>-wilted`.
export interface FamilyRules {
  stages: number;
  droops: boolean;
}

export const FAMILIES: Record<string, FamilyRules> = {
  // The snake plant: plant-0 to plant-3 and plant-wilted (issue 063).
  plant: { stages: 4, droops: true },
};

export const DECOR_SLOTS: DecorSlot[] = [
  { id: "art-table", room: "main", name: "ART OVER THE TABLE", area: { x: 32, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-barn" },
  { id: "art-desk", room: "main", name: "ART OVER THE DESK", area: { x: 112, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-abstract" },
  { id: "art-bed", room: "main", name: "ART OVER THE BED", area: { x: 224, y: 0, w: 48, h: 16 }, kinds: ["art"], default: "art-silkscreen" },
  { id: "plant-shelf", room: "main", name: "PLANT ON THE SHELF", area: { x: 160, y: 52, w: 16, h: 16 }, kinds: ["plant"], default: "plant-snake", stageVar: "plantStage", dryVar: "plantDry" },
  { id: "lamp-sofa", room: "main", name: "LAMP BY THE SOFA", area: { x: 128, y: 96, w: 16, h: 16 }, kinds: ["lamp"], default: "lamp-table" },
];

// Today's room, as items. These are the starting set: owned from the first run.
export const DECOR_ITEMS: DecorItem[] = [
  { id: "art-barn", name: "BARN DRAWING", kind: "art", sprite: "painting", w: 32, h: 16, color: "paper", how: "start", slots: ["art-table"] },
  { id: "art-abstract", name: "GOLD ABSTRACT", kind: "art", sprite: "painting-desk", w: 32, h: 16, color: "paper", how: "start", slots: ["art-desk"] },
  { id: "art-silkscreen", name: "SILKSCREEN", kind: "art", sprite: "painting-wide", w: 48, h: 16, color: "paper", how: "start", slots: ["art-bed"] },
  { id: "plant-snake", name: "SNAKE PLANT", kind: "plant", sprite: "plant-1", family: "plant", w: 16, h: 16, color: "leaf", how: "start" },
  { id: "lamp-table", name: "LAMP", kind: "lamp", sprite: "lamp-table", w: 16, h: 16, color: "butter", how: "start" },
];

export interface DecorData {
  slots: readonly DecorSlot[];
  items: readonly DecorItem[];
  families: Readonly<Record<string, FamilyRules>>;
}

export const DECOR_DATA: DecorData = { slots: DECOR_SLOTS, items: DECOR_ITEMS, families: FAMILIES };

// Every sprite name an item can ask for, so they are loaded before the first frame.
export function itemSprites(item: DecorItem, families: DecorData["families"] = FAMILIES): string[] {
  const rules = item.family ? families[item.family] : undefined;
  if (!item.family || !rules) return [item.sprite];
  const names = new Set<string>();
  for (let i = 0; i < rules.stages; i++) names.add(`${item.family}-${i}`);
  if (rules.droops) names.add(`${item.family}-wilted`);
  if (rules.stages === 0) names.add(item.sprite);
  return [...names];
}
