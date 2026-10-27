// Writes the site's favicon and social preview image into public/, made only from the game's own
// sprites and palette (no photos, nothing personal). Run `npm run brand` after changing the art;
// the results are committed. Run `node scripts/brand.mjs --check` to verify the files are current.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const palette = JSON.parse(readFileSync(join(root, "art", "palette.json"), "utf8"));
const hex = (name) => {
  const c = Object.values(palette.colors).find((x) => x.name === name);
  if (!c) throw new Error(`palette has no colour named ${name}`);
  const n = parseInt(c.hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const load = (name) => {
  const parsed = parseSprite(`${name}.sprite`, readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8"));
  if (parsed.errors.length) throw new Error(parsed.errors.join("\n"));
  return rasterize(parsed);
};

function canvas(width, height, bg) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([...bg, 255], i * 4);
  return { width, height, rgba };
}

// Draws a sprite scaled by whole pixels (nearest neighbour), skipping transparent pixels.
function blit(dst, img, ox, oy, scale) {
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.rgba[i + 3] === 0) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const px = ox + x * scale + dx;
          const py = oy + y * scale + dy;
          if (px < 0 || py < 0 || px >= dst.width || py >= dst.height) continue;
          img.rgba.copy(dst.rgba, (py * dst.width + px) * 4, i, i + 4);
        }
    }
}

function icon(size) {
  const img = canvas(size, size, hex("night"));
  const scale = Math.floor(size / 20);
  const player = load("player-casual-idle-down");
  const o = Math.floor((size - 16 * scale) / 2);
  blit(img, player, o, o, scale);
  return img;
}

function social() {
  const S = 5; // 1200x630 is 240x126 game pixels at 5x
  const img = canvas(1200, 630, hex("night"));
  const floor = load("floor-wood");
  const floorTop = 56;
  for (let y = floorTop; y < 126; y += 16)
    for (let x = 0; x < 240; x += 16) blit(img, floor, x * S, y * S, S);
  const put = (name, x, bottom) => {
    const s = load(name);
    blit(img, s, x * S, (bottom - s.height) * S, S);
  };
  put("bookshelf", 12, 96);
  put("desk", 34, 88);
  put("sofa-td", 120, 100);
  put("plant-1", 220, 100);
  put("player-casual-idle-down", 100, 112);
  return img;
}

const outputs = {
  "favicon.png": () => icon(32),
  "apple-touch-icon.png": () => icon(180),
  "social.png": () => social(),
};

const check = process.argv.includes("--check");
let stale = 0;
for (const [file, make] of Object.entries(outputs)) {
  const path = join(root, "public", file);
  const png = encodePng(make());
  if (check) {
    if (!existsSync(path) || !readFileSync(path).equals(png)) {
      console.error(`${file} is out of date: run npm run brand`);
      stale++;
    }
  } else {
    writeFileSync(path, png);
    console.log(`wrote public/${file}`);
  }
}
process.exit(stale ? 1 : 0);
