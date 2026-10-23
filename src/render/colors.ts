import palette from "../../art/palette.json";

// Colours for everything drawn from code (HUD, labels, popups, fallbacks) come
// from the shared palette in art/palette.json, the same one the sprites use,
// so changing the palette changes the UI too. Don't write colour literals
// elsewhere; a test enforces that.

interface PaletteEntry {
  name: string;
  hex: string;
}

const byName = new Map<string, string>(
  Object.values(palette.colors as Record<string, PaletteEntry>).map((c) => [c.name, c.hex]),
);

function pick(name: string): string {
  const hex = byName.get(name);
  if (!hex) throw new Error(`Palette has no colour named "${name}"`);
  return hex;
}

export const COLOR = {
  ink: pick("ink"),
  night: pick("night"),
  slate: pick("slate"),
  dusk: pick("dusk"),
  mist: pick("mist"),
  paper: pick("paper"),
  brick: pick("brick"),
  tangerine: pick("tangerine"),
  butter: pick("butter"),
  leaf: pick("leaf"),
};

// A palette colour with some transparency, as a CSS colour string.
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
