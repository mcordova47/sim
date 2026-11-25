import { describe, expect, it } from "vitest";
import { VIEW } from "./config";
import { menuBoxRect, textBoxRect } from "../render/dialog-box";
import { productFit, layoutCard } from "../render/encounter-card";
import { textWidth, unsupportedChars, GLYPH_H } from "../render/font";
import type { Box } from "../render/layout";
import { ENCOUNTERS } from "./config";
import { DECOR_DATA, itemSprites, type DecorItem } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { ADS, CARD_WORDS, ENCOUNTER_WORDS, MAX_BODY_LINES, MAX_LINE, type Ad } from "./encounter-ads";
import { drawAd, drawLineAd, itemPool, repeatChance, windowOf, type ItemPool, type PoolItem } from "./encounter-draw";
import { LINES, lineAd, lineById, type ProductLine } from "./encounter-lines";
import { Encounters, parseEncounters } from "./encounters";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// Issue 163: the item pool, the product-line ads, and the weighted draw.

function seeded(seed = 7): () => number {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

const item = (id: string, kind = "art", name = id.toUpperCase()): PoolItem => ({ id, name, kind });
const poolOf = (items: PoolItem[], owned: string[] = []): ItemPool => ({ items, has: (id) => owned.includes(id) });
const frames = LINES.find((l) => l.id === "line-frames")!;

describe("the pool is data", () => {
  const pool = itemPool(DECOR_DATA.items);

  it("lists every item of a sellable kind that is not a starting item and not a TEST item (so a new item is not forgotten)", () => {
    // When an item is added, this list changes on purpose: a new item joins the random pool by existing.
    expect(pool.map((i) => i.id)).toEqual(
      DECOR_DATA.items.filter((i) => i.how !== "start" && !i.tags?.includes("test") && ENCOUNTERS.pool.kinds.includes(i.kind)).map((i) => i.id),
    );
    const byKind = (k: string) => pool.filter((i) => i.kind === k).map((i) => i.id);
    expect(byKind("art")).toEqual([
      "art-robin", "art-concert-poster", "art-snow-wagon", "art-serenity-now", "art-canoes", "art-great-wave", "art-starry-night", "art-water-lilies", "art-sunflowers",
    ]);
    expect(byKind("plant")).toEqual(["plant-dried", "plant-pothos", "plant-pampas", "plant-monstera", "plant-lavender", "plant-spider", "plant-eucalyptus"]);
    expect(byKind("lamp")).toEqual(["lamp-warm", "lamp-stool-lamp", "lamp-candle"]);
    expect(byKind("outfit")).toHaveLength(12);
    expect(byKind("coffee")).toEqual(["coffee-french-press", "coffee-drip-machine", "coffee-pod-machine", "coffee-percolator", "coffee-moka-pot", "coffee-briki"]);
  });

  it("has no starting item, no TEST item and no kind the ads cannot sell", () => {
    for (const i of pool) {
      const full = DECOR_DATA.items.find((x) => x.id === i.id)!;
      expect(full.how, i.id).not.toBe("start");
      expect(full.tags ?? [], i.id).not.toContain("test");
      expect(ENCOUNTERS.pool.kinds, i.id).toContain(i.kind);
    }
    expect(pool.some((i) => i.kind === "pantry" || i.kind === "prop")).toBe(false);
  });

  it("every item in the pool has art the card can draw", () => {
    for (const i of pool) {
      const full = DECOR_DATA.items.find((x) => x.id === i.id)!;
      expect(`/public/sprites/${full.sprite}.png` in spriteFiles, `${i.id}: ${full.sprite} has art`).toBe(true);
      // The card draws `sprite`, which is among the names the item loads.
      expect(itemSprites(full)).toContain(full.sprite);
    }
  });

  it("the checkpoint list still gives the same items (the pool does not touch the milestone gifts)", () => {
    expect(CHECKPOINTS.length).toBeGreaterThanOrEqual(34);
    expect(new Set(CHECKPOINTS.map((c) => c.item)).size).toBe(CHECKPOINTS.length);
  });

  it("the fixed ads are unchanged: the same seven, each selling one fixed item", () => {
    expect(ADS.map((a) => a.item)).toEqual(["art-robin", "plant-dried", "lamp-warm", "art-starry-night", "lamp-stool-lamp", "lamp-candle", "art-water-lilies"]);
  });

  it("an item added later of a known kind joins the pool, and one of an unknown kind or a starting item does not", () => {
    const base = DECOR_DATA.items[0];
    const fake = (over: Partial<DecorItem>): DecorItem => ({ ...base, id: "x", name: "X", how: "gift", ...over });
    expect(itemPool([fake({ kind: "rug" })]).map((i) => i.id)).toEqual(["x"]);
    expect(itemPool([fake({ kind: "trinket" })])).toHaveLength(1);
    expect(itemPool([fake({ kind: "rug", how: "start" })])).toHaveLength(0);
    expect(itemPool([fake({ kind: "pantry" })])).toHaveLength(0);
    expect(itemPool([fake({ kind: "rug", tags: ["test"] })])).toHaveLength(0);
    // An empty pot, vase or bowl (the `empty` flag of issue 182, not on this branch's type yet) is never obtainable, so never in the pool.
    expect(itemPool([fake({ kind: "plant", ...({ empty: true } as object) })])).toHaveLength(0);
  });
});

describe("the product lines", () => {
  const poolNames = (kinds: readonly string[]) => DECOR_DATA.items.filter((i) => itemPool([i]).length > 0 && kinds.includes(i.kind)).map((i) => i.name);
  const longest = (kinds: readonly string[]) => Math.max(0, ...poolNames(kinds).map((n) => n.length));

  it("have unique ids, real kinds, and invented shop names (no real platform or brand)", () => {
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length);
    const platforms = ["MAIL", "FEED", "MESSAGES"];
    for (const l of LINES) {
      expect(l.id.startsWith("line-"), l.id).toBe(true);
      expect(l.kinds.length, l.id).toBeGreaterThan(0);
      for (const k of l.kinds) expect(ENCOUNTERS.pool.kinds, `${l.id} sells ${k}`).toContain(k);
      expect(platforms, l.id).toContain(l.platform);
      expect([0, 1, 2]).toContain(l.persistence);
      expect(l.delayHours).toBeGreaterThan(0);
      expect(l.delayHours).toBeLessThanOrEqual(48);
    }
    // Every kind the pool sells has a shop.
    for (const k of ENCOUNTERS.pool.kinds) expect(LINES.some((l) => l.kinds.includes(k)), `a shop for ${k}`).toBe(true);
    const banned = ["INSTAGRAM", "GMAIL", "AMAZON", "FACEBOOK", "IKEA", "ETSY", "EBAY", "TARGET", "WALMART", "GOOGLE", "APPLE"];
    for (const l of LINES) for (const b of banned) expect(`${l.brand} ${l.from ?? ""} ${l.tag}`.toUpperCase(), l.id).not.toContain(b);
  });

  it("every line fits the card, at the longest item name (and a 22 letter one), and uses only characters the font has", () => {
    for (const l of LINES) {
      for (const len of [longest(l.kinds), 22]) {
        const ad = lineAd(l, { id: "x", name: "N".repeat(len) });
        expect(ad.body.length, l.id).toBeGreaterThanOrEqual(2);
        expect(ad.body.length, l.id).toBeLessThanOrEqual(MAX_BODY_LINES);
        expect(ad.closer, l.id).toHaveLength(2);
        for (const line of [ad.headline, ...ad.body, ...ad.closer, ad.brand, ad.from ?? "", ad.button, ad.tag, ad.platform]) {
          expect([...line].length, `${l.id}: ${line}`).toBeLessThanOrEqual(MAX_LINE);
          expect(unsupportedChars(line), `${l.id}: ${line}`).toEqual([]);
          expect(textWidth(line), `${l.id}: ${line}`).toBeLessThanOrEqual(288);
          expect(line, l.id).not.toContain("{");
        }
      }
    }
  });

  it("every real item in every line makes a card that is on screen and clear of the menu and the dialog box", () => {
    const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const l of LINES) {
      const names = [...poolNames(l.kinds), "N".repeat(22)];
      for (const name of names) {
        const ad = lineAd(l, { id: "x", name });
        for (const details of [false, true]) {
          const layout = layoutCard(ad, details);
          const labels = [ENCOUNTER_WORDS.ignore, CARD_WORDS[ad.card].unsubscribe, ...(details ? [] : [ENCOUNTER_WORDS.closer]), ENCOUNTER_WORDS.cart];
          const menus = [menuBoxRect(labels, !details), textBoxRect()];
          const boxes: Box[] = [
            ...layout.texts.map((t) => {
              const w = textWidth(t.text);
              return { x: t.align === "right" ? t.x - w : t.x, y: t.y, w, h: GLYPH_H };
            }),
            layout.button.box,
            layout.picture,
          ];
          for (const b of boxes) {
            expect(b.x + b.w, `${l.id} ${name}`).toBeLessThanOrEqual(VIEW.width);
            expect(b.y + b.h, `${l.id} ${name}`).toBeLessThanOrEqual(VIEW.height);
            for (const m of menus) expect(overlap(b, m), `${l.id} ${name} ${JSON.stringify(b)} under the menu ${JSON.stringify(m)} ${l.card} details ${details}`).toBe(false);
          }
        }
      }
    }
  });

  it("make an ad with the item's id and name in it, and the line's id", () => {
    const ad = lineAd(frames, { id: "art-robin", name: "ROBIN PRINT" });
    expect(ad.id).toBe("line-frames");
    expect(ad.item).toBe("art-robin");
    expect(ad.headline).toContain("ROBIN PRINT");
    expect(lineById("line-frames")).toBe(frames);
    expect(lineById("nope")).toBeUndefined();
  });
});

