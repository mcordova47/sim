// Renders art/src/*.sprite to PNGs in public/sprites/, validates them against
// art/palette.json, and writes an upscaled contact sheet for review.
// No dependencies: PNGs are encoded with node's zlib.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "art", "src");
const outDir = join(root, "public", "sprites");
const sheetPath = join(root, "art", "contact-sheet.png");
const SHEET_SCALE = 4;
const SHEET_PAD = 8;

const palette = JSON.parse(readFileSync(join(root, "art", "palette.json"), "utf8"));
const TILE = palette.tile;
const TRANSPARENT = palette.transparent;
const colors = new Map(
  Object.entries(palette.colors).map(([key, c]) => [key, hexToRgb(c.hex)]),
);

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// --- Parsing and validation -------------------------------------------------

function parseSprite(file, text) {
  const errors = [];
  const lines = text.split(/\r?\n/).filter((l) => !l.startsWith("#"));
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();

  const header = lines.shift() ?? "";
  const m = /^size:\s*(\d+)x(\d+)\s*$/.exec(header);
  if (!m) return { errors: [`${file}: first non-comment line must be "size: WxH"`] };
  const width = Number(m[1]);
  const height = Number(m[2]);

  if (width % TILE || height % TILE) {
    errors.push(`${file}: size ${width}x${height} is not a multiple of the ${TILE}px tile`);
  }
  if (lines.length !== height) {
    errors.push(`${file}: declared height ${height} but found ${lines.length} rows`);
  }

  const rows = [];
  lines.forEach((line, y) => {
    if (line.length !== width) {
      errors.push(`${file}: row ${y + 1} is ${line.length} wide, expected ${width}`);
    }
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch !== TRANSPARENT && !colors.has(ch)) {
        errors.push(`${file}: row ${y + 1}, col ${x + 1}: "${ch}" is not in the palette`);
      }
    }
    rows.push(line);
  });
  return { width, height, rows, errors };
}

// --- Pixels and PNG encoding ------------------------------------------------

function rasterize({ width, height, rows }) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = colors.get(rows[y][x]);
      if (rgb) rgba.set([...rgb, 255], (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodePng({ width, height, rgba }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

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
writeFileSync(sheetPath, encodePng(buildSheet(rendered.map((r) => r.img))));
console.log(`Rendered ${rendered.length} sprite(s) to public/sprites/, contact sheet at art/contact-sheet.png`);
