import { describe, expect, it } from "vitest";
import { ENCOUNTERS } from "./config";
import { DECOR_DATA } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { itemPool } from "./encounter-draw";
import { LADDER, failChanceOf, ladderOrder, tierOf } from "./encounter-ladder";

// Issue 183: the ladder is a data list, and this is the test that fails loudly when an item is not on it.

describe("the ladder", () => {
  const pool = itemPool(DECOR_DATA.items);
  const ids = LADDER.map(([id]) => id);

  it("lists every real item the ads can sell: a new item must be placed on the ladder (add a line to LADDER in encounter-ladder.ts)", () => {
    const missing = pool.map((i) => i.id).filter((id) => !ids.includes(id));
    expect(missing, `NOT ON THE LADDER, add these to LADDER in src/game/encounter-ladder.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists only items that exist in the pool (no typo, no TEST item, no starting item, no empty pot), each once", () => {
    const real = new Set(pool.map((i) => i.id));
    for (const id of ids) expect(real.has(id), `${id} is not a pool item`).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(pool.length);
  });

  it("starts from the gift-day order: the checkpoint gifts of a kind keep their order, and Marc's example order holds", () => {
    const gifts = CHECKPOINTS.filter((c) => c.stat === "days").flatMap((c) => [c.item].flat()).filter((id) => ids.includes(id));
    for (const kind of ["art", "plant", "outfit", "trinket", "coffee"]) {
      const positions = gifts.filter((g) => g.startsWith(`${kind}-`)).map((g) => ids.indexOf(g));
      expect(positions, kind).toEqual([...positions].sort((a, b) => a - b));
    }
    const at = (id: string) => ids.indexOf(id);
    expect(at("plant-pothos")).toBeLessThan(at("outfit-pajamas"));
    expect(at("outfit-pajamas")).toBeLessThan(at("rug-shag"));
    expect(at("rug-shag")).toBeLessThan(at("trinket-alebrije-cat"));
    expect(at("rug-shag")).toBeGreaterThan(at("trinket-alebrije"));
  });

  it("puts an item that is not listed at the end, in the order given, and leaves the listed ones in ladder order", () => {
    const items = [{ id: "plant-new" }, { id: "rug-shag" }, { id: "art-robin" }, { id: "art-newer" }];
    expect(ladderOrder(items).map((i) => i.id)).toEqual(["art-robin", "rug-shag", "plant-new", "art-newer"]);
  });

  it("every item has a tier: easy, normal (the default) or hard; the unlisted are normal", () => {
    for (const [id, tier] of LADDER) expect(["easy", "normal", "hard", undefined], id).toContain(tier);
    expect(tierOf("art-robin")).toBe("normal");
    expect(tierOf("art-great-wave")).toBe("hard");
    expect(tierOf("plant-pothos")).toBe("easy");
    expect(tierOf("not-listed")).toBe("normal");
    expect(failChanceOf("plant-pothos")).toBe(ENCOUNTERS.failure.chance.easy);
    expect(failChanceOf("rug-kilim")).toBe(ENCOUNTERS.failure.chance.hard);
    expect(failChanceOf("art-robin")).toBe(0.2);
    expect(ENCOUNTERS.failure.chance).toEqual({ easy: 0.1, normal: 0.2, hard: 0.4 });
    for (const t of ["easy", "hard"] as const) expect(LADDER.some(([, tier]) => tier === t), t).toBe(true);
  });
});
