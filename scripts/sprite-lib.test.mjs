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

describe("player sprites (home outfit)", () => {
  const dir = join(root, "art", "src");
  const load = (name) => rasterize(parseSprite(name, readFileSync(join(dir, `${name}.sprite`), "utf8")));
  const diff = (a, b) => {
    let n = 0;
    for (let i = 0; i < a.rgba.length; i += 4) if (a.rgba.compare(b.rgba, i, i + 4, i, i + 4) !== 0) n++;
    return n;
  };
  const dirs = ["down", "up", "left", "right"];
  // Sizes after issue 034: poses are drawn on the real furniture (sofa 6x2, desk 4x2, table 4x2, bed 5x6).
  const poses = { "player-sit-sofa": [16, 32], "player-type-desk": [16, 32], "player-guitar": [16, 48], "player-read-sofa": [32, 32], "player-sleep-bed": [80, 96], "player-eat-table": [16, 32] };

  it.each(dirs)("has idle and two walk frames facing %s, 16x16, that differ clearly", (d) => {
    const idle = load(`player-idle-${d}`);
    const w1 = load(`player-walk-${d}-1`);
    const w2 = load(`player-walk-${d}-2`);
    for (const img of [idle, w1, w2]) expect([img.width, img.height]).toEqual([16, 16]);
    expect(diff(idle, w1)).toBeGreaterThanOrEqual(20);
    expect(diff(idle, w2)).toBeGreaterThanOrEqual(20);
    expect(diff(w1, w2)).toBeGreaterThanOrEqual(10);
  });

  it.each(Object.entries(poses))("%s exists at the documented size", (name, size) => {
    const img = load(name);
    expect([img.width, img.height]).toEqual(size);
  });

  it.each(["casual", "out", "pajamas"])("has the %s outfit for every idle and walk frame, 16x16", (outfit) => {
    for (const d of dirs) for (const f of ["idle", "walk-1", "walk-2"]) {
      const frame = f === "idle" ? `idle-${d}` : `walk-${d}-${f.slice(-1)}`;
      const img = load(`player-${outfit}-${frame}`);
      expect([img.width, img.height]).toEqual([16, 16]);
    }
  });

  it.each(["mug", "laptop", "book", "guitar"])("has a held-%s overlay for every facing, 16x16", (item) => {
    for (const d of dirs) {
      const img = load(`held-${item}-${d}`);
      expect([img.width, img.height]).toEqual([16, 16]);
    }
  });
});
