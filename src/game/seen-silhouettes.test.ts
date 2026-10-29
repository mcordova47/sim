import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./achievements/feature";
import { APARTMENT } from "./apartment";
import { DECOR } from "./config";
import { Decor, parseDecor } from "./decor";
import { DECOR_DATA, isTestItem } from "./decor-data";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import type { Level } from "./level";
import { NOW, emptyDoc, randomDoc, rng } from "./sync/gen";
import { mergeSaves, normaliseDoc, normaliseProgress } from "./sync/merge";

// Issue 109c: what an ad showed you and you did not take, as silhouettes on the THINGS page.

const real = DECOR_DATA.items.filter((i) => !isTestItem(i) && i.how !== "start").map((i) => i.id);
const sil = (d: Decor) => d.entries().filter((e) => e.silhouette).map((e) => e.item.id);

describe("Decor.markSeen and entries", () => {
  it("a seen item is a silhouette after what you own, with no name, source or place", () => {
    const d = new Decor();
    expect(d.markSeen("art-robin")).toBe(true);
    const all = d.entries();
    expect(all[all.length - 1]).toMatchObject({ silhouette: true, from: "", where: "" });
    expect(all[all.length - 1].changeAt).toBeUndefined();
    expect(sil(d)).toEqual(["art-robin"]);
    expect(all.filter((e) => !e.silhouette).every((e) => e.where !== "")).toBe(true);
  });

  it("never shows an owned item as a silhouette, however it got there", () => {
    const d = new Decor();
    d.markSeen("art-robin");
    d.own("art-robin");
    expect(sil(d)).toEqual([]);
    expect(d.toJSON().seen).toBeUndefined();
    expect(d.markSeen("art-robin")).toBe(false);
    expect(d.markSeen("art-barn")).toBe(false);
    d.load({ owned: ["art-robin"], placed: {}, seen: ["art-robin", "art-barn", "art-canoes"] });
    expect(sil(d)).toEqual(["art-canoes"]);
    // Whatever you own, in any mix: no entry is both.
    const r = rng(7);
    for (let i = 0; i < 100; i++) {
      const e = new Decor();
      e.load({ owned: r.some(real, 0.5), placed: {}, seen: r.some(real, 0.5) });
      const entries = e.entries();
      const own = new Set(entries.filter((x) => !x.silhouette).map((x) => x.item.id));
      for (const s of entries.filter((x) => x.silhouette)) expect(own.has(s.item.id)).toBe(false);
      expect(new Set(entries.map((x) => x.item.id)).size).toBe(entries.length);
    }
  });

  it("arriving turns the silhouette into the item, in the owned order", () => {
    const d = new Decor();
    d.markSeen("art-robin");
    d.markSeen("art-canoes");
    d.own("art-robin");
    const e = d.entries();
    expect(e.find((x) => x.item.id === "art-robin")?.silhouette).toBeUndefined();
    expect(e.find((x) => x.item.id === "art-robin")?.where).toBe("IN THE INVENTORY");
    expect(sil(d)).toEqual(["art-canoes"]);
  });

  it("refuses unknown ids and TEST items, and is capped", () => {
    const d = new Decor();
    expect(d.markSeen("nope")).toBe(false);
    expect(d.markSeen("art-test-barn")).toBe(false);
    const big = new Decor({ ...DECOR_DATA, items: [...DECOR_DATA.items, ...Array.from({ length: DECOR.maxSeen + 20 }, (_, i) => ({ ...DECOR_DATA.items.find((x) => x.id === "art-robin")!, id: `art-extra-${i}` }))] });
    for (let i = 0; i < DECOR.maxSeen + 20; i++) big.markSeen(`art-extra-${i}`);
    expect(big.toJSON().seen!.length).toBe(DECOR.maxSeen);
  });

  it("reset clears it and a save without `seen` (an old save) reads as none", () => {
    const d = new Decor();
    d.markSeen("art-robin");
    d.reset();
    expect(sil(d)).toEqual([]);
    d.load({ owned: [], placed: {} });
    expect(sil(d)).toEqual([]);
    expect(Object.keys(d.toJSON())).toEqual(["owned", "placed"]);
  });

  it("saves and loads in order", () => {
    const d = new Decor();
    d.markSeen("art-canoes");
    d.markSeen("art-robin");
    const e = new Decor();
    e.load(JSON.parse(JSON.stringify(d.toJSON())));
    expect(sil(e)).toEqual(["art-canoes", "art-robin"]);
  });
});

