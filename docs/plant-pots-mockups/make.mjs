// Renders every image of docs/plant-pots-design.md into this folder. Run from the repo root:  node docs/plant-pots-mockups/make.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compose, desktopView, narrowView, scale, crop, blit, canvas, rect, text, textK, encodePng, load } from "./lib.mjs";
import { art } from "./art.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const save = (name, img) => writeFileSync(join(here, name), encodePng(img));
const L = load;

// Slot boxes (abs): vase (160,16), bowl (160,30), plant (160,52), each 16x16.
const VASE = { x: 160, y: 16 }, BOWL = { x: 160, y: 32 }, PLANT = { x: 160, y: 52 };
const pots = ({ vase = art.vaseDefault, bowl = art.bowlEmpty }) => [
  ...(vase ? [{ img: vase, x: VASE.x, y: VASE.y, bottom: 80.05 }] : []),
  ...(bowl ? [{ img: bowl, x: BOWL.x, y: BOWL.y, bottom: 80.06 }] : []),
];
// A state of the room: what is in each pot. `plant` is a sprite name, `up` how far a tall late stage reaches above its slot.
export function room({ vase = art.vaseDefault, bowl = art.bowlEmpty, plant = "plant-1", up = 0, plantImg = null, extras = [], blinds, player = true, bare = true } = {}) {
  return compose({ shelfImg: bare ? art.shelfBare : null, plant, up, plantImg, extras: [...pots({ vase, bowl }), ...extras], blinds, player });
}
export const states = {
  default: { plant: "plant-1" },
  allDried: { vase: L("plant-pampas"), bowl: art.moss, plant: "spider-2" },
  pothos: { plant: "pothos-5", up: 16, vase: art.vaseDefault, bowl: art.bowlEmpty },
  monstera: { plant: "monstera-4", up: 16, bowl: art.succulent },
  fresh: { vase: art.flowersFresh, plant: "plant-2" },
  wilt: { vase: art.flowersWilt, plant: "plant-2" },
  dried: { vase: art.flowersDried, plant: "plant-2" },
};
// real overhang sprites are taller than 16: plantImg + y offset is handled by `up`; compose draws at y = 52 - up.

// 1. Today: the real sprite and the room, with the three baked things named. (1x room 320x192 and 8x shelf.)
{
  const today = compose({});
  save("01-room-today-320x192.png", desktopView(today, "TODAY: THE REAL ROOM"));
  const real = scale(crop(compose({ player: false }), 152, 8, 40, 88), 8);
  const sprite = scale(L("bookshelf"), 8);
  const sx = 40 * 8 + 24;
  const sheet = canvas(sx + 16 * 8 + 16 + 200, 88 * 8 + 40, "ink");
  blit(sheet, real, 8, 32);
  blit(sheet, sprite, sx, 32 + 8 * 8);
  textK(sheet, "IN THE ROOM", 8, 8, 2); textK(sheet, "THE SPRITE ALONE (16X64)", sx, 8, 2);
  // the plant slot (abs 160,52) over the room crop (crop origin 152,8)
  const bx = (160 - 152) * 8 + 8, by = (52 - 8) * 8 + 32;
  for (let i = 0; i < 128; i++) { rect(sheet, bx + i, by, 1, 2, "tangerine"); rect(sheet, bx + i, by + 126, 1, 2, "tangerine"); rect(sheet, bx, by + i, 2, 1, "tangerine"); rect(sheet, bx + 126, by + i, 2, 1, "tangerine"); }
  // what is baked in, by the sprite's own rows (each row is 8 px here)
  const lab = (row0, row1, t) => { const y = 32 + 8 * 8 + row0 * 8; textK(sheet, t, sx + 16 * 8 + 12, y + ((row1 - row0) * 8) / 2 - 3, 1); rect(sheet, sx + 16 * 8 + 4, y, 2, (row1 - row0 + 1) * 8, "mist"); };
  lab(1, 13, "VASE + SPRAYS"); lab(18, 23, "BOWL"); lab(27, 34, "BOOKS"); lab(36, 51, "BARE OAK: THE PLANT SLOT"); lab(53, 63, "SOUTH FACE");
  save("02-shelf-today-8x.png", sheet);
}

// 3. The pots, states side by side at 8x (shelf crop only): empty bowl, dried vase, snake plant (today's look) and others.
{
  const cases = [
    ["DEFAULT", states.default],
    ["PAMPAS, MOSS, SPIDER", states.allDried],
    ["POTHOS HANGING", states.pothos],
    ["MONSTERA OVER BOWL", states.monstera],
    ["FRESH TULIPS", states.fresh],
    ["WILTING", states.wilt],
    ["DRIED", states.dried],
  ];
  const cw = 32 * 8, ch = 88 * 8;
  const sheet = canvas(cw * 4 + 5 * 8, ch * 2 + 3 * 40, "ink");
  cases.forEach(([label, st], i) => {
    const r = room({ ...st, player: false });
    const v = scale(crop(r, 152, 8, 32, 88), 8);
    const x = 8 + (i % 4) * (cw + 8), y = 40 + Math.floor(i / 4) * (ch + 40);
    blit(sheet, v, x, y);
    textK(sheet, label, x, y - 24, 2);
  });
  save("03-shelf-states-8x.png", sheet);
}

