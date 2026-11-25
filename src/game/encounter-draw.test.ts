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
import { drawAd, drawLineAd, itemPool, weightedIndex, type ItemPool, type PoolItem } from "./encounter-draw";
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

describe("the weighted draw", () => {
  it("weightedIndex follows the weights, never lands on a zero weight, and copes with bad numbers", () => {
    expect(weightedIndex([1, 1], 0)).toBe(0);
    expect(weightedIndex([1, 1], 0.99)).toBe(1);
    expect(weightedIndex([1, 10], 0.05)).toBe(0);
    expect(weightedIndex([1, 10], 0.1)).toBe(1);
    expect(weightedIndex([0, 5], 0)).toBe(1);
    expect(weightedIndex([3, 0], 0.999999)).toBe(0);
    expect(weightedIndex([0, 0, 0], 0.5)).toBe(1);
    expect(weightedIndex([2, 2], NaN)).toBe(0);
    expect(weightedIndex([2, 2], 5)).toBe(1);
    expect(weightedIndex([2, 2], -5)).toBe(0);
  });

  it("items you do not own come up about ten times as often as ones you do (seeded statistics)", () => {
    // A pool of 12 art items, 4 owned: per item the unowned should be ~10x the owned.
    const items = Array.from({ length: 12 }, (_, i) => item(`art-${i}`));
    const owned = items.slice(0, 4).map((i) => i.id);
    const pool = poolOf(items, owned);
    const random = seeded(99);
    const counts = new Map<string, number>();
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const ad = drawLineAd(frames, pool, random)!;
      counts.set(ad.item, (counts.get(ad.item) ?? 0) + 1);
    }
    const sum = (ids: string[]) => ids.reduce((a, id) => a + (counts.get(id) ?? 0), 0);
    const perOwned = sum(owned) / 4;
    const perUnowned = sum(items.slice(4).map((i) => i.id)) / 8;
    expect(perUnowned / perOwned).toBeGreaterThan(9);
    expect(perUnowned / perOwned).toBeLessThan(11);
    // And so a repeat is rare: 4 weights of 1 against 8 of 10 is 4 in 84.
    expect(sum(owned) / N).toBeGreaterThan(0.04);
    expect(sum(owned) / N).toBeLessThan(0.055);
  });

  it("the repeats get rarer as the pool grows", () => {
    const rate = (size: number) => {
      const items = Array.from({ length: size }, (_, i) => item(`art-${i}`));
      const pool = poolOf(items, items.slice(0, 3).map((i) => i.id));
      const random = seeded(5);
      let repeats = 0;
      for (let i = 0; i < 20000; i++) if (pool.has(drawLineAd(frames, pool, random)!.item)) repeats++;
      return repeats / 20000;
    };
    expect(rate(6)).toBeGreaterThan(rate(12));
    expect(rate(12)).toBeGreaterThan(rate(40));
  });

  it("when everything is owned the weights are equal and every item can still come up (a repeat is the already-own card)", () => {
    const items = Array.from({ length: 5 }, (_, i) => item(`art-${i}`));
    const pool = poolOf(items, items.map((i) => i.id));
    const random = seeded(3);
    const counts = new Map<string, number>();
    for (let i = 0; i < 10000; i++) {
      const ad = drawLineAd(frames, pool, random)!;
      counts.set(ad.item, (counts.get(ad.item) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    for (const c of counts.values()) expect(c).toBeGreaterThan(1700);
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

  it("a line with no item of its kind in the pool is never drawn; with no pool only the fixed ads are", () => {
    const random = seeded(8);
    const pool = poolOf([item("lamp-a", "lamp")]);
    for (let i = 0; i < 200; i++) {
      const ad = drawAd({ ads: [], lines: LINES, pool, random })!;
      expect(ad.id).toBe("line-lamps");
    }
    for (let i = 0; i < 200; i++) expect(ADS.map((a) => a.id)).toContain(drawAd({ ads: ADS, lines: LINES, random })!.id);
    expect(drawAd({ ads: [], lines: LINES, random })).toBeNull();
  });

  it("the whole draw over the real pool: a shop shows an item of its own kind, and owned things are rare", () => {
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
    // Ten art items and a lamp are owned out of about forty: repeats are well under a fifth of the draws.
    expect(repeats / N).toBeLessThan(0.2);
  });

  it("is repeatable: the same seed gives the same ads, and the recent ads are skipped while others exist", () => {
    const pool = poolOf([item("art-a"), item("art-b")]);
    const a = Array.from({ length: 20 }, (_, i) => i);
    const run = () => {
      const r = seeded(77);
      return a.map(() => drawAd({ ads: ADS, lines: LINES, pool, random: r })!.id);
    };
    expect(run()).toEqual(run());
    const random = seeded(1);
    for (let i = 0; i < 100; i++) {
      const recent = ADS.slice(0, 3).map((x) => x.id);
      expect(recent).not.toContain(drawAd({ ads: ADS, lines: [], recent, random })!.id);
    }
  });

  it("a fixed ad for an item you own is the lighter choice when a pool is given", () => {
    const pool = poolOf(ADS.map((a) => item(a.item)), [ADS[0].item]);
    const random = seeded(2);
    let first = 0;
    for (let i = 0; i < 7000; i++) if (drawAd({ ads: ADS, lines: [], pool, random })!.id === ADS[0].id) first++;
    // One weight of 1 in 61: about 115 of 7000.
    expect(first).toBeLessThan(200);
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