describe("parseDecor seen, from hand-edited saves", () => {
  it("is tolerant of any shape", () => {
    for (const bad of [null, 5, "x", [], {}, { seen: 5 }, { seen: "art-robin" }, { seen: {} }, { seen: [1, null, {}, [], "", "x".repeat(65)] }]) {
      const p = parseDecor({ owned: [], placed: {}, ...(typeof bad === "object" && bad !== null && !Array.isArray(bad) ? bad : {}) });
      expect(p.seen ?? []).toEqual([]);
    }
    expect(() => parseDecor({ seen: [undefined, NaN, () => 1] })).not.toThrow();
  });

  it("drops repeats, owned ids and the starting items, keeps unknown short ids out of the page, and is capped", () => {
    const p = parseDecor({ owned: ["art-robin"], placed: {}, seen: ["art-canoes", "art-canoes", "art-robin", "art-barn", "art-from-the-future"] });
    expect(p.seen).toEqual(["art-canoes", "art-from-the-future"]);
    const d = new Decor();
    d.load({ seen: ["art-canoes", "art-from-the-future"] });
    expect(sil(d)).toEqual(["art-canoes"]);
    const many = Array.from({ length: 5000 }, (_, i) => `id-${i}`);
    expect(parseDecor({ seen: many }).seen!.length).toBe(DECOR.maxSeen);
  });
});

describe("sync of seen", () => {
  const withDecor = (device: string, decor: unknown, activeAt = NOW) => {
    const base = { ...emptyDoc(), device };
    const read = normaliseDoc({ ...base, activeAt, progress: { ...base.progress, decor } });
    if (!read.ok) throw new Error("bad");
    return read.doc;
  };

  it("is the union of both sides minus anything either owns, sorted, left out when empty", () => {
    const a = withDecor("aaa", { owned: ["art-robin"], placed: {}, seen: ["art-canoes", "art-snow-wagon"] }, NOW);
    const b = withDecor("bbb", { owned: ["art-snow-wagon"], placed: {}, seen: ["art-robin", "lamp-warm"] }, NOW - 1000);
    const m = mergeSaves(a, b, NOW);
    expect(m.progress.decor.seen).toEqual(["art-canoes", "lamp-warm"]);
    expect(mergeSaves(b, a, NOW).progress.decor).toEqual(m.progress.decor);
    const none = mergeSaves(withDecor("aaa", { owned: [], placed: {} }), withDecor("bbb", { owned: [], placed: {} }), NOW);
    expect("seen" in none.progress.decor).toBe(false);
  });

  it("normalising drops an owned id from seen and survives garbage; random merges stay commutative, idempotent and clean", () => {
    expect(normaliseProgress({ decor: { owned: ["art-robin"], seen: ["art-robin", 4, "art-canoes"] } }).decor.seen).toEqual(["art-canoes"]);
    expect(() => normaliseProgress({ decor: { seen: { a: 1 } } })).not.toThrow();
    const r = rng(11);
    for (let i = 0; i < 300; i++) {
      const a = randomDoc(r);
      const b = randomDoc(r);
      const m = mergeSaves(a, b, NOW);
      const owned = new Set(m.progress.decor.owned);
      for (const id of m.progress.decor.seen ?? []) expect(owned.has(id)).toBe(false);
      expect((m.progress.decor.seen ?? []).length).toBeLessThanOrEqual(DECOR.maxSeen);
      expect(mergeSaves(m, m, NOW)).toEqual(m);
      expect(mergeSaves(b, a, NOW).progress.decor).toEqual(m.progress.decor);
      // Only grows: what both saw and neither owns is still seen.
      for (const id of a.progress.decor.seen ?? []) if (!owned.has(id)) expect(m.progress.decor.seen).toContain(id);
    }
  });
});

