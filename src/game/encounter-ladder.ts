import { ENCOUNTERS } from "./config";

// The ladder (issue 183, docs/random-encounters.md section 16): every real decor item a random ad can sell, in the
// order the encounters hand them out. The window is the next few items along the ladder that you do not own yet,
// so only a handful are ever in play. It is data, for Marc to reorder: move a line to move an item.
//
// It starts from the gift-day order of the checkpoints (delivery-checkpoints.ts), with the items that are not
// gifts (the other rugs and the three more paintings) woven in among their kind's neighbours. An item that is
// missing from this list is not lost: it is placed at the very end, and a test fails loudly until someone puts
// it here (encounter-ladder.test.ts), so a new item is never forgotten. Empty pots, vases and bowls (the `empty`
// flag, issue 182) are never obtainable and never in the ladder.
//
// Difficulty (issue 183 d6): the second word of a line, how often buying it falls through after you choose to
// buy: "easy" about 1 try in 10, "normal" (the default, left out) about 1 in 5, "hard" about 2 in 5. The numbers
// are `ENCOUNTERS.failure.chance`. Big or special things are hard, common small things are easy.
export type Tier = "easy" | "normal" | "hard";
export type LadderEntry = readonly [id: string, tier?: Tier];

export const LADDER: readonly LadderEntry[] = [
  // Paintings, lamps and the first plant, as the first gifts arrive.
  ["art-robin"],
  ["art-concert-poster", "easy"],
  ["lamp-warm", "easy"],
  ["plant-dried", "easy"],
  ["art-snow-wagon"],
  ["lamp-stool-lamp"],
  ["art-serenity-now"],
  ["art-canoes"],
  ["lamp-candle", "easy"],
  ["art-great-wave", "hard"],
  // The shelf plants, with the famous paintings (not gifts) between them.
  ["plant-pothos", "easy"],
  ["art-starry-night", "hard"],
  ["plant-pampas"],
  ["plant-monstera"],
  ["art-water-lilies"],
  ["plant-lavender"],
  ["plant-spider", "easy"],
  ["art-sunflowers"],
  ["plant-eucalyptus"],
  // Clothes, in the gift-day order.
  ["outfit-casual", "easy"],
  ["outfit-out"],
  ["outfit-pajamas", "easy"],
  ["outfit-casual-cardigan"],
  ["outfit-casual-hoodie", "easy"],
  ["outfit-casual-denim-jacket"],
  ["outfit-out-jacket-scarf"],
  ["outfit-out-button-up"],
  ["outfit-out-blazer"],
  ["outfit-out-peacoat", "hard"],
  ["outfit-pajamas-striped"],
  ["outfit-pajamas-robe"],
  // The two starter rugs, then trinkets, coffee gear and instruments in gift-day order, with the other eight rugs
  // (the big things, mostly hard) woven in every second or third place.
  ["rug-striped"],
  ["rug-bed-field"],
  ["trinket-alebrije", "hard"],
  ["rug-shag"],
  ["trinket-telescope"],
  ["coffee-french-press", "easy"],
  ["rug-bed-braid"],
  ["trinket-finger-skateboard", "easy"],
  ["coffee-drip-machine"],
  ["rug-kilim", "hard"],
  ["trinket-goose-egg"],
  ["coffee-pod-machine"],
  ["rug-bed-geometric"],
  ["trinket-worry-doll"],
  ["coffee-percolator"],
  ["rug-jute"],
  ["trinket-raccoon-can"],
  ["coffee-moka-pot"],
  ["rug-bed-cotton"],
  ["instrument-harmonica", "easy"],
  ["coffee-briki"],
  ["rug-medallion", "hard"],
  ["instrument-kalimba", "hard"],
  ["instrument-jaw-harp"],
  ["rug-bed-vintage", "hard"],
  ["trinket-alebrije-cat", "hard"],
  // The record stands (issue 172, Marc: keep them all): no gift, they come through the furniture shop.
  ["furniture-record-stand-crate", "easy"],
  ["furniture-record-stand-wire", "easy"],
  ["furniture-record-stand-cabinet"],
  ["furniture-record-stand-lidded"],
  ["furniture-record-stand-suitcase-pink", "hard"],
  ["furniture-record-stand-suitcase-teal", "hard"],
];

const rank = new Map(LADDER.map(([id], i) => [id, i]));
const tiers = new Map(LADDER.map(([id, tier]) => [id, tier ?? "normal"] as const));

// Items in ladder order. An item the ladder does not list goes after all that it does, in the order given.
export function ladderOrder<T extends { id: string }>(items: readonly T[]): T[] {
  const at = (i: T) => rank.get(i.id) ?? Number.MAX_SAFE_INTEGER;
  return items.map((item, i) => ({ item, i })).sort((a, b) => at(a.item) - at(b.item) || a.i - b.i).map((x) => x.item);
}

// The difficulty of an item: its tier, normal for an item the ladder does not list.
export const tierOf = (id: string): Tier => tiers.get(id) ?? "normal";

// The chance that buying this item fails once you choose to buy.
export const failChanceOf = (id: string): number => failChanceOfTier(tierOf(id));
export const failChanceOfTier = (tier: Tier): number => ENCOUNTERS.failure.chance[tier];