describe("the window and the draw (issue 183)", () => {
  // A ladder of art ids a0 to a19 (the real ladder is tested in encounter-ladder.test.ts); unlisted ids go last in the given order.
  const many = (n: number) => Array.from({ length: n }, (_, i) => item(`art-x${String(i).padStart(2, "0")}`));
  const ownedFirst = (items: PoolItem[], count: number) => items.slice(0, count).map((i) => i.id);

  it("the window is the next five items that are not owned, in ladder order, and it slides as items are owned", () => {
    const items = [item("plant-pothos", "plant"), item("art-robin"), item("lamp-warm", "lamp"), item("plant-dried", "plant"), item("art-snow-wagon"), item("lamp-stool-lamp", "lamp"), item("art-serenity-now")];
    // The ladder order is robin, warm lamp, dried flowers, snow wagon, stool lamp, serenity, pothos (whatever order the pool lists them in).
    const w0 = windowOf(poolOf(items), undefined);
    expect(w0.window.map((i) => i.id)).toEqual(["art-robin", "lamp-warm", "plant-dried", "art-snow-wagon", "lamp-stool-lamp"]);
    expect(w0.owned).toEqual([]);
    const w1 = windowOf(poolOf(items, ["art-robin", "plant-dried"]), undefined);
    expect(w1.window.map((i) => i.id)).toEqual(["lamp-warm", "art-snow-wagon", "lamp-stool-lamp", "art-serenity-now", "plant-pothos"]);
    expect(w1.owned.map((i) => i.id)).toEqual(["art-robin", "plant-dried"]);
    // An item owned out of order (a later one) is skipped too, and a window near the end is short.
    const w2 = windowOf(poolOf(items, ["art-robin", "lamp-warm", "plant-dried", "art-snow-wagon", "lamp-stool-lamp", "plant-pothos"]), undefined);
    expect(w2.window.map((i) => i.id)).toEqual(["art-serenity-now"]);
    // An item with no art is in neither side.
    expect(windowOf(poolOf(items), (i) => i.id !== "art-robin").window[0].id).toBe("lamp-warm");
  });

  it("an item the ladder does not list goes after the ones it does", () => {
    const items = [item("art-brand-new"), item("art-robin"), item("plant-other", "plant")];
    expect(windowOf(poolOf(items)).window.map((i) => i.id)).toEqual(["art-robin", "art-brand-new", "plant-other"]);
  });

  it("an ad never sells an unowned item outside the window (seeded)", () => {
    const items = many(20);
    const pool = poolOf(items, ownedFirst(items, 4));
    const random = seeded(11);
    const allowed = new Set(windowOf(pool).window.map((i) => i.id));
    expect([...allowed]).toEqual(items.slice(4, 9).map((i) => i.id));
    for (let i = 0; i < 3000; i++) {
      const ad = drawAd({ ads: [], lines: LINES, pool, random })!;
      if (!pool.has(ad.item)) expect(allowed.has(ad.item), ad.item).toBe(true);
    }
  });

  it("every item in the window comes up, and no other unowned item does", () => {
    const items = many(20);
    const pool = poolOf(items, ownedFirst(items, 2));
    const random = seeded(12);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const ad = drawAd({ ads: [], lines: LINES, pool, random })!;
      if (!pool.has(ad.item)) seen.add(ad.item);
    }
    expect([...seen].sort()).toEqual(items.slice(2, 7).map((i) => i.id));
  });

  it("a shop is only drawn if the window or your things hold an item of its kind", () => {
    // The window is five art items; a plant you lack past the window cannot be offered, a plant you own can be (a repeat).
    const items = [...many(6), item("plant-zzz", "plant"), item("lamp-warm", "lamp")];
    const pool = poolOf(items, ["lamp-warm"]);
    const random = seeded(13);
    const lines = new Set<string>();
    for (let i = 0; i < 2000; i++) lines.add(drawAd({ ads: [], lines: LINES, pool, random })!.id);
    expect([...lines].sort()).toEqual(["line-frames", "line-gallery", "line-lamps"]);
  });

  // The share of repeats among many ads at a given ownership (seeded).
  const repeatShare = (total: number, owned: number, seed: number) => {
    const items = many(total);
    const pool = poolOf(items, ownedFirst(items, owned));
    const random = seeded(seed);
    let repeats = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (pool.has(drawAd({ ads: [], lines: LINES, pool, random })!.item)) repeats++;
    return repeats / N;
  };

  it("about a third of ads are repeats at several ownership levels (few owned, half, a full window left)", () => {
    for (const [total, owned] of [[40, 2], [40, 10], [40, 20], [40, 34], [12, 3]]) {
      const share = repeatShare(total, owned, 31 + owned);
      expect(share, `${owned} of ${total} owned`).toBeGreaterThan(ENCOUNTERS.window.repeatShare - 0.025);
      expect(share, `${owned} of ${total} owned`).toBeLessThan(ENCOUNTERS.window.repeatShare + 0.025);
    }
  });

  it("with nothing owned there is nothing to repeat, and a nearly complete collection still shows mostly repeats", () => {
    expect(repeatShare(30, 0, 41)).toBe(0);
    // Two or one items left in the window of five: the empty places count as repeats.
    expect(repeatShare(30, 28, 42)).toBeGreaterThan(0.7);
    expect(repeatShare(30, 29, 43)).toBeGreaterThan(0.8);
    // Everything owned: always a repeat (the already-own card), and every item can come up.
    expect(repeatShare(30, 30, 44)).toBe(1);
  });

  it("the repeats are items you own, drawn from all of them", () => {
    const items = many(20);
    const pool = poolOf(items, ownedFirst(items, 10));
    const random = seeded(51);
    const repeats = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      const ad = drawAd({ ads: [], lines: LINES, pool, random })!;
      if (pool.has(ad.item)) repeats.add(ad.item);
    }
    expect(repeats.size).toBe(10);
  });

  it("repeatChance: the share while the window is full, more as it runs short, none with nothing owned", () => {
    expect(repeatChance(5, 3)).toBeCloseTo(1 / 3);
    expect(repeatChance(5, 0)).toBe(0);
    expect(repeatChance(0, 3)).toBe(1);
    expect(repeatChance(1, 30)).toBeCloseTo(1 - (2 / 3) * 0.2);
    expect(repeatChance(2, 30)).toBeGreaterThan(repeatChance(3, 30));
  });

  it("an item with no art is skipped", () => {
    const items = [item("art-a"), item("art-b"), item("art-c")];
    const pool = poolOf(items);
    const random = seeded(4);
    for (let i = 0; i < 300; i++) expect(drawLineAd(frames, pool, random, (it) => it.id !== "art-b")!.item).not.toBe("art-b");
    // If nothing can be drawn there is no ad.
    expect(drawLineAd(frames, pool, random, () => false)).toBeNull();
    expect(drawAd({ ads: [], lines: [frames], pool, random, drawable: () => false })).toBeNull();
  });

  it("a line with no item of its kind is never drawn; with no pool only the fixed ads are", () => {
    const random = seeded(8);
    const pool = poolOf([item("lamp-a", "lamp")]);
    for (let i = 0; i < 200; i++) expect(drawAd({ ads: [], lines: LINES, pool, random })!.id).toBe("line-lamps");
    for (let i = 0; i < 200; i++) expect(ADS.map((a) => a.id)).toContain(drawAd({ ads: ADS, lines: LINES, random })!.id);
    expect(drawAd({ ads: [], lines: LINES, random })).toBeNull();
  });

  it("the special ads stay outside the window: a fixed ad for an item you lack can come up, one for an item you own does not", () => {
    // The pool is five art items you lack; the special ad's item is far past the window, so it is the only way to get it.
    const items = [...many(8), item("lamp-candle", "lamp")];
    const pool = poolOf(items, ["art-x00"]);
    const candle = ADS.find((a) => a.item === "lamp-candle")!;
    const random = seeded(61);
    let specials = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (drawAd({ ads: [candle], lines: LINES, pool, random })!.id === candle.id) specials++;
    expect(specials / N).toBeGreaterThan(ENCOUNTERS.window.specialShare - 0.02);
    expect(specials / N).toBeLessThan(ENCOUNTERS.window.specialShare + 0.02);
    const owned = poolOf(items, ["art-x00", "lamp-candle"]);
    for (let i = 0; i < 2000; i++) expect(drawAd({ ads: [candle], lines: LINES, pool: owned, random })!.id).not.toBe(candle.id);
  });

  it("the whole draw over the real pool: a shop shows an item of its own kind, and the share of repeats holds", () => {
    const pool: ItemPool = { items: itemPool(DECOR_DATA.items), has: (id) => id.startsWith("art-") || id === "lamp-warm" };
    const random = seeded(21);
    let repeats = 0;
    const N = 20000;
    const kinds = new Map(pool.items.map((i) => [i.id, i.kind]));
    for (let i = 0; i < N; i++) {
      const ad = drawAd({ ads: ADS, lines: LINES, pool, random })!;
      if (pool.has(ad.item)) repeats++;
      const line = lineById(ad.id);
      if (line) expect(line.kinds, `${ad.id} sold ${ad.item}`).toContain(kinds.get(ad.item));
    }
    expect(repeats / N).toBeGreaterThan(0.2);
    expect(repeats / N).toBeLessThan(0.5);
  });

  it("is repeatable: the same seed gives the same ads, and the recent ads are skipped while others exist", () => {
    const pool = poolOf([item("art-a"), item("art-b")]);
    const a = Array.from({ length: 20 }, (_, i) => i);
    const run = () => {
      const r = seeded(77);
      return a.map(() => drawAd({ ads: ADS, lines: LINES, pool, random: r })!.id);
    };
    expect(run()).toEqual(run());
    // The recent special ads are skipped (the pool has a shop for art).
    const random = seeded(1);
    const recent = ADS.slice(0, 3).map((x) => x.id);
    const withSpecials = poolOf(ADS.map((x) => item(x.item, x.item.split("-")[0])));
    for (let i = 0; i < 300; i++) expect(recent).not.toContain(drawAd({ ads: ADS, lines: [], recent, random, pool: withSpecials })?.id ?? "none");
    // The recent shop is skipped while another shop can sell something.
    const two = poolOf([item("art-a"), item("plant-a", "plant")]);
    for (let i = 0; i < 300; i++) expect(drawAd({ ads: [], lines: LINES, pool: two, recent: ["line-frames", "line-gallery"], random })!.id).toBe("line-plants");
    // With only one shop for it, a recent shop still sells.
    for (let i = 0; i < 50; i++) expect(drawAd({ ads: [], lines: LINES, pool: poolOf([item("art-a")]), recent: ["line-frames", "line-gallery"], random })!.id).toMatch(/^line-(frames|gallery)$/);
  });
});

