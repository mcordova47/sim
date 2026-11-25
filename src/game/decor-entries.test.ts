import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../render/font";
import { Decor, parseDecor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, FROM_MAX, GIFT_ITEMS, NOTE_MAX, isTestItem } from "./decor-data";

// Issue 109a: the entries behind the browsable inventory.

// The starting things in the order they are owned: each slot's default, then the rest (the empty pots, issue 182).
const START = ["art-barn", "art-abstract", "art-silkscreen", "plant-vase-dried", "plant-bowl-empty", "plant-snake", "lamp-table", "pantry-bins", "outfit-home", "coffee-pourover", "plant-pot-empty", "plant-vase-empty"];

const ids = (d: Decor) => d.entries().map((e) => e.item.id);

describe("Decor.entries", () => {
  it("lists the starting things in a fresh game, pantry and plant included", () => {
    expect(ids(new Decor())).toEqual(START);
  });

  it("follows the order you got things, new things at the end", () => {
    const d = new Decor();
    d.own("art-snow-wagon");
    d.own("lamp-warm");
    d.own("art-robin");
    expect(ids(d).slice(START.length)).toEqual(["art-snow-wagon", "lamp-warm", "art-robin"]);
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
    expect(ids(d)).toEqual([...START, "art-robin"]);
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
    // The three pots and their empties (issue 182): all ALREADY HERE, all changed at the one bookshelf.
    for (const id of ["plant-vase-dried", "plant-vase-empty", "plant-bowl-empty", "plant-pot-empty"]) {
      expect(by(id).from, id).toBe("FROM: ALREADY HERE");
      expect(by(id).changeAt, id).toBe("CHANGE IT AT THE CUBE BOOKSHELF");
    }
    expect(by("plant-vase-dried").where).toBe("IN THE VASE");
    expect(by("plant-bowl-empty").where).toBe("IN THE BOWL");
    expect(by("plant-vase-empty").where).toBe("IN THE INVENTORY");
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
  it("the longest note is within the limit with some room (80, the entry box wraps it over several rows)", () => {
    expect(NOTE_MAX).toBe(80);
    expect(Math.max(...real.map((i) => i.note!.length))).toBeLessThanOrEqual(NOTE_MAX);
  });
  it("say nothing about counts, totals or what is missing", () => {
    // Marc's own words from the text review (issue 143) are not counts of the collection: a print number,
    // a joke score and three phrases with "of". They are the only things taken out before the check.
    const MARC_PHRASES = ["NUM. 1/12", "+5 NOSTALGIA", "SENSE OF PRIDE", "A LANDSCAPE OF", "A HABIT OF"];
    let text = real.map((i) => `${i.note} ${i.from}`).join(" ");
    for (const phrase of MARC_PHRASES) text = text.replace(phrase, "");
    expect(text).not.toMatch(/\d|\bMORE\b|MISSING|\bALL\b|COLLECT|\bSET\b|\bOF\b/);
  });
});
