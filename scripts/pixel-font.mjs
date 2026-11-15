// The game's 5x7 bitmap font (src/render/font.ts) as a real TrueType font, so the
// generated issue pages can use it for headings, pills and labels with no outside
// request and no font file to ship: the bytes are built here, at build time, from the
// glyph table in the game's own source (our own art, no third-party licence).
//
// One font pixel is 100 font units and the em is 800 units (8 pixels). At a font-size of
// 16px each game pixel is exactly 2px on screen; 8px, 24px and so on stay crisp too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIXEL = 100;
const UPM = 800;
const ADVANCE = 600; // 5 pixels plus a 1 pixel gap, like the game's own ADVANCE

// Read the glyph table out of src/render/font.ts (a TypeScript file, so we parse the
// plain `KEY: ["row", ...]` lines instead of importing it).
export function readGlyphs(source = fs.readFileSync(path.join(here, '..', 'src', 'render', 'font.ts'), 'utf8')) {
  const glyphs = {};
  const re = /^\s*(?:"((?:\\.|[^"\\])+)"|([A-Za-z0-9$_]))\s*:\s*\[((?:\s*"[.#]{5}",?)+)\s*\]/gm;
  let m;
  while ((m = re.exec(source))) {
    const key = (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
    if (key.length !== 1) continue;
    glyphs[key] = [...m[3].matchAll(/"([.#]{5})"/g)].map((r) => r[1]);
  }
  return glyphs;
}

// Rectangles for a glyph: horizontal runs of pixels, y up from the baseline.
function rects(rows) {
  const out = [];
  const top = rows.length;
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== '#') { c++; continue; }
      let e = c;
      while (e < row.length && row[e] === '#') e++;
      const y1 = (top - 1 - r) * PIXEL + 0; // baseline at the bottom row
      out.push([c * PIXEL, y1, e * PIXEL, y1 + PIXEL]);
      c = e;
    }
  });
  return out;
}

const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const i16 = (n) => { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
const pad4 = (b) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);

