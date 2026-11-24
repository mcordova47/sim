// What the player can wear (issues 045, 152, 156). The `outfit` state variable holds an
// index into this list; 0 is the everyday clothes, drawn from the plain
// `player-<state>-<direction>` files, and the others from
// `<prefix>-<state>-<direction>`. The variable is derived from the decor slot
// `worn` (issue 152, `outfitFromItem`); nothing else writes it.
//
// An outfit is a line of data (issue 156): an id, a name, a style and a sprite prefix. Many
// outfits may share a style. Since issue 175 the style decides which outfit slot (below) the outfit can be
// equipped in; nothing ranks outfits, and the game never says one suits a place or a time more than another.
// To add an outfit: a line here (at the END, since `outfit` saves the index), its 12 sprites
// (`<prefix>-idle-<dir>`, `<prefix>-walk-<dir>-1`, `-2` for each of four directions), and its item in decor-data.ts
// (`outfit-<id>`, the same `name`, shown by `<prefix>-idle-down`), and the doing poses are dressed for it by the same
// generator (issue 150): add the outfit to art/outfits.json and run `npm run sprites`; a test fails if a pose has no sprite for it. Names stay neutral: no outfit is for one gender.
export type OutfitStyle = "home" | "casual" | "out" | "pajamas" | "robe";

export interface OutfitDef {
  id: string;
  name: string;
  style: OutfitStyle;
  prefix: string;
}

// The four outfits of issues 045 and 152 keep their places, so a saved `outfit` number means what it did.
export const OUTFITS: readonly OutfitDef[] = [
  { id: "home", name: "EVERYDAY CLOTHES", style: "home", prefix: "player" },
  { id: "casual", name: "CASUAL CLOTHES", style: "casual", prefix: "player-casual" },
  { id: "out", name: "GOING OUT CLOTHES", style: "out", prefix: "player-out" },
  { id: "pajamas", name: "PAJAMAS", style: "pajamas", prefix: "player-pajamas" },
  // Issue 158: the first generated outfit (art/outfits.json, scripts/outfits.mjs).
  { id: "casual-cardigan", name: "CARDIGAN AND TEE", style: "casual", prefix: "player-casual-cardigan" },
  // Issue 159: the chosen outfits, generated from art/outfits.json (the robe has hem rows over the legs).
  { id: "casual-hoodie", name: "GREY HOODIE", style: "casual", prefix: "player-casual-hoodie" },
  { id: "casual-denim-jacket", name: "DENIM JACKET AND TEE", style: "casual", prefix: "player-casual-denim-jacket" },
  { id: "out-jacket-scarf", name: "JACKET AND SCARF", style: "out", prefix: "player-out-jacket-scarf" },
  { id: "out-button-up", name: "BUTTON-UP SHIRT", style: "out", prefix: "player-out-button-up" },
  { id: "out-blazer", name: "BLAZER AND TEE", style: "out", prefix: "player-out-blazer" },
  { id: "out-peacoat", name: "PEACOAT", style: "out", prefix: "player-out-peacoat" },
  { id: "pajamas-striped", name: "STRIPED PAJAMAS", style: "pajamas", prefix: "player-pajamas-striped" },
  { id: "pajamas-robe", name: "BATHROBE", style: "robe", prefix: "player-pajamas-robe" },
];

