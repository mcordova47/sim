// Renders art/src/*.sprite to PNGs in public/sprites/, validates them against
// art/palette.json, and writes an upscaled contact sheet for review.
// No dependencies: PNGs are encoded with node's zlib.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const srcDir = join(root, "art", "src");
const outDir = join(root, "public", "sprites");
const sheetPath = join(root, "art", "contact-sheet.png");
const SHEET_SCALE = 4;
const SHEET_PAD = 8;

// --- Contact sheet ----------------------------------------------------------

// Sprites laid out left to right (wrapping), each upscaled, on a checkerboard
// so transparent pixels are visible.
function buildSheet(images) {
  const maxRowWidth = 640;
  const placed = [];
  let x = SHEET_PAD, y = SHEET_PAD, rowH = 0, sheetW = 0;
  for (const img of images) {
    const w = img.width * SHEET_SCALE, h = img.height * SHEET_SCALE;
    if (x + w + SHEET_PAD > maxRowWidth && x > SHEET_PAD) {
      x = SHEET_PAD;
      y += rowH + SHEET_PAD;
      rowH = 0;
    }
    placed.push({ img, x, y });
    x += w + SHEET_PAD;
    rowH = Math.max(rowH, h);
    sheetW = Math.max(sheetW, x);
  }
  const width = Math.max(sheetW, 2 * SHEET_PAD + 1);
  const height = y + rowH + SHEET_PAD;
  const rgba = Buffer.alloc(width * height * 4);
  const bg = [[0x24, 0x25, 0x3a], [0x2b, 0x2d, 0x42]];
  const cell = SHEET_SCALE * 2;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const c = bg[(Math.floor(px / cell) + Math.floor(py / cell)) % 2];
      rgba.set([...c, 255], (py * width + px) * 4);
    }
  }
  for (const { img, x: ox, y: oy } of placed) {
    for (let sy = 0; sy < img.height; sy++) {
      for (let sx = 0; sx < img.width; sx++) {
        const i = (sy * img.width + sx) * 4;
        if (img.rgba[i + 3] === 0) continue;
        for (let dy = 0; dy < SHEET_SCALE; dy++) {
          for (let dx = 0; dx < SHEET_SCALE; dx++) {
            const o = ((oy + sy * SHEET_SCALE + dy) * width + ox + sx * SHEET_SCALE + dx) * 4;
            img.rgba.copy(rgba, o, i, i + 4);
          }
        }
      }
    }
  }
  return { width, height, rgba };
}

// --- Main -------------------------------------------------------------------

const files = readdirSync(srcDir).filter((f) => f.endsWith(".sprite")).sort();
const errors = [];
const rendered = [];

for (const file of files) {
  const sprite = parseSprite(file, readFileSync(join(srcDir, file), "utf8"));
  errors.push(...sprite.errors);
  if (!sprite.errors.length) rendered.push({ name: file.replace(/\.sprite$/, ""), img: rasterize(sprite) });
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s); nothing written.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const { name, img } of rendered) writeFileSync(join(outDir, `${name}.png`), encodePng(img));
// `npm run sprites -- --sheet=floor-,bed` limits the contact sheet to names starting with these prefixes.
const sheetArg = process.argv.find((a) => a.startsWith("--sheet="));
const prefixes = sheetArg ? sheetArg.slice(8).split(",").filter(Boolean) : [];
const onSheet = prefixes.length ? rendered.filter((r) => prefixes.some((p) => r.name.startsWith(p))) : rendered;
writeFileSync(sheetPath, encodePng(buildSheet(onSheet.map((r) => r.img))));
console.log(`Rendered ${rendered.length} sprite(s) to public/sprites/, contact sheet at art/contact-sheet.png`);
