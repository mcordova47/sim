import { describe, expect, it } from "vitest";
import options from "../../art/options/options.json";
import { APARTMENT } from "./apartment";
import { TILE } from "./config";

// Issue 166 (d3): the rug layouts on the options page (art/options/options.json, group "rugs"). They are candidates, not in
// the game, but each must be a place a rug could really lie: on floor and furniture only, never on a wall, the package
// tile or the front door, and never solid (a floor prop is not a solid, so walking is unchanged).

const main = APARTMENT.rooms.main;
const group = options.groups.find((g) => g.id === "rugs")! as unknown as {
  layouts: { letter: string; tile: { col: number; row: number; w: number; h: number }; designs: { id: string; src: string; shipped?: boolean }[] }[];
};
const sources = import.meta.glob("/art/options/rugs/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const real = import.meta.glob("/art/src/rug-*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const source = (src: string) => sources[`/${src}`] ?? real[`/${src}`];

describe("rug layouts (options page)", () => {
  it("has the layouts A to E, with A the rug as built", () => {
    expect(group.layouts.map((l) => l.letter)).toEqual(["A", "B", "C", "D", "E"]);
    expect(group.layouts[0].tile).toEqual({ col: 3, row: 3, w: 4, h: 2 });
    expect(group.layouts.every((l) => l.designs.length >= 2)).toBe(true);
  });

  it("Marc picked C and D: the shipped designs are marked (built into the game; main and bed are different designs); A, B and E are out", () => {
    const by = (L: string) => group.layouts.find((l) => l.letter === L)! as (typeof group.layouts)[number] & { out?: boolean; designs: { id: string; shipped?: boolean }[] };
    const chosen = { C: ["C1", "C4", "C5", "C8", "C10"], D: ["D2", "D3", "D7", "D9", "D11"] };
    for (const L of ["C", "D"] as const) {
      expect(by(L).out).toBeUndefined();
      expect(by(L).designs.filter((d) => d.shipped).map((d) => d.id)).toEqual(chosen[L]);
      // The rest are candidates that are not in the game.
      const candidates = { C: ["C2", "C3", "C6", "C9", "C11", "C12"], D: ["D1", "D4", "D5", "D6", "D8", "D10", "D12"] };
      expect(by(L).designs.filter((d) => !d.shipped).map((d) => d.id)).toEqual(candidates[L]);
    }
    for (const L of ["A", "B", "E"]) expect(by(L).out).toBe(true);
  });

  it("every design is a sprite exactly as big as its footprint", () => {
    for (const l of group.layouts.filter((l) => !(l as { out?: boolean }).out)) for (const d of l.designs) {
      const text = source(d.src);
      expect(text, d.src).toBeDefined();
      const m = /^size: (\d+)x(\d+)/m.exec(text)!;
      expect([Number(m[1]), Number(m[2])], d.id).toEqual([l.tile.w * TILE, l.tile.h * TILE]);
      const rows = text.split("\n").filter((r) => r !== "" && !r.startsWith("#") && !r.startsWith("size:"));
      expect(rows.length, d.id).toBe(l.tile.h * TILE);
      for (const r of rows) expect(r, d.id).toMatch(new RegExp(`^[.1-9a-m]{${l.tile.w * TILE}}$`)); // palette keys only
    }
  });

  it("no layout covers a wall, the package tile (col 10, row 8) or the front door, and each stays inside the room", () => {
    const solidWalls = new Set(main.solids.filter((s) => !main.pieces.some((p) => p.tiles.some((t) => t.col * TILE === s.x && t.row * TILE === s.y))).map((s) => `${s.x / TILE},${s.y / TILE}`));
    const doors = new Set(main.doors.map((d) => `${d.col},${d.row}`));
    for (const l of group.layouts) {
      const { col, row, w, h } = l.tile;
      expect(col + w, l.letter).toBeLessThanOrEqual(main.size.width / TILE);
      expect(row + h, l.letter).toBeLessThanOrEqual(main.size.height / TILE);
      for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) {
        const k = `${c},${r}`;
        expect(solidWalls.has(k), `${l.letter} covers a wall at ${k}`).toBe(false);
        expect(doors.has(k), `${l.letter} covers a door at ${k}`).toBe(false);
        expect(k === "10,8", `${l.letter} covers the package tile`).toBe(false);
      }
    }
  });

  it("covers only places a rug could lie: no tile of any layout is a piece that must show (windows, radiator, bookshelf, bed head)", () => {
    const forbidden = new Set(["radiator", "cube bookshelf", "nightstand", "record stand"]);
    for (const l of group.layouts) {
      const { col, row, w, h } = l.tile;
      for (const p of main.pieces) {
        if (!forbidden.has(p.name)) continue;
        const hit = p.tiles.some((t) => t.col >= col && t.col < col + w && t.row >= row && t.row < row + h);
        expect(hit, `${l.letter} lies on the ${p.name}`).toBe(false);
      }
    }
  });
});