// -- Ad encounters in a running game ---------------------------------------------------------------

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const rooms = APARTMENT.rooms;
const main: Level = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "doomscroll") };

function start() {
  const game = new Game(main, { rooms: { ...rooms, main }, random: (() => { const q = [0.1, 0.01]; return () => (q.length ? q.shift()! : 0.5); })() });
  game.deliveries.advance(60);
  const spot = taskSpots(main).find((s) => s.id === "doomscroll")!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  game.update(dt, press);
  for (let i = 0; i < 60 * 30 && game.interaction.active && !game.interaction.active.item.encounter; i++) game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  for (let i = 0; i < 120 && !game.dialogOpen; i++) game.update(dt, NO_INPUT);
  expect(game.interaction.active?.item.encounter).toBe(true);
  return game;
}
function pick(game: Game, label: string) {
  const v = game.dialogView;
  if (v?.kind !== "menu") throw new Error("no menu");
  const index = v.choices.indexOf(label);
  for (let i = 0; i < ((index - v.cursor + v.choices.length) % v.choices.length); i++) game.update(dt, { ...NO_INPUT, dirPressed: "down" });
  game.update(dt, press);
}
function finish(game: Game) {
  for (let i = 0; i < 600 && (game.dialogOpen || game.interaction.active?.item.encounter); i++) game.update(dt, game.dialogOpen ? press : NO_INPUT);
}

describe("ad encounters mark an item seen when it is shown and not added", () => {
  it("Ignore marks it; the robin print is a silhouette", () => {
    const g = start();
    expect(g.decor.hasSeen("art-robin")).toBe(false);
    pick(g, "IGNORE");
    finish(g);
    expect(sil(g.decor)).toEqual(["art-robin"]);
  });
  it("a hide-ad (successful or not) marks it", () => {
    const g = start();
    pick(g, "HIDE AD");
    finish(g);
    expect(g.decor.hasSeen("art-robin")).toBe(true);
  });
  it("Escape once the card is up marks it too", () => {
    const g = start();
    g.update(dt, esc);
    for (let i = 0; i < 120; i++) g.update(dt, NO_INPUT);
    expect(g.decor.hasSeen("art-robin")).toBe(true);
  });
  it("Add to cart does not: the item is on its way, not a gap; it never becomes a silhouette", () => {
    const g = start();
    pick(g, "ADD TO CART");
    finish(g);
    expect(g.decor.hasSeen("art-robin")).toBe(false);
    expect(sil(g.decor)).toEqual([]);
  });
  it("an ad for something you own marks nothing", () => {
    const g = new Game(main, { rooms: { ...rooms, main }, random: (() => { const q = [0.1, 0.01]; return () => (q.length ? q.shift()! : 0.5); })() });
    g.decor.own("art-robin");
    g.deliveries.advance(60);
    const spot = taskSpots(main).find((s) => s.id === "doomscroll")!;
    g.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    g.update(dt, NO_INPUT);
    g.update(dt, press);
    for (let i = 0; i < 60 * 40; i++) g.update(dt, g.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
    expect(g.decor.toJSON().seen).toBeUndefined();
  });
});

describe("saving and resetting", () => {
  class Keys implements Listenable<KeyEventLike> {
    addEventListener() {}
  }
  it("seen is saved with the progress, comes back after a reload and goes with a reset", () => {
    const storage = new FakeStorage();
    const g1 = new Game(rooms[APARTMENT.start], { rooms });
    const f1 = new AchievementsFeature(g1, { storage, keys: new Keys() });
    g1.decor.markSeen("art-canoes");
    f1.save?.();
    const g2 = new Game(rooms[APARTMENT.start], { rooms });
    new AchievementsFeature(g2, { storage, keys: new Keys() });
    expect(sil(g2.decor)).toEqual(["art-canoes"]);
    f1.reset();
    expect(sil(g1.decor)).toEqual([]);
  });
});
