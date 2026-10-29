import type { ReelPic } from "./reel-store";

// A made-up picture for tests and review renders (issue 117b): bands of palette colours that depend on
// `seed`, a bright border so a crop or a wrong scale shows, and a marker in the top-left corner so a flip or
// a cut shows. It is never derived from a real photo.
export function syntheticPic(w: number, h: number, seed: number, id = seed): ReelPic {
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 2 + ((Math.floor((x + y) / 6) + seed * 3) % 18);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) v = 21;
      if (x < 6 && y < 6) v = 1;
      px[y * w + x] = v;
    }
  }
  return { id, w, h, px, palette: 1 };
}
