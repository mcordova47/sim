// Composes the whole main room from the level data in src/game/apartment.ts and the sprites in art/src, into
// art/main-room-mockup.png and art/main-room-mockup-unmade.png (4x), as a review aid. Not wired into the game.
// Furniture sits at the top-left of the tiles its map letter covers; draw order is by bottom edge.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

const T = 16, SCALE = 4;
const src = readFileSync(join(root, "src", "game", "apartment.ts"), "utf8");
const map = src.match(/const MAIN_MAP = \[([\s\S]*?)\];/)[1].match(/"([^"]*)"/g).map((s) => s.slice(1, -1));
const defs = src.match(/const MAIN: [^=]*= \{([\s\S]*?)\n\};/)[1];
const spriteOf = {};
for (const m of defs.matchAll(/^\s+(?:"(\w)"|(\w)): \{[^{}]*?sprite: "([\w-]+)"/gm)) spriteOf[m[1] ?? m[2]] = m[3];

const load = (name) => {
  const f = join(root, "art", "src", `${name}.sprite`);
  if (!existsSync(f)) return null;
  return rasterize(parseSprite(`${name}.sprite`, readFileSync(f, "utf8")));
};
const COLS = map[0].length, ROWS = map.length, W = COLS * T, H = ROWS * T;

for (const bed of ["bed-made", "bed-unmade"]) {
  const rgba = Buffer.alloc(W * H * 4);
  const blit = (img, ox, oy) => {
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4, px = ox + x, py = oy + y;
      if (img.rgba[i + 3] && px >= 0 && py >= 0 && px < W && py < H) img.rgba.copy(rgba, (py * W + px) * 4, i, i + 4);
    }
  };
  const solid = (r, c) => map[r]?.[c] === "#";
  // floor, then walls
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = map[r][c];
    if (ch === "#") continue;
    if (ch === "p" || ch === "q" || ch === "u" || ch === "f" || /[wW]/.test(ch) && c === COLS - 1) continue;
    blit(load("floor-wood"), c * T, r * T);
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = map[r][c];
    const isWall = ch === "#" || ch === "p" || ch === "q" || ch === "u" || ch === "f" || (/[wW12]/.test(ch) && (c === COLS - 1 || c === 0));
    if (!isWall) continue;
    const name = r === 0 ? "wall-back" : c === COLS - 1 ? "wall-side-right" : c === 0 ? "wall-side-left" : "wall-front";
    blit(load(name), c * T, r * T);
  }
  // pieces: bounding box of each letter
  const boxes = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = map[r][c];
    if (!spriteOf[ch]) continue;
    const key = ch + (ch === "p" || ch === "q" || ch === "u" ? "" : "");
    const b = (boxes[key] ??= { ch, c, r, c2: c, r2: r });
    b.c = Math.min(b.c, c); b.r = Math.min(b.r, r); b.c2 = Math.max(b.c2, c); b.r2 = Math.max(b.r2, r);
  }
  const things = [];
  for (const b of Object.values(boxes)) {
    let name = spriteOf[b.ch];
    if (name === "bed-made") name = bed;
    if (name === "painting" && b.c2 - b.c === 2) name = "painting-wide";
    if (name === "window-blinds" && b.ch === "w") name = "window";
    const img = load(name);
    if (!img) { console.log(`missing sprite: ${name}`); continue; }
    things.push({ name, img, x: b.c * T, y: b.r * T, bottom: (b.r2 + 1) * T });
  }
  const start = map.flatMap((row, r) => [...row].map((ch, c) => ch === "@" ? { c, r } : null)).find(Boolean);
  const player = load("player-idle-down");
  if (start && player) things.push({ name: "player", img: player, x: start.c * T, y: start.r * T, bottom: (start.r + 1) * T });
  things.sort((a, b) => a.bottom - b.bottom);
  for (const t of things) blit(t.img, t.x, t.y);

  const big = Buffer.alloc(W * SCALE * H * SCALE * 4);
  for (let y = 0; y < H * SCALE; y++) for (let x = 0; x < W * SCALE; x++) {
    const i = ((y / SCALE | 0) * W + (x / SCALE | 0)) * 4;
    rgba.copy(big, (y * W * SCALE + x) * 4, i, i + 4);
  }
  const out = join(root, "art", bed === "bed-made" ? "main-room-mockup.png" : "main-room-mockup-unmade.png");
  writeFileSync(out, encodePng({ width: W * SCALE, height: H * SCALE, rgba: big }));
  console.log(`Wrote ${out}`);
}
