// Draws the kitchen and the bath from the real maps in src/game/apartment.ts, using the top-down sprites,
// into art/mockup-kitchen.png and art/mockup-bath.png (4x), as a review aid. Not committed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

// Optional: BOXES=boxes|boxes-flat|boxes-gone draws the kitchen boxes in that state, CROP=c0,r0,c1,r1 (tiles,
// end exclusive) cuts the picture, SCALE=1 draws at 1x and OUT=name changes the file name (mockup-<room><name>.png).
const T = 16, SCALE = Number(process.env.SCALE ?? 4);
const CROP = process.env.CROP?.split(",").map(Number);
const load = (name) => rasterize(parseSprite(`${name}.sprite`, readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8")));
const src = readFileSync(join(root, "src", "game", "apartment.ts"), "utf8");
const mapOf = (id) => [...src.match(new RegExp(`const ${id}_MAP = \\[([\\s\\S]*?)\\];`))[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);

// map character -> sprite, per room (the legend in apartment.ts names the same sprites)
const ROOMS = {
  kitchen: {
    map: mapOf("KITCHEN"), floor: "floor-kitchen", wallL: "wall-side-left-kitchen", wallR: "wall-side-right-kitchen",
    doorL: "doorway-left-kitchen", doorR: "doorway-right-kitchen",
    legend: { C: "dishes-2", V: "stove", h: "hood", N: "bin", X: process.env.BOXES ?? "boxes", P: "pantry", F: "fridge", c: "window-curtain" },
  },
  bath: {
    map: mapOf("BATH"), floor: "floor-bath", wallL: "wall-side-left-bath", wallR: "wall-side-right-bath",
    doorL: "doorway-left-kitchen", doorR: "doorway-right-bath",
    legend: { U: "tub", Q: "toilet", V: "vanity" },
  },
};

for (const [room, r] of Object.entries(ROOMS)) {
  const rows = r.map, ROWS = rows.length, COLS = rows[0].length, W = COLS * T, H = ROWS * T;
  const rgba = Buffer.alloc(W * H * 4);
  const blit = (img, ox, oy) => {
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
      if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < W && py < H) img.rgba.copy(rgba, (py * W + px) * 4, i, i + 4);
    }
  };
  const at = (c, rr) => (rows[rr] ?? "")[c] ?? "#";
  const things = [], seen = new Set();
  for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) {
    const ch = at(c, rr);
    if (ch !== "#" && ch !== "1" && ch !== "2" && ch !== "3") blit(load(r.floor), c * T, rr * T);
  }
  for (let rr = 0; rr < ROWS; rr++) for (let c = 0; c < COLS; c++) {
    const ch = at(c, rr);
    if (ch === "#") {
      const open = (cc, r2) => at(cc, r2) !== "#";
      if (open(c, rr + 1) && !open(c, rr - 1)) blit(load("wall-back"), c * T, rr * T);       // wall with floor below it
      else if (open(c + 1, rr)) blit(load(r.wallL), c * T, rr * T);
      else if (open(c - 1, rr)) blit(load(r.wallR), c * T, rr * T);
    } else if (/[123]/.test(ch)) {
      blit(load(c === COLS - 1 || at(c - 1, rr) !== "#" && at(c + 1, rr) === "#" ? r.doorR : r.doorL), c * T, rr * T);
    } else if (r.legend[ch] && !seen.has(`${c},${rr}`)) {
      const img = load(r.legend[ch]), w = img.width / T, h = Math.max(1, Math.round(img.height / T));
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) seen.add(`${c + i},${rr + j}`);
      things.push({ img, x: c * T, y: rr * T, bottom: rr * T + img.height });
    }
  }
  things.sort((a, b) => a.bottom - b.bottom);
  for (const t of things) blit(t.img, t.x, t.y);
  blit(load("player-idle-down"), rows.findIndex((s) => s.includes("@")) >= 0 ? rows.map((s) => s.indexOf("@")).find((i) => i >= 0) * T : 0, rows.findIndex((s) => s.includes("@")) * T);

  const [x0, y0, x1, y1] = CROP && room === "kitchen" ? CROP.map((n) => n * T) : [0, 0, W, H];
  const cw = x1 - x0, ch = y1 - y0;
  const big = Buffer.alloc(cw * SCALE * ch * SCALE * 4);
  for (let y = 0; y < ch * SCALE; y++) for (let x = 0; x < cw * SCALE; x++) {
    const i = (((y / SCALE | 0) + y0) * W + (x / SCALE | 0) + x0) * 4;
    rgba.copy(big, (y * cw * SCALE + x) * 4, i, i + 4);
  }
  const outPath = join(root, "art", `mockup-${room}${process.env.OUT ?? ""}.png`);
  writeFileSync(outPath, encodePng({ width: cw * SCALE, height: ch * SCALE, rgba: big }));
  console.log(`Wrote ${outPath}`);
}
