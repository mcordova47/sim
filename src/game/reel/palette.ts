import palette from "../../../art/palette.json";

// The palette the photo reel maps pictures onto: every colour in
// art/palette.json, as [r, g, b], in the order of the file. A stored picture is
// one index into this list per pixel, so the file's order must not change
// (a reorder or a removed colour is a stored-data break; see
// docs/photo-reel-design.md section 2).

export type Rgb = readonly [number, number, number];

interface PaletteEntry {
  name: string;
  hex: string;
}

function parseHex(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Palette colour "${hex}" is not #rrggbb`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const REEL_PALETTE: readonly Rgb[] = Object.values(
  palette.colors as Record<string, PaletteEntry>,
).map((c) => parseHex(c.hex));

// Version stored beside each picture; bump only if the palette's order changes.
export const REEL_PALETTE_VERSION = 1;
