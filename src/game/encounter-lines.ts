import type { Ad } from "./encounter-ads";

// The product-line ads (issue 163, docs/random-encounters.md section 6): where `ADS` has one fixed ad per item, a
// line is a shop that sells a kind of thing and shows whichever item of that kind the draw hands it
// (encounter-draw.ts). Adding a shop is one entry here; adding an item to the game needs nothing, since the pool
// is built from the item data. A line whose kinds have no item in the pool is never drawn.
//
// The shops are invented and generic: no real brand, shop or platform is named, and the platform line of a card
// is just MAIL, FEED or MESSAGES. Every text may hold `{name}`, which becomes the item's name (capitals, as the
// pool's names are). The same limits as `ADS` hold: a line is at most `MAX_LINE` letters and a card has at most
// `MAX_BODY_LINES` body lines, checked with the longest item name of the line's kinds (a test).

export interface ProductLine extends Omit<Ad, "item" | "id"> {
  // Starts with "line-". It is what the `seen` list and the dev shortcut call the line, and the id of the ads it makes.
  id: string;
  // The item kinds this shop sells.
  kinds: readonly string[];
}

export const LINES: readonly ProductLine[] = [
  {
    id: "line-frames",
    kinds: ["art"],
    card: "social",
    platform: "FEED",
    tag: "SPONSORED",
    brand: "Birchwood Frame Co.",
    from: "@BIRCHWOODFRAMES",
    headline: "New on the wall: {name}",
    body: ["Printed on thick paper. Ready to hang.", "Free shipping on orders this week."],
    button: "SHOP NOW",
    closer: ["{name}", "Framed, 12 X 16 IN. 4.7 stars."],
    persistence: 0,
    delayHours: 12,
  },
  {
    id: "line-gallery",
    kinds: ["art"],
    card: "email",
    platform: "MAIL",
    tag: "PROMOTIONS",
    brand: "Penny Press Gallery",
    from: "PENNY PRESS GALLERY",
    headline: "This week's pick: {name}",
    body: ["A small run, signed on the back.", "Only a few left in this size.", "Order by Friday for free delivery."],
    button: "VIEW PRINT",
    closer: ["{name}", "Unframed, 12 X 16 IN. Ships in a tube."],
    persistence: 1,
    delayHours: 24,
  },
  {
    id: "line-plants",
    kinds: ["plant"],
    card: "social",
    platform: "FEED",
    tag: "SPONSORED",
    brand: "Fernhill Plant Shop",
    from: "@FERNHILLPLANTS",
    headline: "{name} is back in the shop",
    body: ["Packed with care. Care card in the box.", "Ships Tuesday, in a box with air holes."],
    button: "SHOP NOW",
    closer: ["{name}", "Care card in the box. Free returns."],
    persistence: 0,
    delayHours: 12,
  },
  {
    id: "line-lamps",
    kinds: ["lamp"],
    card: "text",
    platform: "MESSAGES",
    tag: "DIMWELL",
    brand: "Dimwell Lighting",
    headline: "Dimwell: {name} is in stock.",
    body: ["Bulb included. Returns for 30 days.", "Msg & data rates may apply. STOP to opt out."],
    button: "SHOP NOW",
    closer: ["{name}", "Warm light, soft shadows. Ships in 2 days."],
    persistence: 1,
    delayHours: 8,
  },
  {
    id: "line-clothing",
    kinds: ["outfit"],
    card: "email",
    platform: "MAIL",
    tag: "PROMOTIONS",
    brand: "Linden Row Clothing",
    from: "LINDEN ROW CLOTHING",
    headline: "Just in: {name}",
    body: ["Soft, sturdy and made to be worn a lot.", "Free returns within 30 days.", "Sizes run true. Mostly."],
    button: "SHOP NEW",
    closer: ["{name}", "Machine washable. Ships in 2 days."],
    persistence: 2,
    delayHours: 24,
  },
  {
    id: "line-coffee",
    kinds: ["coffee"],
    card: "email",
    platform: "MAIL",
    tag: "PROMOTIONS",
    brand: "Slow Pour Supply",
    from: "SLOW POUR SUPPLY",
    headline: "Morning upgrade: {name}",
    body: ["Makes a cup worth getting up for.", "Beans sold separately. Opinions included.", "Free shipping this week."],
    button: "SHOP BREWERS",
    closer: ["{name}", "Makes one to four cups. Ships in 2 days."],
    persistence: 1,
    delayHours: 24,
  },
  {
    id: "line-rugs",
    kinds: ["rug"],
    card: "email",
    platform: "MAIL",
    tag: "PROMOTIONS",
    brand: "Underfoot Rug Co.",
    from: "UNDERFOOT RUG CO.",
    headline: "The {name} is in stock",
    body: ["Flat woven. Rolls up for easy storage.", "Ties the room together.", "Free shipping over $35."],
    button: "SHOP RUGS",
    closer: ["{name}", "Spot clean only. Ships rolled, in 3 days."],
    persistence: 1,
    delayHours: 24,
  },
  {
    id: "line-trinkets",
    kinds: ["trinket"],
    card: "social",
    platform: "FEED",
    tag: "SPONSORED",
    brand: "Odds and Ends Shop",
    from: "@ODDSANDENDSSHOP",
    headline: "{name}. You did not need this.",
    body: ["Small, strange and good on a shelf.", "Each one is a little different."],
    button: "SHOP NOW",
    closer: ["{name}", "About 3 IN tall. Gift wrap on request."],
    persistence: 0,
    delayHours: 12,
  },
  {
    id: "line-music",
    kinds: ["instrument"],
    card: "text",
    platform: "MESSAGES",
    tag: "REEDBED",
    brand: "Reedbed Music",
    headline: "Reedbed: {name} just came in.",
    body: ["Come try it. Nobody is watching.", "Msg & data rates may apply. STOP to opt out."],
    button: "SEE IT",
    closer: ["{name}", "Tuned and ready. Layaway available."],
    persistence: 1,
    delayHours: 24,
  },
];

export const lineById = (id: string): ProductLine | undefined => LINES.find((l) => l.id === id);

const fill = (text: string, name: string): string => text.replaceAll("{name}", name);

// The ad a line makes for one item: the line's words with the item's name put in, its id the line's, its item the item.
export function lineAd(line: ProductLine, item: { id: string; name: string }): Ad {
  const { kinds: _kinds, ...rest } = line;
  return {
    ...rest,
    item: item.id,
    headline: fill(line.headline, item.name),
    body: line.body.map((b) => fill(b, item.name)),
    closer: line.closer.map((c) => fill(c, item.name)),
    ...(line.narrator !== undefined && { narrator: fill(line.narrator, item.name) }),
  };
}