// 4. Whole room at 320x192 in three states.
save("04-room-default-320x192.png", desktopView(room(states.default), "DEFAULT: DRIED VASE, EMPTY BOWL, SNAKE PLANT"));
save("05-room-pothos-320x192.png", desktopView(room(states.pothos), "POTHOS HANGING OVER THE SOUTH FACE"));
save("06-room-flowers-320x192.png", desktopView(room({ ...states.fresh, bowl: art.cactus }), "FRESH TULIPS IN THE VASE, A CACTUS IN THE BOWL"));
// Narrow (224x208): the camera follows the player; x 80 shows the shelf, the nook and the east windows.
save("07-room-narrow-224x208.png", narrowView(room({ ...states.allDried, player: true, playerAt: { x: 160, y: 80 } }), 80, "NARROW VIEW (CAMERA X 80)"));

// 8. The low plants, one by one at 8x on the bowl (and the cut-flower looks): the first art set as stand-ins.
{
  const items = [["EMPTY BOWL", art.bowlEmpty, "bowl"], ["MOSS", art.moss, "bowl"], ["SUCCULENT", art.succulent, "bowl"], ["CACTUS", art.cactus, "bowl"], ["BONSAI", art.bonsai, "bowl"]];
  const sheet = canvas(items.length * (16 * 8 + 16) + 16, 36 * 8 + 56, "ink");
  items.forEach(([label, img], i) => {
    const r = room({ bowl: img, player: false });
    const x = 16 + i * (16 * 8 + 16);
    blit(sheet, scale(crop(r, 160, 16, 16, 36), 8), x, 40);
    textK(sheet, label, x, 12, 1 * 2);
  });
  save("08-bowl-items-8x.png", sheet);
}

// 9. The window sill (abs 288,112, 16x16: the lower half of the lower window), real sprites only.
{
  const sill = (name, blinds) => room({ ...states.default, extras: [{ img: L(name), x: 288, y: 112, bottom: 128.1 }], blinds, player: false });
  const cases = [["STILL: LAVENDER", "plant-lavender", "window-blinds-open"], ["STILL: EUCALYPTUS", "plant-eucalyptus", "window-blinds-closed"], ["LATER LIVE: SPIDER", "spider-3", "window-blinds-open"], ["LATER LIVE: POTHOS", "pothos-2", "window-blinds-closed"]];
  const cw = 32 * 8, ch = 64 * 8;
  const sheet = canvas(cw * 4 + 5 * 8, ch + 56, "ink");
  cases.forEach(([label, name, blinds], i) => {
    const x = 8 + i * (cw + 8);
    blit(sheet, scale(crop(sill(name, blinds), 272, 80, 32, 64), 8), x, 40);
    textK(sheet, label, x, 12, 2);
  });
  save("09-window-sill-8x.png", sheet);
  save("10-room-sill-320x192.png", desktopView(room({ ...states.default, extras: [{ img: L("plant-lavender"), x: 288, y: 112, bottom: 128.1 }] }), "SILL: A STILL ITEM (LAVENDER)"));
}

// 11. The floor-tree spot: the tile at col 8, row 7 (abs 128,112), shut in by the lamp table, the record stand and two walls.
{
  const tile = (img, up, behind) => ({ img, x: 128, y: 112 - up, bottom: behind ? 111.9 : 128.1 });
  const cases = [
    ["TODAY: EMPTY TILE", null],
    ["A: 16X16 TREE", tile(art.treeSmall, 0)],
    ["B: 16X32 OVER LAMP", tile(art.treeTall, 16)],
    ["C: 16X32 BEHIND LAMP", tile(art.treeTall, 16, true)],
  ];
  const cw = 64 * 8, ch = 64 * 8;
  const sheet = canvas(cw * 2 + 3 * 8, ch * 2 + 3 * 48, "ink");
  cases.forEach(([label, t], i) => {
    const r = room({ ...states.default, extras: t ? [t] : [], player: false });
    const x = 8 + (i % 2) * (cw + 8), y = 48 + Math.floor(i / 2) * (ch + 48);
    blit(sheet, scale(crop(r, 96, 64, 64, 64), 8), x, y);
    textK(sheet, label, x, y - 28, 2);
  });
  save("11-floor-tree-nook-8x.png", sheet);
  save("12-room-tree-320x192.png", desktopView(room({ ...states.default, extras: [tile(art.treeSmall, 0)], player: true, playerAt: { x: 144, y: 96 } }), "FLOOR TREE IN THE NOOK (OPTION A)"));
  save("13-room-tree-tall-320x192.png", desktopView(room({ ...states.default, extras: [tile(art.treeTall, 16)], player: true, playerAt: { x: 144, y: 96 } }), "FLOOR TREE, OPTION B: THE CROWN HIDES THE LAMP"));
}

// 14. The whole plan at once, 320x192: vase of dried flowers, a bonsai in the bowl, a pothos hanging, lavender on the sill, a tree in the nook.
save("14-room-everything-320x192.png", desktopView(room({ vase: art.vaseDefault, bowl: art.bonsai, plant: "pothos-5", up: 16, extras: [{ img: L("plant-lavender"), x: 288, y: 112, bottom: 128.1 }, { img: art.treeSmall, x: 128, y: 112, bottom: 128.1 }], playerAt: { x: 144, y: 96 } }), "EVERYTHING AT ONCE (STAND-INS)"));
