// Review aid for docs/plant-pots-design.md (issue 179): composes the real main room (map and legend of
// src/game/apartment.ts, sprites of art/src, draw order by the bottom edge of the piece) with the decor props, at 1x,
// plus mockup-only stand-in sprites drawn in code, and the game's own 5x7 font. Not wired into the game.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "../../scripts/sprite-lib.mjs";
import { MAP, spriteOf, load, COLS, ROWS, T } from "../../scripts/room-compose.mjs";
import { readGlyphs } from "../../scripts/pixel-font.mjs";

export { MAP, load, T, encodePng, root, COLS, ROWS, spriteOf };
const GLYPHS = readGlyphs();
const palette = JSON.parse(readFileSync(join(root, "art", "palette.json"), "utf8")).colors;
const byName = Object.fromEntries(Object.entries(palette).map(([k, v]) => [v.name, v]));
export const rgb = (k) => { const n = parseInt((palette[k] ?? byName[k]).hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export const canvas = (w, h, fill) => {
  const rgba = Buffer.alloc(w * h * 4);
  if (fill) for (let i = 0; i < w * h; i++) rgba.set([...rgb(fill), 255], i * 4);
  return { width: w, height: h, rgba };
};
export const blit = (dst, img, ox, oy) => {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
    if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < dst.width && py < dst.height) img.rgba.copy(dst.rgba, (py * dst.width + px) * 4, i, i + 4);
  }
};
export const rect = (dst, x, y, w, h, key) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++)
    if (xx >= 0 && yy >= 0 && xx < dst.width && yy < dst.height) dst.rgba.set([...rgb(key), 255], (yy * dst.width + xx) * 4);
};
// The game's font: 6 px advance, shadow one pixel down and right in ink.
export const text = (dst, s, x, y, key = "paper", shadow = "ink") => {
  const run = (ox, oy, k) => {
    [...s.toUpperCase()].forEach((ch, i) => {
      const rows = GLYPHS[ch];
      if (!rows) return;
      rows.forEach((row, yy) => { for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") rect(dst, ox + i * 6 + xx, oy + yy, 1, 1, k); });
    });
  };
  if (shadow) run(x + 1, y + 1, shadow);
  run(x, y, key);
};
// Text at k times the size (a font pixel becomes k x k).
export const textK = (dst, s, x, y, k, key = "paper", shadow = "ink") => {
  const run = (ox, oy, c) => [...s.toUpperCase()].forEach((ch, i) => {
    const rows = GLYPHS[ch];
    if (!rows) return;
    rows.forEach((row, yy) => { for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") rect(dst, ox + (i * 6 + xx) * k, oy + yy * k, k, k, c); });
  });
  if (shadow) run(x + k, y + k, shadow);
  run(x, y, key);
};
export const scale = (img, k) => {
  const out = canvas(img.width * k, img.height * k);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const i = (((y / k) | 0) * img.width + ((x / k) | 0)) * 4;
    img.rgba.copy(out.rgba, (y * out.width + x) * 4, i, i + 4);
  }
  return out;
};
export const crop = (img, x, y, w, h) => {
  const out = canvas(w, h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const sx = x + xx, sy = y + yy;
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) continue;
    img.rgba.copy(out.rgba, (yy * w + xx) * 4, (sy * img.width + sx) * 4, (sy * img.width + sx) * 4 + 4);
  }
  return out;
};
// A sprite from a string grid (stand-ins only, mockups): rows of palette keys, "." is clear.
export const fromRows = (rows) => rasterize({ width: rows[0].length, height: rows.length, rows });
export const sprite = (name) => load(name);

// The decor props of apartment.ts (MAIN_PROPS) that matter here, with the sprite they show.
// `plant`: sprite name for the plant slot (abs 160, 52); an overhang sprite is `up + 16 + down` high and the slot is its middle 16 rows.
// `over`: extra things { img, x, y, bottom } (stand-in or real art), `sleep` is not needed here.
export function compose({ shelfImg = null, plant = "plant-1", up = 0, plantImg = null, lamp = "lamp-table", extras = [], blinds = "window-blinds-open", player = true, playerAt = null, hide = [] } = {}) {
  const W = COLS * T, H = ROWS * T;
  const room = canvas(W, H);
  const isWall = (ch, c) => ch === "#" || ch === "p" || ch === "q" || ch === "u" || ch === "f" || (/[wW12]/.test(ch) && (c === COLS - 1 || c === 0));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c];
    if (ch === "#" || ch === "p" || ch === "q" || ch === "u" || ch === "f" || (/[wW]/.test(ch) && c === COLS - 1)) continue;
    blit(room, load("floor-wood"), c * T, r * T);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!isWall(MAP[r][c], c)) continue;
    blit(room, load(r === 0 ? "wall-back" : c === COLS - 1 ? "wall-side-right" : c === 0 ? "wall-side-left" : "wall-front"), c * T, r * T);
  }
  const boxes = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c];
    if (!spriteOf[ch]) continue;
    const b = (boxes[ch] ??= { ch, c, r, c2: c, r2: r });
    b.c = Math.min(b.c, c); b.r = Math.min(b.r, r); b.c2 = Math.max(b.c2, c); b.r2 = Math.max(b.r2, r);
  }
  const things = [];
  for (const b of Object.values(boxes)) {
    let name = spriteOf[b.ch];
    if (name === "window-blinds") name = blinds;
    if (name === "lamp-table") name = lamp;
    if (hide.includes(b.ch)) continue;
    const img = b.ch === "H" && shelfImg ? shelfImg : load(name);
    if (!img) continue;
    things.push({ img, x: b.c * T, y: b.r * T, bottom: (b.r2 + 1) * T, ch: b.ch });
  }
  const H_BOTTOM = 80, T_BOTTOM = 48, N_BOTTOM = 32;
  things.push({ img: plantImg ?? load(plant), x: 160, y: 52 - up, bottom: H_BOTTOM + 0.1, prop: true });
  things.push({ img: load("coffee-pourover"), x: 62, y: 18, bottom: T_BOTTOM + 0.1 });
  things.push({ img: load("mug-table"), x: 54, y: 27, bottom: T_BOTTOM + 0.1 });
  things.push({ img: load("phone-charger"), x: 242, y: 16, bottom: N_BOTTOM + 0.1 });
  const start = playerAt ?? MAP.flatMap((row, r) => [...row].map((ch, c) => (ch === "@" ? { x: c * T, y: r * T } : null))).find(Boolean);
  if (player && start) things.push({ img: load("player-idle-down"), x: start.x, y: start.y, bottom: start.y + T });
  things.push(...extras);
  things.sort((a, b) => a.bottom - b.bottom);
  for (const t of things) blit(room, t.img, t.x, t.y);
  return room;
}
// The 320 x 192 desktop view: the room (304 x 160) sits centred sideways and at the bottom (render/camera.ts clamps), ink above.
export function desktopView(room, label) {
  const v = canvas(320, 192, "ink");
  blit(v, room, 8, 32);
  if (label) text(v, label, 8, 8, "paper");
  return v;
}
// The 224 x 208 narrow view: the camera follows the player; here it is placed by hand at world x `camX`; the room sits at the bottom.
export function narrowView(room, camX, label) {
  const v = canvas(224, 208, "ink");
  blit(v, crop(room, camX, 0, 224, 160), 0, 48);
  if (label) text(v, label, 4, 8, "paper");
  return v;
}
