import { ENCOUNTERS } from "./config";
import type { DecorItem } from "./decor-data";
import { isTestItem } from "./decor-data";
import type { Ad } from "./encounter-ads";
import { ladderOrder } from "./encounter-ladder";
import { LINES, lineAd, type ProductLine } from "./encounter-lines";

// Which ad an encounter shows (issue 163, docs/random-encounters.md section 6; the window and the repeats, issue 183,
// section 16): a pure, seeded draw. Nothing here owns anything or changes anything: the item pool, what is owned or
// ordered, the recent ads and the random function come in as arguments, so it tests without a game.

// What the draw needs to know about an item.
export interface PoolItem {
  id: string;
  name: string;
  kind: string;
}

// The pool: every real item of a kind an ad can sell that is not a starting item and not a TEST item (the
// checkpoint gifts and every later item) and not an empty pot, vase or bowl (the `empty` flag of issue 182: never
// obtainable), in data order. A new item of such a kind joins by existing (and is put in the ladder, which a test insists on).
const isEmptyItem = (item: DecorItem): boolean => (item as { empty?: boolean }).empty === true;
export function itemPool(items: readonly DecorItem[], kinds: readonly string[] = ENCOUNTERS.pool.kinds): PoolItem[] {
  return items.filter((i) => i.how !== "start" && !isTestItem(i) && !isEmptyItem(i) && kinds.includes(i.kind)).map(({ id, name, kind }) => ({ id, name, kind }));
}

// What the draw sees of the world: the pool, and whether an item is already yours or on its way.
export interface ItemPool {
  items: readonly PoolItem[];
  // Owned, queued or waiting at the door: it cannot be delivered, so an ad for it is a repeat.
  has(itemId: string): boolean;
}

// The items a line could sell now: the pool's items of its kinds, minus any the caller says have no art.
export const lineItems = (line: ProductLine, pool: ItemPool, drawable: (item: PoolItem) => boolean = () => true): PoolItem[] =>
  pool.items.filter((i) => line.kinds.includes(i.kind) && drawable(i));

export interface DrawInput {
  // The fixed ads (one item each), and the lines (a kind each).
  ads: readonly Ad[];
  lines?: readonly ProductLine[];
  pool?: ItemPool;
  // The last ads shown (by ad id or line id), oldest first; not drawn again if anything else can be.
  recent?: readonly string[];
  random(): number;
  // Whether a fixed ad may be offered (its item exists), and whether a pool item has art the card can draw.
  usable?: (ad: Ad) => boolean;
  drawable?: (item: PoolItem) => boolean;
}

// The window (issue 183): the next `size` items along the ladder that are not yours, and the items that are (owned,
// queued or waiting), each in ladder order. Items the caller says have no art are in neither.
export function windowOf(pool: ItemPool, drawable: (item: PoolItem) => boolean = () => true, size: number = ENCOUNTERS.window.size): { window: PoolItem[]; owned: PoolItem[] } {
  const ordered = ladderOrder(pool.items.filter(drawable));
  return { window: ordered.filter((i) => !pool.has(i.id)).slice(0, size), owned: ordered.filter((i) => pool.has(i.id)) };
}

// The chance an ad is a repeat: `repeatShare` while the window is full, rising as it runs short (each missing place
// counts as a repeat), 1 when nothing is left to get, and 0 when there is nothing you own to repeat.
export function repeatChance(windowCount: number, ownedCount: number, size: number = ENCOUNTERS.window.size): number {
  if (ownedCount <= 0) return 0;
  if (windowCount <= 0) return 1;
  return 1 - (1 - ENCOUNTERS.window.repeatShare) * (Math.min(windowCount, size) / size);
}

// One item: a repeat with `repeatChance`, else one of the window, each equally likely. `accept` narrows the choice
// (a shop's kinds, a shop not shown lately); if it leaves a side empty the other side is used, and null if nothing.
export function drawItem(
  pool: ItemPool,
  random: () => number,
  drawable?: (item: PoolItem) => boolean,
  accept: (item: PoolItem) => boolean = () => true,
): PoolItem | null {
  const { window, owned } = windowOf(pool, drawable);
  const chance = repeatChance(window.length, owned.length);
  const w = window.filter(accept);
  const o = owned.filter(accept);
  const wantRepeat = random() < chance;
  const from = (wantRepeat ? [o, w] : [w, o]).find((x) => x.length > 0);
  return from ? from[Math.min(from.length - 1, Math.floor(random() * from.length))] : null;
}

// Picks the ad. Seven special ads (`ads`, a fixed item each) are outside the window: with `specialShare`, if one still
// has an item you lack and was not shown lately, it is the ad. Otherwise an item is drawn (`drawItem`: a window item, or a
// repeat) and a shop that sells its kind shows it, preferring a shop not shown lately. A repeat arrives as the
// already-own card. With no `pool` only the fixed ads are drawn, uniformly (the draw before issue 163). Null when
// there is nothing to offer.
export function drawAd(input: DrawInput): Ad | null {
  const { pool, random } = input;
  const recent = (input.recent ?? []).slice(-ENCOUNTERS.recent);
  const fixed = input.ads.filter((a) => input.usable?.(a) !== false);
  if (!pool) {
    const fresh = fixed.filter((a) => !recent.includes(a.id));
    const from = fresh.length > 0 ? fresh : fixed;
    return from.length > 0 ? from[Math.min(from.length - 1, Math.floor(random() * from.length))] : null;
  }
  const specials = fixed.filter((a) => !pool.has(a.item) && !recent.includes(a.id));
  if (specials.length > 0 && random() < ENCOUNTERS.window.specialShare) return specials[Math.min(specials.length - 1, Math.floor(random() * specials.length))];
  const lines = input.lines ?? LINES;
  const shopsOf = (i: PoolItem) => lines.filter((l) => l.kinds.includes(i.kind));
  const item = drawItem(pool, random, input.drawable, (i) => shopsOf(i).some((l) => !recent.includes(l.id))) ?? drawItem(pool, random, input.drawable, (i) => shopsOf(i).length > 0);
  if (!item) return null;
  const shops = shopsOf(item);
  const fresh = shops.filter((l) => !recent.includes(l.id));
  const from = fresh.length > 0 ? fresh : shops;
  return lineAd(from[Math.min(from.length - 1, Math.floor(random() * from.length))], item);
}

// The ad one line makes now, for the dev shortcut and tests: an item of its kinds, by the same rule. Null when it
// has nothing to sell.
export function drawLineAd(line: ProductLine, pool: ItemPool, random: () => number, drawable?: (item: PoolItem) => boolean): Ad | null {
  const item = drawItem(pool, random, drawable, (i) => line.kinds.includes(i.kind));
  return item ? lineAd(line, item) : null;
}
