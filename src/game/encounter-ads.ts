// The ads of the ad encounters (issue 043 stage B, docs/random-encounters.md sections 6 and 9)
// and every word the cards and the narrator say. All the card text lives in this one file, so
// the text pass (issue 037, docs/text-review.md) edits one place.
//
// The voice is the voice of real marketing: subject lines, "limited time", "your cart is
// waiting", star ratings. Platforms are real giant ones (Instagram, Gmail, Amazon, Facebook
// Marketplace) or a plain text message; brands, shops and sellers are invented. No real person
// is named. Prices are for show only: nothing in the game costs anything.
//
// Every line is at most `MAX_LINE` letters (the card is 288 px wide inside, 6 px a letter) and
// uses only characters the pixel font has (lower case is drawn as capitals).

export type CardType = "email" | "social" | "text";

export interface Ad {
  id: string;
  card: CardType;
  // The header of the card, at the left (GMAIL, INSTAGRAM, MESSAGES) and its right part.
  platform: string;
  tag: string;
  // The invented brand, shop or seller.
  brand: string;
  // A decor item id the ad sells.
  item: string;
  // The sender or the handle line, under the header (not on a text message).
  from?: string;
  // The subject or the caption (or, on a text message, the message's first line).
  headline: string;
  // Two or three lines of body.
  body: string[];
  // The button drawn on the card.
  button: string;
  // The "Look closer" lines: two.
  closer: string[];
  // How hard it is to unsubscribe: 0, 1 or 2 (each level takes `persistencePenalty` off).
  persistence: 0 | 1 | 2;
  // Game hours until the package arrives.
  delayHours: number;
  // Replaces the card type's narrator line (a listing is not a sponsored post).
  narrator?: string;
}

export const MAX_LINE = 46;
export const MAX_BODY_LINES = 3;

export const ADS: readonly Ad[] = [
  {
    id: "ad-robin",
    card: "social",
    platform: "INSTAGRAM",
    tag: "SPONSORED",
    brand: "Little Fern Prints",
    item: "art-robin",
    from: "@LITTLEFERNPRINTS",
    headline: "NEW: THE ROBIN PRINT",
    body: ["Archival paper. Numbered edition of 200.", "Free shipping on orders this week."],
    button: "SHOP NOW",
    closer: ["ROBIN PRINT, 8 X 10 IN", "4.8 stars from 212 reviews."],
    persistence: 0,
    delayHours: 12,
  },
  {
    id: "ad-dried-flowers",
    card: "email",
    platform: "GMAIL",
    tag: "PROMOTIONS",
    brand: "Garnet Lane Florals",
    item: "plant-dried",
    from: "GARNET LANE FLORALS",
    headline: "Still thinking about it? Your cart is waiting.",
    body: ["You left DRIED FLOWERS in your cart.", "A small bunch that never needs watering.", "Complete your order today."],
    button: "COMPLETE ORDER",
    closer: ["Dried flower bunch, glass jar.", "$24. Free returns."],
    persistence: 2,
    delayHours: 8,
  },
  {
    id: "ad-warm-lamp",
    card: "social",
    platform: "FACEBOOK MARKETPLACE",
    tag: "OAKLINE HOME GOODS",
    brand: "Oakline Home Goods",
    item: "lamp-warm",
    headline: "Table lamp, warm shade - $18",
    body: ["Like new. Works great. Pickup or delivery.", "Listed 3 days ago. Is this still available?"],
    button: "MESSAGE SELLER",
    closer: ["Linen shade, brass base. Bulb included.", "Delivery is $6 within 10 miles."],
    persistence: 0,
    delayHours: 24,
    narrator: "A LISTING HAS APPEARED.",
  },
  {
    id: "ad-starry-night",
    card: "email",
    platform: "AMAZON",
    tag: "RECOMMENDED",
    brand: "Northfield Studio",
    item: "art-starry-night",
    from: "Amazon.com",
    headline: "Recommended for you: Starry Night print",
    body: ["Because you viewed wall art.", "Northfield Studio. 4.6 stars, 312 ratings.", "FREE delivery Thursday."],
    button: "VIEW ITEM",
    closer: ["Starry Night, framed, 12 X 16 IN", "In stock. Sold by Northfield Studio."],
    persistence: 1,
    delayHours: 24,
  },
  {
    id: "ad-stool-lamp",
    card: "text",
    platform: "MESSAGES",
    tag: "MAPLE ROW",
    brand: "Maple Row",
    item: "lamp-stool-lamp",
    headline: "Maple Row: Your stool lamp is back in stock.",
    body: ["Limited quantities. Shop before it's gone.", "Msg & data rates may apply. STOP to opt out."],
    button: "SHOP NOW",
    closer: ["Stool lamp, oak, with shade.", "$39. Ships in 2 days."],
    persistence: 1,
    delayHours: 8,
  },
  {
    id: "ad-candle",
    card: "email",
    platform: "GMAIL",
    tag: "PROMOTIONS",
    brand: "Hollis Candle Co.",
    item: "lamp-candle",
    from: "HOLLIS CANDLE CO.",
    headline: "20% off ends tonight",
    body: ["Hand-poured soy candle. 40-hour burn.", "Use code EVENING20 at checkout.", "Offer ends at midnight."],
    button: "SHOP THE SALE",
    closer: ["Evening candle, soy wax, 8 OZ.", "WAS $22. NOW $17.60."],
    persistence: 1,
    delayHours: 8,
  },
  {
    id: "ad-water-lilies",
    card: "social",
    platform: "INSTAGRAM",
    tag: "SPONSORED",
    brand: "Saltmarsh Prints",
    item: "art-water-lilies",
    from: "@SALTMARSHPRINTS",
    headline: "Water Lilies",
    body: ["Giclee print, matted and ready to hang.", "Rated 4.9 by 40,000 customers."],
    button: "SHOP NOW",
    closer: ["Water Lilies, 12 X 16 IN", "$48. Free shipping over $35."],
    persistence: 0,
    delayHours: 12,
  },
];

