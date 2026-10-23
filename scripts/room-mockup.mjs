// Composes a sample top-down room from art/src sprites into art/room-mockup.png (4x), as a review aid.
// Layers: floor, then furniture and the player sorted by their bottom edge (what is lower is in front).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const T = 16, SCALE = 4, COLS = 10, ROWS = 8;
const load = (name) => rasterize(parseSprite(`${name}.sprite`, readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8")));
const W = COLS * T, H = ROWS * T;
const rgba = Buffer.alloc(W * H * 4);
const blit = (img, ox, oy) => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
    if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < W && py < H) img.rgba.copy(rgba, (py * W + px) * 4, i, i + 4);
  }
};

// [sprite, tile col, tile row of the sprite's top-left]
const floor = [];
for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const bath = c >= 7 && r >= 5;
  const rug = c >= 3 && c <= 6 && r >= 3 && r <= 5;
  floor.push([bath ? "floor-tile" : rug ? "rug" : "floor-wood", c, r]);
}
for (let c = 0; c < COLS; c++) floor.push([c === 4 ? "doorway" : "wall-back", c, 0]);
for (let r = 1; r < ROWS; r++) { floor.push(["wall-side-left", 0, r]); floor.push(["wall-side-right", COLS - 1, r]); }
const things = [
  ["bed-made", 7, 1],
  ["sofa-td", 1, 5],
  ["player-walk-down-1", 5, 4],
  ["player-idle-down", 2, 3],
].map(([n, c, r]) => ({ n, c, r, img: load(n) }));

for (const [n, c, r] of floor) blit(load(n), c * T, r * T);
things.sort((a, b) => a.r * T + a.img.height - (b.r * T + b.img.height));
for (const t of things) blit(t.img, t.c * T, t.r * T);

const big = Buffer.alloc(W * SCALE * H * SCALE * 4);
for (let y = 0; y < H * SCALE; y++) for (let x = 0; x < W * SCALE; x++) {
  const i = ((y / SCALE | 0) * W + (x / SCALE | 0)) * 4;
  rgba.copy(big, (y * W * SCALE + x) * 4, i, i + 4);
}
const outPath = join(root, "art", "room-mockup.png");
writeFileSync(outPath, encodePng({ width: W * SCALE, height: H * SCALE, rgba: big }));
console.log(`Wrote ${outPath}`);
