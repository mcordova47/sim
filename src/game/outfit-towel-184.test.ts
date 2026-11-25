import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../render/font";
import { Decor, parseDecor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS } from "./decor-data";
import { itemPool } from "./encounter-draw";
import { LADDER } from "./encounter-ladder";
import { OUTFITS, outfitFromItem, outfitItemId, slotOfItem } from "./outfits";

// Issue 184: the bath towel, a starting outfit in the ROBE slot. The shower integration is in shower.test.ts.

const TOWEL = "outfit-towel";
const ROBE = "outfit-pajamas-robe";
const HOODIE = "outfit-casual-hoodie";
const sprites = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const outfitData = import.meta.glob("/art/outfits.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const towel = DECOR_ITEMS.find((i) => i.id === TOWEL)!;

describe("the bath towel item", () => {
  it("is a starting robe-style outfit with a deadpan capitals note, last in the outfit list so saved numbers keep their meaning", () => {
    expect(towel).toBeDefined();
    expect(towel.name).toBe("BATH TOWEL");
    expect(towel.how).toBe("start");
    expect(towel.sprite).toBe("player-towel-idle-down");
    expect(towel.note!.length).toBeLessThanOrEqual(80);
    expect(towel.note).toBe(towel.note!.toUpperCase());
    expect(unsupportedChars(`${towel.name}${towel.note}${towel.from}`)).toEqual([]);
    expect(OUTFITS.at(-1)).toMatchObject({ id: "towel", style: "robe", prefix: "player-towel" });
    expect(OUTFITS.findIndex((o) => o.id === "pajamas-robe")).toBe(12);
    expect(outfitFromItem(TOWEL)).toBe(13);
    expect(slotOfItem(TOWEL)).toBe("robe");
  });

  it("has the 12 walking sprites and the 5 poses", () => {
    const files = ["down", "up", "left", "right"].flatMap((d) => [`idle-${d}`, `walk-${d}-1`, `walk-${d}-2`]).concat(["sit-sofa", "type-desk", "eat-table", "guitar", "read-sofa"]);
    for (const f of files) expect(`/public/sprites/player-towel-${f}.png` in sprites, f).toBe(true);
  });

  it("is not in the ads' pool or on the ladder (it is a starting item)", () => {
    expect(itemPool(DECOR_DATA.items).some((i) => i.id === TOWEL)).toBe(false);
    expect(JSON.stringify(LADDER)).not.toContain(TOWEL);
  });
});

describe("a fresh game and old saves", () => {
  it("owns the towel and starts with it in the ROBE slot; the everyday clothes are still worn", () => {
    const d = new Decor();
    expect(d.owns(TOWEL)).toBe(true);
    expect(d.equippedIn("robe")).toBe(TOWEL);
    expect(d.resolveOutfit("robe")).toBe(TOWEL);
    expect(d.heldIn("worn")?.id).toBe("outfit-home");
    expect(Object.keys(d.toJSON())).toEqual(["owned", "placed"]);
  });

  it("an old save without the towel gains it as owned and equipped in ROBE, and what it wore stays valid", () => {
    const d = new Decor();
    d.load({ owned: [HOODIE], placed: { worn: HOODIE } });
    expect(d.owns(TOWEL)).toBe(true);
    expect(d.equippedIn("robe")).toBe(TOWEL);
    expect(d.heldIn("worn")?.id).toBe(HOODIE);
    expect(parseDecor({ owned: [HOODIE], placed: { worn: HOODIE } }).owned).toContain(TOWEL);
  });

  it("an old save that already wears or equips the bathrobe keeps it; the towel is still a choice (d2)", () => {
    const d = new Decor();
    d.load({ owned: [ROBE], placed: { worn: ROBE }, outfits: { equipped: { robe: ROBE } } });
    expect(d.equippedIn("robe")).toBe(ROBE);
    expect(d.heldIn("worn")?.id).toBe(ROBE);
    expect(d.slotChoices("robe").map((i) => i.id)).toEqual([ROBE, TOWEL]);
    expect(d.equip("robe", TOWEL)).toBe(true);
    const e = new Decor();
    e.load(JSON.parse(JSON.stringify(d.toJSON())));
    expect(e.equippedIn("robe")).toBe(TOWEL);
    expect(e.heldIn("worn")?.id).toBe(TOWEL);
  });

  it("an old save that owns the bathrobe but never equipped the robe slot keeps the bathrobe in it, as before (OUTFITS order)", () => {
    const d = new Decor();
    d.load({ owned: [ROBE], placed: {} });
    // Auto-fill takes the first owned robe in OUTFITS order, so a save that has the bathrobe keeps shower-to-bathrobe; the towel stays a choice.
    expect(d.equippedIn("robe")).toBe(ROBE);
    expect(d.owns(TOWEL)).toBe(true);
  });

  it("the towel is never a reason to offer a change at the bookshelf in a fresh game", () => {
    const d = new Decor();
    expect(d.canChange("worn")).toBe(false);
    d.own(HOODIE);
    expect(d.canChange("worn")).toBe(true);
  });
});

describe("the generated art", () => {
  it("is generated from art/outfits.json (an entry with id towel and the wrap rule)", () => {
    const def = JSON.parse(outfitData["/art/outfits.json"]).outfits.find((o: { id: string }) => o.id === "towel");
    expect(def.prefix).toBe("player-towel");
    expect(def.torso.rule).toBeDefined();
    expect(outfitItemId(OUTFITS.find((o) => o.id === "towel")!)).toBe(TOWEL);
  });
});