// The words that go with each kind of card.
export interface CardWords {
  // The second choice of the menu, named for what the card calls it.
  unsubscribe: string;
  // The narrator line when the ad appears.
  appeared: string;
  // After Ignore.
  ignore: string;
  // After an unsubscribe that worked, and one that did not.
  unsubscribed: string;
  unsubscribeFailed: string;
}

export const CARD_WORDS: Readonly<Record<CardType, CardWords>> = {
  email: {
    unsubscribe: "UNSUBSCRIBE",
    appeared: "A PROMOTIONAL EMAIL HAS APPEARED.",
    ignore: "YOU CLOSE THE EMAIL.",
    unsubscribed: "YOU HAVE BEEN UNSUBSCRIBED. WE ARE SORRY TO SEE YOU GO.",
    unsubscribeFailed: "UNSUBSCRIBE FAILED. PLEASE ALLOW 10 BUSINESS DAYS FOR YOUR REQUEST TO BE PROCESSED.",
  },
  social: {
    unsubscribe: "HIDE AD",
    appeared: "A SPONSORED POST HAS APPEARED.",
    ignore: "YOU SCROLL PAST IT.",
    unsubscribed: "AD HIDDEN.",
    unsubscribeFailed: "THANKS FOR YOUR FEEDBACK. YOU MAY STILL SEE THIS AD.",
  },
  text: {
    unsubscribe: "REPLY STOP",
    appeared: "A TEXT MESSAGE HAS ARRIVED.",
    ignore: "YOU LEAVE IT UNREAD.",
    unsubscribed: "YOU HAVE BEEN UNSUBSCRIBED.",
    unsubscribeFailed: "REPLY STOP AGAIN TO CONFIRM.",
  },
};

// The menu's other labels, and the lines that do not depend on the card.
export const ENCOUNTER_WORDS = {
  ignore: "IGNORE",
  closer: "LOOK CLOSER",
  cart: "ADD TO CART",
  // Tone lines (narration only; the odds do not change).
  toneLow: "IT IS HARD TO LOOK AWAY.",
  toneHigh: "YOU ARE NOT INTERESTED.",
  // The card of something you already have or have already ordered, or a full cart.
  alreadyOwn: "YOU ALREADY HAVE ONE.",
  alreadyInCart: "IT IS ALREADY IN YOUR CART.",
  cartFull: "YOUR CART IS FULL.",
  // An Ignore that turned into a purchase.
  impulse: "YOU TAP IT WITHOUT MEANING TO. ADDED TO CART.",
  // After a purchase: "ORDER CONFIRMED. ARRIVES LATER TODAY." or "... TOMORROW."
  ordered: "ORDER CONFIRMED. ARRIVES",
  laterToday: "LATER TODAY.",
  tomorrow: "TOMORROW.",
  // The line under the email's sender.
  emailTo: "TO: ME",
} as const;

export const adById = (id: string): Ad | undefined => ADS.find((a) => a.id === id);
