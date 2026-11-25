// Mockup-only art for docs/plant-pots-design.md (issue 179). Everything here is DRAWN IN CODE for this review, in the game's
// palette, and is a stand-in: no file in art/src changes. Where a piece can be taken from the real bookshelf or plant sprites
// it is (the vase and bowl are cut out of art/src/bookshelf.sprite exactly), so a fresh game would be pixel for pixel the same.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { root, fromRows, canvas } from "./lib.mjs";

const rowsOf = (name) => readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8").split("\n").filter((l) => !l.startsWith("#")).slice(1).filter((l) => l.length > 0);
const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
const out = (g) => fromRows(g.map((r) => r.join("")));
const put = (g, x, y, k) => { if (g[y] && x >= 0 && x < g[y].length) g[y][x] = k; };
const draw = (g, list) => { for (const [x, y, k] of list) put(g, x, y, k); };
const hline = (g, x0, x1, y, k) => { for (let x = x0; x <= x1; x++) put(g, x, y, k); };

const shelf = rowsOf("bookshelf").map((r) => [...r]);
const OAK = "a";
// The vase with its sprays (shelf rows 1 to 13, x 3 to 12) and the bowl (rows 18 to 23), cut out of the real sprite.
const vaseCut = (withSprays) => {
  const g = grid(16, 16);
  for (let y = 1; y <= 13; y++) for (let x = 3; x <= 12; x++) {
    const k = shelf[y][x];
    if (k === OAK) continue;
    if (!withSprays && "bdk".includes(k)) continue;
    g[y][x] = k;
  }
  return g;
};
// bowlCut: slot rows are shelf rows minus 16 plus 2 (the nudge), i.e. the old baked row minus 14.
const bowlMask = { 18: [4, 11], 19: [3, 12], 20: [3, 12], 21: [3, 12], 22: [4, 11], 23: [5, 10] };
const bowlCut = () => {
  const g = grid(16, 16); // the bowl slot starts at shelf row 14: shelf row 18 is slot row 4
  for (const [row, [a, b]] of Object.entries(bowlMask)) for (let x = a; x <= b; x++) g[Number(row) - 14][x] = shelf[Number(row)][x];
  return g;
};

export const art = {};
// The bookshelf with the vase and the bowl taken out (bare oak where they were): the part of the sprite that would change.
{
  const g = shelf.map((r) => [...r]);
  for (let y = 1; y <= 13; y++) for (let x = 2; x <= 12; x++) if (g[y][x] !== OAK) g[y][x] = OAK;
  for (const [row, [a, b]] of Object.entries(bowlMask)) for (let x = a - 1; x <= b + 1; x++) if (g[Number(row)][x] !== "9" && x >= 2 && x <= 12) g[Number(row)][x] = OAK;
  art.shelfBare = out(g);
}
art.vaseDefault = out(vaseCut(true));
art.vaseEmpty = out(vaseCut(false));
// The bowl slot is at abs y 32 (shelf rows 16 to 31); the bowl item is drawn 2 px lower than the baked bowl (slot rows 4 to 9, shelf rows 20 to 25), so a low plant has 4 rows (slot rows 0 to 3) above its rim, clear of the vase above.
const shiftDown = (g, n) => [...Array.from({ length: n }, () => Array(16).fill(".")), ...g.slice(0, g.length - n)];
art.bowlEmpty = out(bowlCut());

// Fresh, wilting and dried cut flowers in the same vase (tulips). Stand-ins.
const flowers = (look) => {
  const g = vaseCut(false);
  const C = { fresh: { a: "b", b: "d", c: "k", stem: "f" }, wilt: { a: "7", b: "9", c: "m", stem: "e" }, dried: { a: "j", b: "9", c: "m", stem: "m" } }[look];
  if (look === "fresh") {
    draw(g, [[6, 3, C.stem], [7, 4, C.stem], [8, 2, C.stem], [8, 3, C.stem], [8, 4, C.stem], [9, 4, C.stem], [10, 4, C.stem]]);
    for (const [x, y] of [[5, 1], [6, 1], [5, 2], [6, 2]]) put(g, x, y, C.a);
    for (const [x, y] of [[8, 0], [9, 0], [8, 1], [9, 1]]) put(g, x, y, C.b);
    for (const [x, y] of [[10, 2], [11, 2], [10, 3], [11, 3]]) put(g, x, y, C.c);
  } else if (look === "wilt") {
    // heads hang over the rim, stems bent
    draw(g, [[7, 4, C.stem], [6, 3, C.stem], [5, 3, C.stem], [8, 3, C.stem], [8, 4, C.stem], [9, 3, C.stem], [10, 3, C.stem], [9, 4, C.stem]]);
    for (const [x, y] of [[3, 3], [4, 3], [3, 4], [4, 4]]) put(g, x, y, C.a);
    for (const [x, y] of [[8, 1], [9, 1], [9, 2], [8, 2]]) put(g, x, y, C.b);
    for (const [x, y] of [[10, 4], [11, 4], [11, 5], [10, 5]]) put(g, x, y, C.c);
  } else {
    draw(g, [[6, 3, C.stem], [7, 4, C.stem], [8, 2, C.stem], [8, 3, C.stem], [8, 4, C.stem], [9, 4, C.stem], [10, 4, C.stem]]);
    for (const [x, y] of [[5, 1], [6, 1], [5, 2], [6, 2]]) put(g, x, y, C.a);
    for (const [x, y] of [[8, 0], [9, 0], [8, 1], [9, 1]]) put(g, x, y, C.b);
    for (const [x, y] of [[10, 2], [11, 2], [10, 3], [11, 3]]) put(g, x, y, C.c);
    for (const [x, y] of [[5, 1], [8, 0], [10, 2]]) put(g, x, y, "a"); // paler centres
  }
  return out(g);
};
art.flowersFresh = flowers("fresh");
art.flowersWilt = flowers("wilt");
art.flowersDried = flowers("dried");

