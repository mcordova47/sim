import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../render/font";
import { Decor, parseDecor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, FROM_MAX, GIFT_ITEMS, NOTE_MAX, isTestItem } from "./decor-data";

// Issue 109a: the entries behind the browsable inventory.

const ids = (d: Decor) => d.entries().map((e) => e.item.id);

describe("Decor.entries", () => {
  it("lists the starting things in a fresh game, pantry and plant included", () => {
    expect(ids(new Decor())).toEqual(["art-barn", "art-abstract", "art-silkscreen", "plant-snake", "lamp-table", "pantry-bins"]);
  });

  it("follows the order you got things, new things at the end", () => {
    const d = new Decor();
    d.own("art-snow-wagon");
    d.own("lamp-warm");
    d.own("art-robin");
    expect(ids(d).slice(6)).toEqual(["art-snow-wagon", "lamp-warm", "art-robin"]);
  });

  it("keeps that order through a save and a load", () => {
    const d = new Decor();
    d.own("art-canoes");
    d.own("plant-dried");
    d.own("art-robin");
    const e = new Decor();
    e.load(JSON.parse(JSON.stringify(d.toJSON())));
    expect(ids(e)).toEqual(ids(d));
  });

  it("never lists test items or ids this build does not know", () => {
    const d = new Decor();
    d.own("art-test-barn");
    d.own("lamp-test-stool-lamp");
    d.load({ owned: ["art-barn", "art-from-the-future", "plant-test-grown", "art-robin"], placed: {} });
    expect(ids(d)).toEqual(["art-barn", "art-abstract", "art-silkscreen", "plant-snake", "lamp-table", "pantry-bins", "art-robin"]);
    expect(d.entries().some((e) => isTestItem(e.item))).toBe(false);
  });

  it("says where a placed item is, and what changes it", () => {
    const e = new Decor().entries();
    const by = (id: string) => e.find((x) => x.item.id === id)!;
    expect(by("art-barn").where).toBe("ON THE TABLE WALL");
    expect(by("art-barn").changeAt).toBe("CHANGE IT AT THE DINING TABLE");
    expect(by("plant-snake").where).toBe("ON THE SHELF");
    expect(by("plant-snake").changeAt).toBe("CHANGE IT AT THE CUBE BOOKSHELF");
    expect(by("lamp-table").changeAt).toBe("CHANGE IT AT THE LAMP TABLE");
  });

  it("says IN THE INVENTORY for an item shown nowhere, and where to change it", () => {
    const d = new Decor();
    d.own("art-robin");
    const robin = d.entries().find((x) => x.item.id === "art-robin")!;
    expect(robin.where).toBe("IN THE INVENTORY");
    expect(robin.changeAt).toBe("CHANGE IT AT THE DINING TABLE OR THE STANDING DESK");
  });

  it("follows a swap", () => {
    const d = new Decor();
    d.own("art-robin");
    d.place("art-table", "art-robin");
    const e = d.entries();
    expect(e.find((x) => x.item.id === "art-robin")!.where).toBe("ON THE TABLE WALL");
    expect(e.find((x) => x.item.id === "art-barn")!.where).toBe("IN THE INVENTORY");
  });

  it("has no change line for the pantry (nothing in the room changes it)", () => {
    const pantry = new Decor().entries().find((x) => x.item.id === "pantry-bins")!;
    expect(pantry.where).toBe("IN THE PANTRY");
    expect(pantry.changeAt).toBeUndefined();
  });

  it("gives a from line, authored or from `how`", () => {
    const d = new Decor();
    d.own("art-robin");
    const e = d.entries();
    expect(e.find((x) => x.item.id === "art-barn")!.from).toBe("FROM: ALREADY HERE");
    expect(e.find((x) => x.item.id === "art-robin")!.from).toBe("FROM: A PACKAGE");
    const data = { ...DECOR_DATA, items: DECOR_DATA.items.map((i) => (i.id === "art-robin" ? { ...i, from: undefined } : i)) };
    const f = new Decor(data);
    f.own("art-robin");
    expect(f.entries().find((x) => x.item.id === "art-robin")!.from).toBe("FROM: A GIFT");
  });

  it("changes no save and exposes no count", () => {
    const d = new Decor();
    d.own("art-robin");
    const before = JSON.stringify(d.toJSON());
    d.entries();
    expect(JSON.stringify(d.toJSON())).toBe(before);
    expect(Object.keys(d.entries()[0]).sort()).toEqual(["changeAt", "from", "item", "where"]);
    expect(parseDecor(d.toJSON()).owned).toEqual(JSON.parse(before).owned);
  });
});

describe("the item lines", () => {
  const real = [...DECOR_ITEMS, ...GIFT_ITEMS];
  it("every real item has a note and a from", () => {
    for (const i of real) {
      expect(i.note, i.id).toBeTruthy();
      expect(i.from, i.id).toBeTruthy();
    }
  });
  it("fit the font and the box, and are not duplicated", () => {
    for (const i of real) {
      for (const [t, max] of [[i.note!, NOTE_MAX], [i.from!, FROM_MAX]] as const) {
        expect(unsupportedChars(t), i.id).toEqual([]);
        expect(t.length, i.id).toBeLessThanOrEqual(max);
        expect(t, i.id).toBe(t.toUpperCase());
      }
    }
    expect(new Set(real.map((i) => i.note)).size).toBe(real.length);
  });
  it("say nothing about counts, totals or what is missing", () => {
    const text = real.map((i) => `${i.note} ${i.from}`).join(" ");
    expect(text).not.toMatch(/\d|\bMORE\b|MISSING|\bALL\b|COLLECT|\bSET\b|\bOF\b/);
  });
});
