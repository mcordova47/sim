import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { SwapDecorActivity } from "./activities/swap-decor";
import { Decor } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, GIFT_ITEMS, type DecorData, type DecorItem } from "./decor-data";
import { OUTFITS, outfitFromItem, outfitItemId, outfitPrefix, outfitStyle, type OutfitDef, type OutfitStyle } from "./outfits";
import { STATE_VARS } from "./state-vars";

// Issue 156: many outfits, each with a style attribute. The shipped list is still the four; these tests
// use a made-up list of ten so nothing depends on art that is not drawn yet.

const STYLES: OutfitStyle[] = ["home", "casual", "casual", "casual", "out", "out", "out", "pajamas", "pajamas", "pajamas"];
const MANY: OutfitDef[] = STYLES.map((style, i) => ({ id: `t${i}`, name: `TEST OUTFIT ${i}`, style, prefix: i === 0 ? "player" : `player-t${i}` }));

describe("outfit data", () => {
  it("has a unique id, name and prefix for each outfit, a known style, and the first four in their old places", () => {
    for (const k of ["id", "name", "prefix"] as const) expect(new Set(OUTFITS.map((o) => o[k])).size).toBe(OUTFITS.length);
    for (const o of OUTFITS) expect(["home", "casual", "out", "pajamas", "robe"]).toContain(o.style);
    expect(OUTFITS.slice(0, 4).map((o) => [o.id, o.style, o.prefix])).toEqual([
      ["home", "home", "player"],
      ["casual", "casual", "player-casual"],
      ["out", "out", "player-out"],
      ["pajamas", "pajamas", "player-pajamas"],
    ]);
    expect(OUTFITS[0].id).toBe("home");
  });

  it("keeps the `outfit` variable's range as wide as the list, so no outfit number is clamped away", () => {
    const v = STATE_VARS.find((x) => x.id === "outfit")!;
    expect(v.initial).toBe(0);
    expect(v.max).toBe(OUTFITS.length - 1);
  });

  it("uses neutral names (no gendered words)", () => {
    for (const o of OUTFITS) expect(o.name).not.toMatch(/\b(MEN|WOMEN|MAN|WOMAN|BOY|GIRL|MENS|WOMENS|LADIES|GENTLEMEN|HIS|HER)\b/);
  });
});

describe("many outfits", () => {
  it("map items to numbers, prefixes and styles by position, whatever the style", () => {
    expect(outfitFromItem("outfit-t5", MANY)).toBe(5);
    expect(outfitPrefix(5, MANY)).toBe("player-t5");
    expect(outfitStyle(5, MANY)).toBe("out");
    expect(outfitStyle(3, MANY)).toBe("casual");
    // Several of one style are distinct outfits.
    expect(new Set([1, 2, 3].map((i) => outfitPrefix(i, MANY))).size).toBe(3);
    // Unknown things are the everyday clothes.
    expect(outfitFromItem("outfit-nope", MANY)).toBe(0);
    expect(outfitFromItem(undefined, MANY)).toBe(0);
    expect(outfitPrefix(99, MANY)).toBe("player");
    expect(outfitStyle(-3, MANY)).toBe("home");
    expect(MANY.map((o) => outfitItemId(o))).toContain("outfit-t9");
  });

  it("only name a style; nothing in the shipped list ranks one outfit over another", () => {
    // The only field of an outfit that is not a name or a file is `style`, and it is not a number.
    for (const o of OUTFITS) expect(Object.keys(o).sort()).toEqual(["id", "name", "prefix", "style"]);
  });
});

// A decor with the `worn` slot and a made-up item for each outfit.
function manyDecor(): { decor: Decor; items: DecorItem[] } {
  const items: DecorItem[] = MANY.map((o, i) => ({
    id: outfitItemId(o),
    name: o.name,
    kind: "outfit",
    sprite: "player-idle-down",
    w: 16,
    h: 16,
    color: "dusk",
    how: i === 0 ? "start" : "gift",
    from: i === 0 ? "ALREADY HERE" : "A PACKAGE",
    note: `NOTE ${i}`,
  }));
  const worn = { ...DECOR_DATA.slots.find((s) => s.id === "worn")!, default: outfitItemId(MANY[0]) };
  const data: DecorData = { slots: [worn], items, families: DECOR_DATA.families };
  return { decor: new Decor(data), items };
}

const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down" };
const up: Controls = { ...NO_INPUT, dirPressed: "up", dir: "up" };
const press: Controls = { ...NO_INPUT, interactPressed: true };

describe("the Change clothes list with many outfits", () => {
  const host = { setState() {} } as never;

  it("lists every owned outfit, previews each as the cursor moves and wraps both ways", () => {
    const { decor, items } = manyDecor();
    for (const i of items) decor.own(i.id);
    expect(decor.choices("worn").map((i) => i.id)).toEqual(items.map((i) => i.id));
    const a = new SwapDecorActivity("worn", decor, host);
    expect(a.cursor).toBe(0);
    a.update(0, down);
    expect(decor.shownIn("worn")!.id).toBe("outfit-t1");
    for (let i = 0; i < 8; i++) a.update(0, down);
    expect(a.cursor).toBe(9);
    expect(decor.shownIn("worn")!.id).toBe("outfit-t9");
    a.update(0, down);
    expect(a.cursor).toBe(0);
    a.update(0, up);
    expect(a.cursor).toBe(9);
    expect(decor.heldIn("worn")!.id).toBe("outfit-t0");
  });

  it("puts the highlighted outfit on with E", () => {
    const { decor, items } = manyDecor();
    for (const i of items) decor.own(i.id);
    const a = new SwapDecorActivity("worn", decor, host);
    for (let i = 0; i < 6; i++) a.update(0, down);
    a.update(0, press);
    expect(a.done).toBe(true);
    expect(decor.heldIn("worn")!.id).toBe("outfit-t6");
    expect(outfitFromItem(decor.shownIn("worn")!.id, MANY)).toBe(6);
  });

  it("shows each outfit as its own entry in THINGS, with its note", () => {
    const { decor, items } = manyDecor();
    for (const i of items) decor.own(i.id);
    const entries = decor.entries().filter((e) => e.item.kind === "outfit");
    expect(entries.map((e) => e.item.id)).toEqual(items.map((i) => i.id));
    for (const [i, e] of entries.entries()) expect(e.item.note).toBe(`NOTE ${i}`);
  });

  it("keeps the worn outfit through a save and load, however many there are", () => {
    const { decor, items } = manyDecor();
    for (const i of items) decor.own(i.id);
    decor.place("worn", "outfit-t8");
    const loaded = manyDecor().decor;
    loaded.load(JSON.parse(JSON.stringify(decor.toJSON())));
    expect(loaded.heldIn("worn")!.id).toBe("outfit-t8");
    expect(loaded.choices("worn")).toHaveLength(10);
  });
});

describe("the shipped outfit items", () => {
  it("are all outfit-kind items that fit the worn slot", () => {
    const items = [...DECOR_ITEMS, ...GIFT_ITEMS].filter((i) => i.kind === "outfit");
    expect(items).toHaveLength(OUTFITS.length);
    for (const i of items) expect([i.w, i.h]).toEqual([16, 16]);
  });
});
