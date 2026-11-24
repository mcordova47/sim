import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite } from "./sprite-lib.mjs";
import { FILES, HEADER_MARK, generateOutfit, loadOutfits } from "./outfits.mjs";

// Issue 158: generated outfit sprites.
const srcDir = join(root, "art", "src");
const palette = Object.keys(JSON.parse(readFileSync(join(root, "art", "palette.json"), "utf8")).colors);
const read = (name) => readFileSync(join(srcDir, `${name}.sprite`), "utf8");

describe("generated outfits", () => {
  for (const def of loadOutfits()) {
    const files = generateOutfit(def, read);
    it(`${def.id}: 12 files, each 16x16 with palette keys only, checked in as generated`, () => {
      expect(Object.keys(files)).toEqual(FILES.map((f) => `${def.prefix}-${f}`));
      for (const [name, text] of Object.entries(files)) {
        const parsed = parseSprite(`${name}.sprite`, text);
        expect(parsed.errors, name).toEqual([]);
        expect([parsed.width, parsed.height], name).toEqual([16, 16]);
        const body = text.split("\n").filter((l) => l && !l.startsWith("#") && !l.startsWith("size"));
        expect(body.length, name).toBe(16);
        for (const row of body) for (const c of row) expect(c === "." || palette.includes(c), `${name} key ${c}`).toBe(true);
        expect(text.startsWith(`# ${HEADER_MARK}`)).toBe(true);
        expect(read(name), `${name} is out of date: run npm run sprites`).toBe(text);
      }
    });
    it(`${def.id}: only the torso (and legs, if recoloured) differ from the template`, () => {
      for (const f of FILES) {
        const t = read(`${def.template}-${f}`).split("\n").filter((l) => /^[.0-9a-m]{16}$/.test(l));
        const g = files[`${def.prefix}-${f}`].split("\n").filter((l) => /^[.0-9a-m]{16}$/.test(l));
        const changed = g.map((r, i) => (r !== t[i] ? i : -1)).filter((i) => i >= 0);
        expect(Math.min(...changed), f).toBeGreaterThanOrEqual(7);
        const belowTorso = def.hem || def.legStripes || Object.keys(def.legs ?? {}).length > 0; // recoloured legs or a hem change rows 12 to 15
        expect(Math.max(...changed), f).toBeLessThanOrEqual(belowTorso ? 15 : 11);
      }
    });
  }
  it("has no generated file without a data entry", () => {
    const expected = new Set(loadOutfits().flatMap((d) => FILES.map((f) => `${d.prefix}-${f}.sprite`)));
    const gen = readdirSync(srcDir).filter((f) => f.endsWith(".sprite") && read(f.replace(/\.sprite$/, "")).includes(HEADER_MARK));
    for (const f of gen) expect(expected.has(f), f).toBe(true);
  });
  it("does not touch the hand-drawn outfits", () => {
    for (const p of ["player-casual", "player-out", "player-pajamas"]) expect(read(`${p}-idle-down`)).not.toContain(HEADER_MARK);
  });
  it("dresses the 159 outfits: sleeves, a hem over the legs, vertical stripes (palette keys, no outline pixels lost)", () => {
    const byId = Object.fromEntries(loadOutfits().map((d) => [d.id, d]));
    const robe = generateOutfit(byId["pajamas-robe"], read)["player-pajamas-robe-idle-down"].split("\n").filter((l) => /^[.0-9a-m]{16}$/.test(l));
    expect(robe[12]).toContain("666666"); // the robe covers the top of the legs
    expect(robe[14]).toContain("a"); // bare ankles below it
    const stripes = generateOutfit(byId["pajamas-striped"], read)["player-pajamas-striped-idle-up"].split("\n").filter((l) => /^[.0-9a-m]{16}$/.test(l));
    expect(stripes[8]).toMatch(/(i6|6i){3}/); // alternating columns, not rows
    expect(stripes[8].slice(4, 12)).toBe(stripes[9].slice(4, 12)); // the body columns line up row to row
  });
  it("applies hand-drawn overlay rows and rejects a bad one", () => {
    const def = { ...loadOutfits()[0], overlays: { "idle-down": { 6: "dddddddddddddddd" } } };
    expect(generateOutfit(def, read)[`${def.prefix}-idle-down`]).toContain("\ndddddddddddddddd\n");
    expect(() => generateOutfit({ ...def, overlays: { "idle-down": { 6: "ddd" } } }, read)).toThrow(/16 wide/);
    expect(() => generateOutfit({ ...def, overlays: { "idle-dwon": { 6: "dddddddddddddddd" } } }, read)).toThrow(/unknown file/); // a misspelt file name is an error (issue 158 review)
  });
});