// Low plants in the bowl (slot rows 4 to 9 are the bowl; rows 0 to 3 are free above the rim).
const inBowl = (fill) => { const g = bowlCut(); fill(g); return out(g); };
const fillInterior = (g, pattern) => { for (let y = 5; y <= 7; y++) for (let x = 4; x <= 11; x++) g[y][x] = pattern[(x + y) % pattern.length]; };
art.moss = inBowl((g) => {
  fillInterior(g, "fefeffef");
  draw(g, [[5, 3, "f"], [6, 3, "e"], [7, 3, "f"], [8, 3, "f"], [9, 3, "e"], [10, 3, "f"], [6, 2, "f"], [7, 2, "f"], [8, 2, "e"], [9, 2, "f"], [4, 4, "f"], [11, 4, "f"], [8, 1, "d"], [5, 2, "f"]]);
  hline(g, 5, 10, 3, "f"); put(g, 7, 3, "e"); put(g, 9, 3, "e");
});
art.succulent = inBowl((g) => {
  fillInterior(g, "9a99");
  // three rosettes
  draw(g, [[7, 0, "g"], [8, 0, "g"], [6, 1, "g"], [7, 1, "f"], [8, 1, "f"], [9, 1, "g"], [5, 2, "f"], [6, 2, "f"], [7, 2, "e"], [8, 2, "e"], [9, 2, "f"], [10, 2, "f"], [6, 3, "e"], [7, 3, "f"], [8, 3, "f"], [9, 3, "e"],
    [4, 3, "g"], [5, 3, "f"], [4, 4, "f"], [10, 3, "f"], [11, 3, "g"], [11, 4, "f"], [7, 1, "k"]]);
});
art.cactus = inBowl((g) => {
  fillInterior(g, "9a99");
  for (let y = 0; y <= 3; y++) { put(g, 7, y, "f"); put(g, 8, y, "e"); }
  draw(g, [[7, 0, "k"], [8, 0, "k"], [6, 2, "f"], [5, 2, "f"], [5, 1, "f"], [9, 2, "e"], [10, 2, "e"], [10, 1, "e"], [7, 1, "d"], [8, 2, "d"], [7, 3, "d"]]);
  put(g, 7, 4, "f"); put(g, 8, 4, "e");
});
art.bonsai = inBowl((g) => {
  fillInterior(g, "7878");
  draw(g, [[7, 3, "7"], [8, 3, "7"], [8, 2, "7"], [7, 4, "7"]]);
  for (const [x, y] of [[4, 1], [5, 1], [6, 1], [7, 1], [4, 2], [5, 2], [6, 2], [5, 0], [6, 0], [8, 1], [9, 1], [10, 1], [9, 2], [10, 2], [11, 2], [9, 0], [10, 0], [8, 0], [7, 0]]) put(g, x, y, (x + y) % 3 === 0 ? "e" : "f");
});

// The south pot with nothing in it (a real pot cut from plant-0: the leaves are removed, soil stays).
{
  const g = rowsOf("plant-0").map((r) => [...r]);
  for (let y = 0; y <= 9; y++) g[y].fill(".");
  art.potEmpty = out(g);
}

// Floor trees for the nook (stand-ins). `small` is 16x16 (the whole tile); `tall` is 16x32 (the tile plus 16 above).
const palm = (h, rise) => {
  const g = grid(16, h), top = h - 16, cy = top - rise; // `top` is the tile's first row; `cy` where the crown starts
  // pot: rows 11 to 15 of the tile
  hline(g, 5, 10, top + 11, "1");
  for (let y = 12; y <= 14; y++) { put(g, 4, top + y, "1"); for (let x = 5; x <= 10; x++) put(g, x, top + y, y === 12 ? "c" : "b"); put(g, 11, top + y, "1"); }
  hline(g, 5, 10, top + 15, "1");
  hline(g, 5, 10, top + 11, "7");
  for (let y = cy + 5; y <= top + 10; y++) { put(g, 7, y, "7"); put(g, 8, y, "8"); }
  const arc = (x0, y0, dx, dy, n, k) => { for (let i = 0; i < n; i++) put(g, x0 + dx * i, y0 + Math.round(dy * i * i / n), k); };
  arc(7, cy + 4, -1, 0.6, 6, "f"); arc(7, cy + 3, -1, 0.2, 6, "e"); arc(8, cy + 4, 1, 0.6, 6, "f"); arc(8, cy + 3, 1, 0.2, 6, "e");
  arc(7, cy + 2, -1, -0.5, 4, "f"); arc(8, cy + 2, 1, -0.5, 4, "f");
  for (const [x, y] of [[7, cy + 1], [8, cy + 1], [7, cy + 2], [8, cy + 2], [8, cy + 3], [7, cy + 3], [7, cy + 4], [8, cy + 4]]) put(g, x, y, "e");
  // a second, shorter pair of fronds for the tall tree
  if (rise > 0) { arc(7, cy + 7, -1, 0.5, 5, "f"); arc(8, cy + 8, 1, 0.5, 5, "f"); }
  return out(g);
};
art.treeSmall = palm(16, 0);
art.treeTall = palm(32, 12);
