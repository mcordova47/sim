// The photo reel's look presets (issue 117a; docs/photo-gallery-design.md section 4.1).
// A look is how a new picture is made: its landscape size and dither strength.
// Every look uses the full 22-colour palette. Portrait is the swapped size.

export interface ReelLook {
  id: string;
  name: string;
  // Landscape size.
  w: number;
  h: number;
  // 0 to 100, as in pixelate.
  dither: number;
}

export const REEL_LOOKS: readonly ReelLook[] = [
  { id: "crisp", name: "Crisp", w: 64, h: 48, dither: 10 },
  { id: "soft", name: "Soft", w: 48, h: 36, dither: 20 },
  { id: "chunky", name: "Chunky", w: 32, h: 24, dither: 30 },
];

// Soft equals what 113 made. A stored picture with no look is read as this.
export const DEFAULT_LOOK_ID = "soft";

export function isLookId(id: unknown): id is string {
  return typeof id === "string" && REEL_LOOKS.some((l) => l.id === id);
}

// An unknown or missing id gives the default look.
export function lookById(id: unknown): ReelLook {
  return REEL_LOOKS.find((l) => l.id === id) ?? REEL_LOOKS.find((l) => l.id === DEFAULT_LOOK_ID)!;
}

// The whitelist of stored sizes: each look's landscape size and its portrait twin.
export function lookSizes(): { w: number; h: number }[] {
  const out: { w: number; h: number }[] = [];
  for (const l of REEL_LOOKS) {
    out.push({ w: l.w, h: l.h }, { w: l.h, h: l.w });
  }
  return out;
}
