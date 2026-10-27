import { COLOR } from "./colors";

// A small lowercase pixel font for IPA transcriptions (issue 026), so the card
// screen can show how a word is said next to it. The main font is capitals only
// and IPA is case-sensitive (`r` and `ɾ`, `n` and `ɲ`), so the symbols the
// Spanish deck uses get their own glyphs here. 5 wide and 9 tall: the x-height
// is rows 2 to 6, ascenders reach rows 0 and 1, descenders rows 7 and 8, and the
// baseline sits on row 6, where the capitals' does.

export const IPA_W = 5;
export const IPA_H = 9;
const ADVANCE = IPA_W + 1;

const G = (...rows: string[]): string[] => {
  const full = [...rows];
  while (full.length < IPA_H) full.push(".....");
  return full;
};
const E = ".....";

export const IPA_GLYPHS: Record<string, string[]> = {
  a: G(E, E, ".###.", "....#", ".####", "#...#", ".####"),
  e: G(E, E, ".###.", "#...#", "#####", "#....", ".###."),
  i: G("..#..", E, ".##..", "..#..", "..#..", "..#..", ".###."),
  o: G(E, E, ".###.", "#...#", "#...#", "#...#", ".###."),
  u: G(E, E, "#...#", "#...#", "#...#", "#..##", ".##.#"),
  p: G(E, E, "####.", "#...#", "#...#", "#...#", "####.", "#....", "#...."),
  t: G(".#...", ".#...", "####.", ".#...", ".#...", ".#..#", "..##."),
  k: G("#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."),
  b: G("#....", "#....", "####.", "#...#", "#...#", "#...#", "####."),
  d: G("....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"),
  // The single-storey g (U+0261) the deck uses, and the plain g.
  ɡ: G(E, E, ".####", "#...#", "#...#", ".####", "....#", "#...#", ".###."),
  g: G(E, E, ".####", "#...#", "#...#", ".####", "....#", "#...#", ".###."),
  f: G("..##.", ".#...", "###..", ".#...", ".#...", ".#...", ".#..."),
  s: G(E, E, ".####", "#....", ".###.", "....#", "####."),
  x: G(E, E, "#...#", ".#.#.", "..#..", ".#.#.", "#...#"),
  m: G(E, E, "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"),
  n: G(E, E, "#.##.", "##..#", "#...#", "#...#", "#...#"),
  ɲ: G(E, E, "#.##.", "##..#", "#...#", "#...#", "#...#", "#....", ".##.."),
  l: G(".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."),
  // A trill is a plain r; the tap has the flat-topped, hooked shape of ɾ.
  r: G(E, E, "#.##.", "##..#", "#....", "#....", "#...."),
  ɾ: G(E, E, ".####", "##...", "#....", "#....", "#...."),
  j: G("..#..", E, ".##..", "..#..", "..#..", "..#..", "..#..", "#.#..", ".#..."),
  ʝ: G("..#..", E, "###..", "..#..", "..#..", "..#..", "..#..", "#.#..", ".#..."),
  w: G(E, E, "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."),
  ʃ: G("..##.", ".#...", ".#...", ".#...", ".#...", ".#...", ".#...", ".#...", "##..."),
  "ˈ": G("..#..", "..#..", E, E, E, E, E),
  "/": G("....#", "....#", "...#.", "..#..", ".#...", "#....", "#....", E, E),
  "(": G("...#.", "..#..", ".#...", ".#...", ".#...", ".#...", "..#..", "...#.", E),
  ")": G(".#...", "..#..", "...#.", "...#.", "...#.", "...#.", "..#..", ".#...", E),
  ".": G(E, E, E, E, E, E, ".##..", ".##..", E),
  " ": G(),
};

// What is drawn for a symbol with no glyph: a hollow box, so the gap is seen.
const MISSING = G(E, E, "#####", "#...#", "#...#", "#...#", "#####");

// The symbols in `text` that have no glyph, without repeats.
export function unsupportedIpa(text: string): string[] {
  const bad = new Set<string>();
  for (const ch of text.normalize("NFC")) if (!IPA_GLYPHS[ch]) bad.add(ch);
  return [...bad];
}

export const ipaWidth = (text: string): number => {
  const length = [...text.normalize("NFC")].length;
  return length === 0 ? 0 : length * ADVANCE - 1;
};

const cache = new Map<string, HTMLCanvasElement>();

function glyphCanvas(ch: string, color: string): HTMLCanvasElement {
  const rows = IPA_GLYPHS[ch] ?? MISSING;
  const key = `${color}|${ch}`;
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = IPA_W;
    canvas.height = IPA_H;
    const g = canvas.getContext("2d")!;
    g.fillStyle = color;
    rows.forEach((row, y) => {
      for (let x = 0; x < IPA_W; x++) if (row[x] === "#") g.fillRect(x, y, 1, 1);
    });
    cache.set(key, canvas);
  }
  return canvas;
}

// Draws `text` with its top-left at x, y (the capitals' cap line is row 0 here
// too, so IPA lines up with the main font's baseline).
export function drawIpa(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { color = COLOR.paper, align = "left" }: { color?: string; align?: "left" | "center" | "right" } = {},
): void {
  const chars = [...text.normalize("NFC")];
  const width = ipaWidth(text);
  const left = Math.round(align === "center" ? x - width / 2 : align === "right" ? x - width : x);
  ctx.imageSmoothingEnabled = false;
  chars.forEach((ch, i) => {
    if (ch === " ") return;
    ctx.drawImage(glyphCanvas(ch, color), left + i * ADVANCE, Math.round(y), IPA_W, IPA_H);
  });
}