function glyfFor(rs) {
  if (!rs.length) return Buffer.alloc(0);
  const pts = [];
  const ends = [];
  for (const [x0, y0, x1, y1] of rs) {
    // clockwise outer contour
    pts.push([x0, y0], [x0, y1], [x1, y1], [x1, y0]);
    ends.push(pts.length - 1);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const parts = [
    i16(rs.length), i16(Math.min(...xs)), i16(Math.min(...ys)), i16(Math.max(...xs)), i16(Math.max(...ys)),
    ...ends.map(u16), u16(0),
    Buffer.alloc(pts.length, 1), // all on-curve, 16-bit coordinates
  ];
  let px = 0;
  for (const [x] of pts) { parts.push(i16(x - px)); px = x; }
  let py = 0;
  for (const [, y] of pts) { parts.push(i16(y - py)); py = y; }
  return pad4(Buffer.concat(parts));
}

export function buildPixelFont(glyphs = readGlyphs()) {
  const chars = Object.keys(glyphs).sort();
  // glyph 0 is .notdef (a box), glyph 1 is space, then one per character.
  const shapes = [
    [[0, 0, 500, 100], [0, 600, 500, 700], [0, 100, 100, 600], [400, 100, 500, 600]],
    [],
    ...chars.map((ch) => rects(glyphs[ch])),
  ];
  const glyphData = shapes.map(glyfFor);
  const loca = [];
  let off = 0;
  for (const g of glyphData) { loca.push(off); off += g.length; }
  loca.push(off);
  const glyf = Buffer.concat(glyphData);
  const numGlyphs = shapes.length;

  // cmap: format 4. Lowercase letters share the uppercase glyph (the game draws uppercase).
  const map = new Map([[32, 1]]);
  chars.forEach((ch, i) => {
    map.set(ch.codePointAt(0), i + 2);
    if (/[A-Z]/.test(ch)) map.set(ch.toLowerCase().codePointAt(0), i + 2);
  });
  const codes = [...map.keys()].sort((a, b) => a - b);
  const segs = [];
  for (const c of codes) {
    const last = segs[segs.length - 1];
    if (last && c === last.end + 1 && map.get(c) === last.startGlyph + (c - last.start)) last.end = c;
    else segs.push({ start: c, end: c, startGlyph: map.get(c) });
  }
  segs.push({ start: 0xffff, end: 0xffff, startGlyph: 0, last: true });
  const n = segs.length;
  const pow = 2 ** Math.floor(Math.log2(n));
  const cmapSub = Buffer.concat([
    u16(4), u16(16 + n * 8), u16(0), u16(n * 2), u16(pow * 2), u16(Math.log2(pow)), u16(n * 2 - pow * 2),
    ...segs.map((s) => u16(s.end)), u16(0),
    ...segs.map((s) => u16(s.start)),
    ...segs.map((s) => i16(s.last ? 1 : s.startGlyph - s.start)),
    ...segs.map(() => u16(0)),
  ]);
  const cmap = Buffer.concat([u16(0), u16(1), u16(3), u16(1), u32(12), cmapSub]);

  const head = Buffer.concat([
    u32(0x00010000), u32(0x00010000), u32(0), u32(0x5f0f3cf5), u16(0x0003), u16(UPM),
    Buffer.alloc(16), // created, modified
    i16(0), i16(-100), i16(500), i16(700), u16(0), u16(8), i16(2), i16(1), i16(0),
  ]);
  const hhea = Buffer.concat([
    u32(0x00010000), i16(700), i16(0), i16(100), u16(ADVANCE), i16(0), i16(0), i16(500), i16(1), i16(0), i16(0),
    Buffer.alloc(8), i16(0), u16(numGlyphs),
  ]);
  const maxp = Buffer.concat([u32(0x00010000), u16(numGlyphs), u16(64), u16(16), u16(0), u16(0), u16(2), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0), u16(0)]);
  const hmtx = Buffer.concat(shapes.map((_, i) => Buffer.concat([u16(i === 0 ? 500 : ADVANCE), i16(0)])));
  const os2 = Buffer.concat([
    u16(1), i16(ADVANCE), u16(400), u16(5), u16(0), i16(0), i16(0), i16(0), i16(0), i16(0), i16(0), i16(0), i16(0), i16(0), i16(0),
    i16(0), Buffer.alloc(10), u32(1), u32(0), u32(0), u32(0), Buffer.from('PXLS'), u16(0x40), u16(32), u16(0xfffd),
    i16(700), i16(-100), i16(0), u16(700), u16(100), u32(1), u32(0),
  ]);
  const nameStr = (s) => Buffer.from(s, 'utf16le').swap16();
  const names = [[1, 'Simagotchi Pixel'], [2, 'Regular'], [3, 'Simagotchi Pixel Regular'], [4, 'Simagotchi Pixel'], [6, 'SimagotchiPixel']];
  const strings = names.map(([, s]) => nameStr(s));
  let so = 0;
  const records = names.map(([id], i) => { const r = Buffer.concat([u16(3), u16(1), u16(0x409), u16(id), u16(strings[i].length), u16(so)]); so += strings[i].length; return r; });
  const name = Buffer.concat([u16(0), u16(names.length), u16(6 + names.length * 12), ...records, ...strings]);
  const post = Buffer.concat([u32(0x00030000), u32(0), i16(-100), i16(50), u32(1), u32(0), u32(0), u32(0), u32(0)]);
  const locaBuf = Buffer.concat(loca.map((o) => u32(o)));

  const tables = { 'OS/2': os2, cmap, glyf, head, hhea, hmtx, loca: locaBuf, maxp, name, post };
  const tags = Object.keys(tables).sort();
  const dirSize = 12 + tags.length * 16;
  let offset = dirSize;
  const dir = [];
  const body = [];
  for (const tag of tags) {
    const data = pad4(tables[tag]);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum = (sum + data.readUInt32BE(i)) >>> 0;
    dir.push(Buffer.concat([Buffer.from(tag), u32(sum), u32(offset), u32(tables[tag].length)]));
    body.push(data);
    offset += data.length;
  }
  const sr = 2 ** Math.floor(Math.log2(tags.length));
  const header = Buffer.concat([u32(0x00010000), u16(tags.length), u16(sr * 16), u16(Math.log2(sr)), u16(tags.length * 16 - sr * 16)]);
  const font = Buffer.concat([header, ...dir, ...body]);
  // head.checkSumAdjustment is left 0; browsers do not check it.
  return font;
}

export const pixelFontDataUri = () => `data:font/ttf;base64,${buildPixelFont().toString('base64')}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2]) {
  fs.writeFileSync(process.argv[2], buildPixelFont());
}