// Outfit slots (issue 175, docs/outfit-slots-design.md): a preference list over the worn outfit. Each slot takes
// only outfits of its own styles, so every style belongs to exactly one slot (a test checks it). `note` is the line
// the clothes list shows for the slot; `empty` is the line when nothing is equipped there.
export type OutfitSlotId = "everyday" | "pajamas" | "robe" | "out";
export interface OutfitSlotDef {
  id: OutfitSlotId;
  name: string;
  styles: readonly OutfitStyle[];
  note: string;
  empty: string;
}
export const OUTFIT_SLOTS: readonly OutfitSlotDef[] = [
  { id: "everyday", name: "EVERYDAY", styles: ["home", "casual"], note: "WHAT YOU WEAR BY DAY", empty: "EMPTY: EVERYDAY CLOTHES" },
  { id: "pajamas", name: "PAJAMAS", styles: ["pajamas"], note: "YOU WAKE UP IN THESE", empty: "EMPTY: EVERYDAY CLOTHES" },
  { id: "robe", name: "ROBE", styles: ["robe"], note: "WHAT YOU WEAR AFTER A SHOWER", empty: "EMPTY: EVERYDAY CLOTHES" },
  { id: "out", name: "GOING OUT", styles: ["out"], note: "NOTHING PUTS THESE ON: BY HAND", empty: "EMPTY: EVERYDAY CLOTHES" },
];
export const SLOT_STYLES: Record<OutfitSlotId, readonly OutfitStyle[]> = Object.fromEntries(OUTFIT_SLOTS.map((s) => [s.id, s.styles])) as Record<OutfitSlotId, readonly OutfitStyle[]>;
export const isOutfitSlot = (id: unknown): id is OutfitSlotId => typeof id === "string" && OUTFIT_SLOTS.some((s) => s.id === id);

// The outfit an item id names, if any.
export const outfitByItem = (itemId: string | undefined, list: readonly OutfitDef[] = OUTFITS): OutfitDef | undefined => list.find((o) => outfitItemId(o) === itemId);

// Whether the item is an outfit the slot takes (by style).
export const slotTakes = (slot: OutfitSlotId, itemId: string | undefined, list: readonly OutfitDef[] = OUTFITS): boolean => {
  const o = outfitByItem(itemId, list);
  return !!o && SLOT_STYLES[slot].includes(o.style);
};

// The slot an outfit item belongs to (by its style); undefined for something that is not an outfit.
export const slotOfItem = (itemId: string | undefined, list: readonly OutfitDef[] = OUTFITS): OutfitSlotId | undefined => {
  const o = outfitByItem(itemId, list);
  return o && OUTFIT_SLOTS.find((s) => s.styles.includes(o.style))?.id;
};

export const HOME_PREFIX = OUTFITS[0].prefix;

// The item id for an outfit (`outfit-<id>`).
export const outfitItemId = (o: OutfitDef): string => `outfit-${o.id}`;

// The file-name prefix for an outfit number; anything unknown is home.
export function outfitPrefix(outfit: number, list: readonly OutfitDef[] = OUTFITS): string {
  return (list[Math.round(outfit)] ?? list[0]).prefix;
}

// The `outfit` number for the item in the `worn` slot (`outfit-<id>`); anything unknown is home.
export function outfitFromItem(itemId: string | undefined, list: readonly OutfitDef[] = OUTFITS): number {
  const i = list.findIndex((o) => outfitItemId(o) === itemId);
  return i < 0 ? 0 : i;
}

// The style of an outfit number (home for anything unknown). Only an attribute: nothing depends on it yet.
export function outfitStyle(outfit: number, list: readonly OutfitDef[] = OUTFITS): OutfitStyle {
  return (list[Math.round(outfit)] ?? list[0]).style;
}

// The sprite of a doing pose (issue 150) for an outfit: the pose's everyday-clothes sprite with its leading
// `player` swapped for the outfit's prefix (`player-sit-sofa` -> `player-casual-hoodie-sit-sofa`). They are
// generated from art/outfits.json with the walk sprites. Everyday clothes, and a pose that shows no clothes,
// keep the base sprite; so does a missing file (`has` says whether it exists).
export function outfitPoseSprite(base: string, prefix: string, has: (name: string) => boolean = () => true): string {
  if (prefix === HOME_PREFIX || !base.startsWith(HOME_PREFIX)) return base;
  const name = `${prefix}${base.slice(HOME_PREFIX.length)}`;
  return has(name) ? name : base;
}