describe("the encounter logic with the pool", () => {
  it("Encounters.pick gives a shop's ad when the pool has its kind, and records the line's id in the save", () => {
    const e = new Encounters([], LINES);
    const pool = poolOf([item("plant-a", "plant", "FERN")]);
    const ad = e.pick({ random: () => 0, pool })!;
    expect(ad.id).toBe("line-plants");
    expect(ad.item).toBe("plant-a");
    e.begin(ad, 100);
    expect(e.toJSON().seen).toEqual(["line-plants"]);
  });

  it("the save format is unchanged: old ad ids still load, line ids load, unknown ones are dropped", () => {
    const out = parseEncounters({ day: 3, today: 1, soon: false, last: 5, seen: ["ad-candle", "line-rugs", "gone", "line-rugs"] }, 100);
    expect(out.seen).toEqual(["ad-candle", "line-rugs"]);
    expect(Object.keys(out).sort()).toEqual(["day", "last", "seen", "soon", "today"]);
    const e = new Encounters();
    e.load({ seen: ["line-plants", "ad-robin", "line-x"] });
    expect(e.seen).toEqual(["line-plants", "ad-robin"]);
  });
});

describe("the product picture fits the card", () => {
  const email = { x: 16, y: 96, w: 100, h: 52 };
  const text = { x: 238, y: 24, w: 70, h: 52 };

  it("a 16x16 or 32x16 item is magnified and shown whole", () => {
    expect(productFit(16, 16, email)).toEqual({ scale: 3, x: 0, y: 0, w: 16, h: 16 });
    expect(productFit(32, 16, email)).toEqual({ scale: 3, x: 0, y: 0, w: 32, h: 16 });
  });

  it("a rug (128x64 or 112x48) is shown at 1x, cropped to the middle of the picture area", () => {
    for (const [w, h] of [[128, 64], [112, 48]]) {
      for (const area of [email, text, { x: 20, y: 44, w: 100, h: 68 }]) {
        const fit = productFit(w, h, area);
        expect(fit.scale).toBe(1);
        expect(fit.w * fit.scale).toBeLessThanOrEqual(area.w);
        expect(fit.h * fit.scale).toBeLessThanOrEqual(area.h);
        expect(fit.x).toBeGreaterThanOrEqual(0);
        expect(fit.x + fit.w).toBeLessThanOrEqual(w);
        expect(fit.y + fit.h).toBeLessThanOrEqual(h);
      }
    }
    expect(productFit(128, 64, email)).toEqual({ scale: 1, x: 14, y: 6, w: 100, h: 52 });
  });

  it("a tall sprite (16x32, 16x48) is magnified as far as the box allows and cropped if it must", () => {
    expect(productFit(16, 32, email)).toEqual({ scale: 1, x: 0, y: 0, w: 16, h: 32 });
    const tall = productFit(16, 48, text);
    expect(tall.h * tall.scale).toBeLessThanOrEqual(52);
    expect(productFit(16, 48, { x: 0, y: 0, w: 100, h: 68 }).h).toBe(48);
  });
});

// Keep the types honest: a line has everything an ad has but its item.
const _line: ProductLine = frames;
const _ad: Ad = lineAd(_line, { id: "a", name: "A" });
void _ad;
