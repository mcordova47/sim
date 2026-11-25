// Composes the real main room (issue 166 options page): the map and legend of src/game/apartment.ts and the sprites of
// art/src, at 1x, in the order the game draws: floor, walls, floor props (rugs), then the pieces and the player sorted by
// the bottom edge of their footprint. Review aid only (like scripts/main-room-mockup.mjs); it does not touch the game.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize } from "./sprite-lib.mjs";

const T = 16;
const src = readFileSync(join(root, "src", "game", "apartment.ts"), "utf8");
export const MAP = src.match(/const MAIN_MAP = \[([\s\S]*?)\];/)[1].match(/"([^"]*)"/g).map((s) => s.slice(1, -1));
const defs = src.match(/const MAIN: [^=]*= \{([\s\S]*?)\n\};/)[1];
const shared = { WINDOW_BLINDS: "window-blinds" };
export const spriteOf = {};
export const nameOf = {};
export const hasTasks = {};
for (const m of defs.matchAll(/^\s+(?:"(\w)"|(\w)): (WINDOW_BLINDS),/gm)) { spriteOf[m[1] ?? m[2]] = shared[m[3]]; nameOf[m[1] ?? m[2]] = "window"; }
for (const m of defs.matchAll(/^\s+(?:"(\w)"|(\w)): \{[^{}]*?sprite: "([\w-]+)"/gm)) spriteOf[m[1] ?? m[2]] = m[3];
for (const m of defs.matchAll(/^\s+(?:"(\w)"|(\w)): \{[^\n]*?name: "([^"]+)"/gm)) nameOf[m[1] ?? m[2]] = m[3];
for (const m of defs.matchAll(/^\s+(?:"(\w)"|(\w)): \{(?:[^{}]|\{[^{}]*\})*?tasks: \[/gm)) hasTasks[m[1] ?? m[2]] = true;
for (const [k, v] of Object.entries({ T: "dining table", B: "queen bed", G: "guitar", x: "package tile" })) nameOf[k] ??= v;
export { T };
export const COLS = MAP[0].length, ROWS = MAP.length;

export const load = (name, path) => {
  const f = path ?? join(root, "art", "src", `${name}.sprite`);
  if (!existsSync(f)) return null;
  return rasterize(parseSprite(`${name}.sprite`, readFileSync(f, "utf8")));
};

// `trinket`: { img } for the desk's right corner (slot trinket-desk, issue 167), drawn at (140, 17) over the desk. `rugs`: [{ img, x, y }] in pixels. `sleep`: draw the sleeping pose over the bed. `box`: a package waiting by the door.
export function composeMainRoom({ rugs = [], sleep = false, box = false, player = true, trinket = null } = {}) {
  const W = COLS * T, H = ROWS * T;
  const rgba = Buffer.alloc(W * H * 4);
  const blit = (img, ox, oy) => {
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
      if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < W && py < H) img.rgba.copy(rgba, (py * W + px) * 4, i, i + 4);
    }
  };
  const isWallCh = (ch, c) => ch === "#" || ch === "p" || ch === "q" || ch === "u" || ch === "f" || (/[wW12]/.test(ch) && (c === COLS - 1 || c === 0));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c];
    if (ch === "#") continue;
    if (ch === "p" || ch === "q" || ch === "u" || ch === "f" || /[wW]/.test(ch) && c === COLS - 1) continue;
    blit(load("floor-wood"), c * T, r * T);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = MAP[r][c];
    if (!isWallCh(ch, c)) continue;
    const name = r === 0 ? "wall-back" : c === COLS - 1 ? "wall-side-right" : c === 0 ? "wall-side-left" : "wall-front";
    blit(load(name), c * T, r * T);
  }
  for (const rug of rugs) blit(rug.img, rug.x, rug.y);
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
    if (name === "bed-made") name = sleep ? "player-sleep-bed" : "bed-made";
    if (name === "window-blinds") name = "window-blinds-open";
    const img = load(name);
    if (!img) continue;
    things.push({ img, x: b.c * T, y: b.r * T, bottom: (b.r2 + 1) * T });
  }
  if (trinket) things.push({ img: trinket.img, x: 140, y: 17, bottom: 48 });
  if (box) things.push({ img: load("delivery-box"), x: 10 * T, y: 8 * T, bottom: 9 * T });
  const start = MAP.flatMap((row, r) => [...row].map((ch, c) => (ch === "@" ? { c, r } : null))).find(Boolean);
  const pl = load("player-idle-down");
  if (player && start && pl) things.push({ img: pl, x: start.c * T, y: start.r * T, bottom: (start.r + 1) * T });
  things.sort((a, b) => a.bottom - b.bottom);
  for (const t of things) blit(t.img, t.x, t.y);
  return { width: W, height: H, rgba };
}

// A crop of an image, then scaled up whole (nearest neighbour).
export function cropScale(img, x, y, w, h, scale) {
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(w, img.width - x); h = Math.min(h, img.height - y);
  const out = Buffer.alloc(w * scale * h * scale * 4);
  for (let yy = 0; yy < h * scale; yy++) for (let xx = 0; xx < w * scale; xx++) {
    const i = ((y + ((yy / scale) | 0)) * img.width + x + ((xx / scale) | 0)) * 4;
    img.rgba.copy(out, (yy * w * scale + xx) * 4, i, i + 4);
  }
  return { width: w * scale, height: h * scale, rgba: out };
}
