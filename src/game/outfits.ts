// What the player can wear (issues 045, 152, 156). The `outfit` state variable holds an
// index into this list; 0 is the everyday clothes, drawn from the plain
// `player-<state>-<direction>` files, and the others from
// `<prefix>-<state>-<direction>`. The variable is derived from the decor slot
// `worn` (issue 152, `outfitFromItem`); nothing else writes it.
//
// An outfit is a line of data (issue 156): an id, a name, a style and a sprite prefix. Many
// outfits may share a style. The style is only an attribute for now: nothing reads it to decide what
// is worn, offered or better, and the game never says one outfit suits a place or a time more than another.
// To add an outfit: a line here (at the END, since `outfit` saves the index), its 12 sprites
// (`<prefix>-idle-<dir>`, `<prefix>-walk-<dir>-1`, `-2` for each of four directions), and its item in decor-data.ts
// (`outfit-<id>`, the same `name`, shown by `<prefix>-idle-down`). Names stay neutral: no outfit is for one gender.
export type OutfitStyle = "home" | "casual" | "out" | "pajamas";

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
];

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
