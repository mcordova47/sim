// A small built-in 5x7 bitmap font, so text stays crisp at any integer scale
// and needs no external files. Text is drawn uppercase.

import { COLOR } from "./colors";

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const ADVANCE = GLYPH_W + 1;

export const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "*": [".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", ".#.##", "#..##"],
  '"': [".#.#.", ".#.#.", ".#.#.", ".....", ".....", ".....", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", "..#..", ".#..."],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "#": [".#.#.", "#####", ".#.#.", ".#.#.", "#####", ".#.#.", "....."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  "{": ["..##.", ".#...", ".#...", "#....", ".#...", ".#...", "..##."],
  "}": [".##..", "...#.", "...#.", "....#", "...#.", "...#.", ".##.."],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "\\": ["#....", "#....", ".#...", "..#..", "...#.", "....#", "....#"],
  "^": ["..#..", ".#.#.", "#...#", ".....", ".....", ".....", "....."],
  "~": [".....", ".....", ".##.#", "#.##.", ".....", ".....", "....."],
  "`": ["#....", ".#...", "..#..", ".....", ".....", ".....", "....."],
};

// Text from books and the web has typographic characters the font doesn't
// have. They are replaced by plain ones before measuring, drawing or checking:
// curly quotes, dashes, the ellipsis, and odd spaces.
export function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2000-\u200A\u202F\t]/g, " ");
}

// The characters in `text` that the font can't draw (after normalising and
// upper-casing), without repeats. Empty means the whole text can be drawn.
export function unsupportedChars(text: string): string[] {
  const bad = new Set<string>();
  for (const ch of normalizeText(text).toUpperCase()) {
    if (ch !== " " && !GLYPHS[ch]) bad.add(ch);
  }
  return [...bad];
}

export interface TextOptions {
  color?: string;
  align?: "left" | "center" | "right";
  // Drop-shadow colour (1px down and right, scaled). null for none.
  shadow?: string | null;
  // Whole-number size multiplier.
  scale?: number;
}

// Width in pixels of `text` at `scale`.
export function textWidth(text: string, scale = 1): number {
  const length = normalizeText(text).length;
  return length === 0 ? 0 : (length * ADVANCE - 1) * scale;
}

const glyphCache = new Map<string, HTMLCanvasElement>();

// One glyph pre-rendered in one colour, so drawing a letter is a single
// drawImage call.
function glyphCanvas(ch: string, color: string): HTMLCanvasElement | null {
  const rows = GLYPHS[ch];
  if (!rows) return null;
  const key = `${color}|${ch}`;
  let canvas = glyphCache.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = GLYPH_W;
    canvas.height = GLYPH_H;
    const g = canvas.getContext("2d")!;
    g.fillStyle = color;
    rows.forEach((row, y) => {
      for (let x = 0; x < GLYPH_W; x++) {
        if (row[x] === "#") g.fillRect(x, y, 1, 1);
      }
    });
    glyphCache.set(key, canvas);
  }
  return canvas;
}

function drawRun(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale: number,
) {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") continue;
    const glyph = glyphCanvas(ch, color) ?? glyphCanvas("?", color)!;
    ctx.drawImage(glyph, x + i * ADVANCE * scale, y, GLYPH_W * scale, GLYPH_H * scale);
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { color = COLOR.paper, align = "left", shadow = COLOR.ink, scale = 1 }: TextOptions = {},
): void {
  const upper = normalizeText(text).toUpperCase();
  const width = textWidth(upper, scale);
  const left = Math.round(align === "center" ? x - width / 2 : align === "right" ? x - width : x);
  const top = Math.round(y);

  ctx.imageSmoothingEnabled = false;
  if (shadow) drawRun(ctx, upper, left + scale, top + scale, shadow, scale);
  drawRun(ctx, upper, left, top, color, scale);
}
