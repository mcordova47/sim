// Review aid for issue 074 (the first gifts): composes every new wall piece on the main room's
// back wall (next to the paintings that are already in the room), each table lamp on the lamp
// table's floor, and each plant on the bookshelf's plant slot, into
// art/mockup-gifts.png (4x) and art/mockup-gifts-1x.png (the real pixel size). Not committed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const T = 16, COLS = 20, ROWS = 7;
const load = (name) => rasterize(parseSprite(`${name}.sprite`, readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8")));
const W = COLS * T, H = ROWS * T;
const rgba = Buffer.alloc(W * H * 4);
const blit = (img, ox, oy) => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
    if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < W && py < H) img.rgba.copy(rgba, (py * W + px) * 4, i, i + 4);
  }
};

// Back wall in rows 0 to 2 (the painting slots sit on it), floor below.
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < 3; r++) blit(load("wall-back"), c * T, r * T);
  for (let r = 3; r < ROWS; r++) blit(load("floor-wood"), c * T, r * T);
}

// [sprite, tile col, tile row]. The first two of band 1 are the paintings already in the room.
const band = (names, row) => { let c = 0; for (const n of names) { blit(load(n), c * T, row * T); c += load(n).width / T; } };
band(["painting", "painting-desk", "art-robin", "art-silver-landscape", "art-green-still-life", "art-concert-poster", "art-dark-animal", "art-white-building"], 0);
band(["art-oak-box", "art-pale-mat", "art-small-blue", "art-tall-brown", "art-dark-postcard", "art-gold-narrow", "painting-wide"], 1);
// A row of the table wall again, but with the new pieces beside the old on a row of their own is the
// band above; the third wall row is plain, for the lamps and shelves to stand against.

// Lamps on the lamp table (they are 16x16 with their own small table), existing first.
["lamp-table", "lamp-warm", "lamp-candle", "stool-lamp"].forEach((n, i) => blit(load(n), (1 + i * 2) * T, 4 * T));
// Bookshelves with the plant in the plant-shelf slot (x 0, y 36 on the 16x64 sprite), existing first.
["plant-0", "plant-3", "plant-dried"].forEach((p, i) => {
  blit(load("bookshelf"), (12 + i * 2) * T, 3 * T);
  blit(load(p), (12 + i * 2) * T, 3 * T + 36);
});

const write = (scale, name) => {
  const big = Buffer.alloc(W * scale * H * scale * 4);
  for (let y = 0; y < H * scale; y++) for (let x = 0; x < W * scale; x++) {
    const i = ((y / scale | 0) * W + (x / scale | 0)) * 4;
    rgba.copy(big, (y * W * scale + x) * 4, i, i + 4);
  }
  const outPath = join(root, "art", name);
  writeFileSync(outPath, encodePng({ width: W * scale, height: H * scale, rgba: big }));
  console.log(`Wrote ${outPath}`);
};
write(4, "mockup-gifts.png");
write(1, "mockup-gifts-1x.png");
