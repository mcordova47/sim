// What the player can wear (issue 045). The `outfit` state variable holds an
// index into this list; 0 is the everyday clothes, drawn from the plain
// `player-<state>-<direction>` files, and the others from
// `player-<id>-<state>-<direction>`. The variable is derived from the decor slot
// `worn` (issue 152, `outfitFromItem`); nothing else writes it.
export const OUTFITS = [
  { id: "home", prefix: "player" },
  { id: "casual", prefix: "player-casual" },
  { id: "out", prefix: "player-out" },
  { id: "pajamas", prefix: "player-pajamas" },
] as const;

export const HOME_PREFIX = OUTFITS[0].prefix;

// The file-name prefix for an outfit number; anything unknown is home.
export function outfitPrefix(outfit: number): string {
  return (OUTFITS[Math.round(outfit)] ?? OUTFITS[0]).prefix;
}

// The `outfit` number for the item in the `worn` slot (`outfit-<id>`); anything unknown is home.
export function outfitFromItem(itemId: string | undefined): number {
  const i = OUTFITS.findIndex((o) => `outfit-${o.id}` === itemId);
  return i < 0 ? 0 : i;
}
