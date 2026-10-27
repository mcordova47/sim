import type { COLOR } from "../render/colors";
import type { Rect } from "./world";

// What can be changed in the apartment and what you can put there (issue 062,
// docs/decor.md). Like state-vars.ts this is data: adding an item is a line
// here and a sprite, adding a slot is a line here and a `slot` on the object.
// Nothing here costs anything or is ever required.

export type DecorKind = "art" | "plant" | "lamp" | "prop" | "rug" | "instrument" | "plugin" | "pantry";

// A place that holds one item. `area` is where the item's sprite is drawn, in
// pixels from the room's top left; an item fits only if its size is the same.
export interface DecorSlot {
  id: string;
  room: string;
  // What a prompt calls it (capitals, digits and basic punctuation only: the font).
  name: string;
  // Where an item shown here is, in the swap list's small text ("ON THE DESK WALL"). Falls back to `name`.
  where?: string;
  area: Rect;
  kinds: DecorKind[];
  // The item shown on a fresh game, and the fallback when a saved one is gone.
  default: string;
  // For a slot that holds a growing plant: the state variables the plant's
  // stage and dryness live in (stage belongs to the slot, not the item).
  stageVar?: string;
  dryVar?: string;
  // The variable counting waterings toward the next stage. A swapped-in plant
  // starts small, so the swap puts the stage, this and the dry count back to 0.
  growthVar?: string;
  // The map piece you stand at to change it (its name in the room's legend). The
  // swap task (`swap-<slot id>`, issue 062 stage 2) is offered there, only when
  // there is something else to put in the slot. Checked against the room at startup.
  object?: string;
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
  // If set, the item only fits these slots (even if another has its size). The
  // barn drawing and the gold abstract fit the table and the desk wall (issue 073,
  // so they can trade places); the silkscreen is wider and fits only the bed wall.
  slots?: string[];
  // Pixels. Must equal the slot's area size to fit.
  w: number;
  h: number;
  // Placeholder colour while the art is missing.
  color?: keyof typeof COLOR;
  // The night glow this item gives (issue 069): `radius` in pixels and `alpha`
  // (the strength at full night), as the time-of-day light draws it (config.ts
  // TIME_OF_DAY.glows has the same two numbers for things that are not decor).
  // An item without `glow` gives no light, whatever its sprite or slot.
  glow?: { radius: number; alpha: number };
  // One deadpan line for when it goes up (stage 2 on).
  note?: string;
  // Where it came from, for later. Nothing reads these.
  how?: "start" | "gift" | "find" | "delivery" | "browse";
  // "test" marks an item that only exists so the swap can be tried before there
  // is a way to get anything (stage 2). Stage 4 removes them; `?own=` is the only way to get one.
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
  // TEST: a plant that never grows or droops (like dried flowers will), drawn with its own sprite.
  "plant-test": { stages: 0, droops: false },
};

export const DECOR_SLOTS: DecorSlot[] = [
  { id: "art-table", where: "ON THE TABLE WALL", room: "main", name: "ART OVER THE TABLE", area: { x: 32, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-barn", object: "dining table" },
  { id: "art-desk", where: "ON THE DESK WALL", room: "main", name: "ART OVER THE DESK", area: { x: 112, y: 0, w: 32, h: 16 }, kinds: ["art"], default: "art-abstract", object: "standing desk" },
  { id: "art-bed", where: "ON THE BED WALL", room: "main", name: "ART OVER THE BED", area: { x: 224, y: 0, w: 48, h: 16 }, kinds: ["art"], default: "art-silkscreen", object: "nightstand" },
  { id: "plant-shelf", where: "ON THE SHELF", room: "main", name: "PLANT ON THE SHELF", area: { x: 160, y: 52, w: 16, h: 16 }, kinds: ["plant"], default: "plant-snake", stageVar: "plantStage", dryVar: "plantDry", growthVar: "plantGrowth", object: "cube bookshelf" },
  { id: "lamp-sofa", where: "BY THE SOFA", room: "main", name: "LAMP BY THE SOFA", area: { x: 128, y: 96, w: 16, h: 16 }, kinds: ["lamp"], default: "lamp-table", object: "lamp table" },
  // The pantry in the kitchen (issue 072): a 16x32 stack of bins down the east wall. Nothing to swap yet (no `object`, one item); stage 4 can add upgrade items.
  { id: "pantry", where: "IN THE PANTRY", room: "kitchen", name: "PANTRY", area: { x: 176, y: 16, w: 16, h: 32 }, kinds: ["pantry"], default: "pantry-bins" },
];

// Today's room, as items. These are the starting set: owned from the first run.
export const DECOR_ITEMS: DecorItem[] = [
  { id: "art-barn", name: "BARN DRAWING", kind: "art", sprite: "painting", w: 32, h: 16, color: "paper", how: "start", slots: ["art-table", "art-desk"] },
  { id: "art-abstract", name: "GOLD ABSTRACT", kind: "art", sprite: "painting-desk", w: 32, h: 16, color: "paper", how: "start", slots: ["art-table", "art-desk"] },
  { id: "art-silkscreen", name: "SILKSCREEN", kind: "art", sprite: "painting-wide", w: 48, h: 16, color: "paper", how: "start", slots: ["art-bed"] },
  { id: "plant-snake", name: "SNAKE PLANT", kind: "plant", sprite: "plant-1", family: "plant", w: 16, h: 16, color: "leaf", how: "start" },
  { id: "lamp-table", name: "LAMP", kind: "lamp", sprite: "lamp-table", w: 16, h: 16, color: "butter", how: "start", glow: { radius: 40, alpha: 0.2 } },
  { id: "pantry-bins", name: "CLEAR BINS", kind: "pantry", sprite: "pantry", w: 16, h: 32, color: "mist", how: "start" },
];

// TEST items (issue 062 stage 2): borrowed sprites, so the swap can be tried and
// reviewed before gifts and finds (stage 3) or new art (stage 4) exist. They are
// not owned by anyone; `?own=test` in the dev server gives them all. Every id
// starts with "-test-" and every name with "TEST" so they cannot be mistaken
// for real items. Stage 4 deletes this list.
export const TEST_ITEMS: DecorItem[] = [
  { id: "art-test-desk", name: "TEST GOLD ABSTRACT", kind: "art", sprite: "painting-desk", w: 32, h: 16, color: "paper", tags: ["test"] },
  { id: "art-test-barn", name: "TEST BARN DRAWING", kind: "art", sprite: "painting", w: 32, h: 16, color: "paper", tags: ["test"] },
  { id: "plant-test-grown", name: "TEST GROWN PLANT", kind: "plant", sprite: "plant-3", family: "plant-test", w: 16, h: 16, color: "leaf", tags: ["test"] },
  // The bare stool gives no light; the same stool with a small lamp on it does (issue 069).
  { id: "lamp-test-stool", name: "TEST STOOL", kind: "lamp", sprite: "stool", w: 16, h: 16, color: "butter", tags: ["test"] },
  { id: "lamp-test-stool-lamp", name: "TEST STOOL AND LAMP", kind: "lamp", sprite: "stool-lamp", w: 16, h: 16, color: "butter", tags: ["test"], glow: { radius: 24, alpha: 0.2 } },
];

export const isTestItem = (item: DecorItem): boolean => item.tags?.includes("test") === true;

export interface DecorData {
  slots: readonly DecorSlot[];
  items: readonly DecorItem[];
  families: Readonly<Record<string, FamilyRules>>;
}

export const DECOR_DATA: DecorData = { slots: DECOR_SLOTS, items: [...DECOR_ITEMS, ...TEST_ITEMS], families: FAMILIES };

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
