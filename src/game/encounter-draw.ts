import { ENCOUNTERS } from "./config";
import type { DecorItem } from "./decor-data";
import { isTestItem } from "./decor-data";
import type { Ad } from "./encounter-ads";
import { LINES, lineAd, type ProductLine } from "./encounter-lines";

// Which ad an encounter shows (issue 163, docs/random-encounters.md section 6): a pure, seeded draw. Nothing here
// owns anything or changes anything: the item pool, what is owned or ordered, the recent ads and the random function
// come in as arguments, so it tests without a game.

// What the draw needs to know about an item.
export interface PoolItem {
  id: string;
  name: string;
  kind: string;
}

// The pool: every real item of a kind an ad can sell that is not a starting item and not a TEST item (the
// checkpoint gifts and every later item), in data order. A new item of such a kind joins by existing.
export function itemPool(items: readonly DecorItem[], kinds: readonly string[] = ENCOUNTERS.pool.kinds): PoolItem[] {
  return items.filter((i) => i.how !== "start" && !isTestItem(i) && kinds.includes(i.kind)).map(({ id, name, kind }) => ({ id, name, kind }));
}

// What the draw sees of the world: the pool, and whether an item is already yours or on its way.
export interface ItemPool {
  items: readonly PoolItem[];
  // Owned, queued or waiting at the door: it cannot be delivered, so an ad for it is a repeat.
  has(itemId: string): boolean;
}

export const itemWeight = (pool: Pick<ItemPool, "has">, id: string): number => (pool.has(id) ? ENCOUNTERS.pool.owned : ENCOUNTERS.pool.unowned);

// An index chosen by weights from one random number (0 up to 1). A weight of 0 or less never wins unless every weight is.
export function weightedIndex(weights: readonly number[], r: number): number {
  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.min(weights.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * weights.length)));
  let at = Math.min(0.999999999, Math.max(0, Number.isFinite(r) ? r : 0)) * total;
  for (let i = 0; i < w.length; i++) {
    if (at < w[i]) return i;
    at -= w[i];
  }
  return w.length - 1;
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

interface Candidate {
  id: string;
  weight: number;
  make(random: () => number): Ad;
}

// Picks the ad: first which ad or shop (a fixed ad, or a line), then, for a shop, which item of its kinds. Every
// choice is weighted `unowned` to `owned` (10 to 1) by whether the item is yours: a fixed ad is weighted by its item, a
// shop by whether it has any item you lack. When everything is owned the weights are equal and the repeat arrives as
// the already-own card. With no `pool` only the fixed ads are drawn, uniformly (the draw before issue 163). Null
// when there is nothing to offer.
export function drawAd(input: DrawInput): Ad | null {
  const { pool, random } = input;
  const candidates: Candidate[] = [];
  for (const ad of input.ads) {
    if (input.usable?.(ad) === false) continue;
    candidates.push({ id: ad.id, weight: pool ? itemWeight(pool, ad.item) : 1, make: () => ad });
  }
  if (pool) {
    for (const line of input.lines ?? LINES) {
      const items = lineItems(line, pool, input.drawable);
      if (items.length === 0) continue;
      const weight = items.some((i) => !pool.has(i.id)) ? ENCOUNTERS.pool.unowned : ENCOUNTERS.pool.owned;
      candidates.push({
        id: line.id,
        weight,
        make: (r) => lineAd(line, items[weightedIndex(items.map((i) => itemWeight(pool, i.id)), r())]),
      });
    }
  }
  if (candidates.length === 0) return null;
  const recent = (input.recent ?? []).slice(-ENCOUNTERS.recent);
  const fresh = candidates.filter((c) => !recent.includes(c.id));
  const from = fresh.length > 0 ? fresh : candidates;
  // Without a pool the draw is the plain uniform one it always was.
  const weights = pool ? from.map((c) => c.weight) : from.map(() => 1);
  return from[weightedIndex(weights, random())].make(random);
}

// The ad one line makes now, for the dev shortcut and tests: an item of its kinds, weighted the same way. Null when it
// has nothing to sell.
export function drawLineAd(line: ProductLine, pool: ItemPool, random: () => number, drawable?: (item: PoolItem) => boolean): Ad | null {
  const items = lineItems(line, pool, drawable);
  if (items.length === 0) return null;
  return lineAd(line, items[weightedIndex(items.map((i) => itemWeight(pool, i.id)), random())]);
}
