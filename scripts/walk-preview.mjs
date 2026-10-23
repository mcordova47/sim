// Writes art/walk-preview.png: for each direction, the walk cycle (idle, step 1,
// idle, step 2) at 1x and at 6x on a plain background, so the animation can be
// judged at the size it is played. Not committed (gitignored). Run after
// `npm run sprites`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const DIRS = ["down", "up", "left", "right"];
const SCALE = 6;
const PAD = 6;
const load = (name) => rasterize(parseSprite(name, readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8")));

const cycle = (dir) => [`idle-${dir}`, `walk-${dir}-1`, `idle-${dir}`, `walk-${dir}-2`].map((n) => load(`player-${n}`));
const cellW = (16 + PAD) + (16 * SCALE + PAD);
const width = PAD + cellW * 4 + PAD * 3;
const height = PAD + DIRS.length * (16 * SCALE + PAD);
const rgba = Buffer.alloc(width * height * 4);
for (let i = 0; i < width * height; i++) rgba.set([0x6b, 0x6f, 0x94, 255], i * 4);

function blit(img, ox, oy, scale) {
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.rgba[i + 3] === 0) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++)
          img.rgba.copy(rgba, ((oy + y * scale + dy) * width + ox + x * scale + dx) * 4, i, i + 4);
    }
}

DIRS.forEach((dir, row) => {
  const y = PAD + row * (16 * SCALE + PAD);
  cycle(dir).forEach((img, i) => {
    const x = PAD + i * (16 + PAD + 16 * SCALE + PAD + 3);
    blit(img, x, y + 16 * SCALE - 16, 1);
    blit(img, x + 16 + PAD, y, SCALE);
  });
});
const out = join(root, "art", "walk-preview.png");
writeFileSync(out, encodePng({ width, height, rgba }));
console.log(`Wrote ${out}`);
