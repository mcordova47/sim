import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const sprite = (name, size, rows) => parseSprite(`${name}.sprite`, `size: ${size}\n${rows.join("\n")}\n`);
const row = (c, n = 16) => c.repeat(n);

describe("parseSprite", () => {
  it("accepts a valid 16x16 sprite", () => {
    expect(sprite("player-idle-down", "16x16", Array(16).fill(row("1"))).errors).toEqual([]);
  });
  it("rejects sizes that are not a tile multiple", () => {
    expect(sprite("a", "16x20", Array(20).fill(row("1"))).errors.join()).toMatch(/multiple/);
  });
  it("rejects unknown palette keys", () => {
    const rows = Array(16).fill(row("1"));
    rows[3] = "1".repeat(15) + "z";
    expect(sprite("a", "16x16", rows).errors.join()).toMatch(/not in the palette/);
  });
  it("rejects wrong row width and row count", () => {
    expect(sprite("a", "16x16", [...Array(15).fill(row("1")), row("1", 15)]).errors.length).toBe(1);
    expect(sprite("a", "16x16", Array(15).fill(row("1"))).errors.join()).toMatch(/15 rows/);
  });
  it("rejects names that are not lowercase kebab-case", () => {
    const rows = Array(16).fill(row("1"));
    for (const bad of ["Bed", "bed_made", "bed--made", "bed-"]) {
      expect(sprite(bad, "16x16", rows).errors.join()).toMatch(/kebab-case/);
    }
    for (const good of ["bed-made", "dishes-2", "player-walk-down-1"]) {
      expect(sprite(good, "16x16", rows).errors).toEqual([]);
    }
  });
});

describe("rasterize and encodePng", () => {
  it("makes only opaque palette pixels or fully transparent ones", () => {
    const rows = Array(16).fill(row("."));
    rows[0] = "1" + row(".", 15);
    const img = rasterize(sprite("a", "16x16", rows));
    const alphas = new Set();
    for (let i = 3; i < img.rgba.length; i += 4) alphas.add(img.rgba[i]);
    expect([...alphas].sort()).toEqual([0, 255]);
    expect(encodePng(img).subarray(1, 4).toString()).toBe("PNG");
  });
});

describe("art/src", () => {
  const dir = join(root, "art", "src");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sprite"));
  it.each(files)("%s is valid", (f) => {
    expect(parseSprite(f, readFileSync(join(dir, f), "utf8")).errors).toEqual([]);
  });
});
