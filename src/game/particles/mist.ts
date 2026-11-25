import { PARTICLES } from "../config";

// The shower's mist (issue 177, Marc's d1 answer): a dithered layer over the tub as plain functions, so the
// pattern and the density can be tested without a canvas. See `PARTICLES.mist`.

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// The density 0 to 1 at a progress 0 to 1 of the task.
export function mistLevel(progress: number, levels = PARTICLES.mist.levels): number {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < levels.length; i++) {
    const [x1, y1] = levels[i];
    if (p <= x1) {
      const [x0, y0] = levels[i - 1];
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (p - x0)) / (x1 - x0);
    }
  }
  return levels[levels.length - 1][1];
}

// Which colour the mist is at a pixel offset (from the tub's top-left, after the drift): "light", "dark" or null
// for none. The density is scaled by the ellipse: full inside, falling off to nothing at its edge.
export function mistPixel(x: number, y: number, level: number, driftX = 0, driftY = 0): "light" | "dark" | null {
  const m = PARTICLES.mist;
  const dx = (x + 0.5 - m.cx) / m.rx;
  const dy = (y + 0.5 - m.cy) / m.ry;
  const dist = Math.hypot(dx, dy);
  if (dist >= 1) return null;
  const falloff = Math.min(1, (1 - dist) / m.edge);
  const density = level * falloff;
  const px = (((x + driftX) % 4) + 4) % 4;
  const py = (((y + driftY) % 4) + 4) % 4;
  const threshold = BAYER[py][px];
  if (threshold >= density * 16) return null;
  // The darker colour: a second pattern, offset, so it is a scatter of mist among the paper.
  const tx = (((x + driftX + 1) % 4) + 4) % 4;
  const ty = (((y + driftY + 1) % 4) + 4) % 4;
  return BAYER[ty][tx] < m.mistShare * 16 * density ? "dark" : "light";
}
