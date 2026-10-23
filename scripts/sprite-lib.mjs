// Shared sprite helpers: palette, parsing/validation, rasterizing and PNG encoding.
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
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

const SPRITE_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseSprite(file, text) {
  const errors = [];
  if (!SPRITE_NAME.test(file.replace(/\.sprite$/, ""))) {
    errors.push(`${file}: name must be lowercase kebab-case (letters, digits, single hyphens)`);
  }
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

export function rasterize({ width, height, rows }) {
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

export function encodePng({ width, height, rgba }) {
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

