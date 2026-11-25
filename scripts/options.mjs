// Art options browser (issue 155): builds dist-options/index.html, one self-contained page (images inlined,
// no server, no network) showing candidate sprites from art/options/ next to the current art.
// `npm run tools -- options` builds it and opens it. Candidates never touch art/src or public/sprites.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";
import { composeMainRoom, cropScale, load as loadFile, MAP, COLS, ROWS, T, nameOf, hasTasks, spriteOf } from "./room-compose.mjs";

const config = JSON.parse(readFileSync(join(root, "art/options/options.json"), "utf8"));
const errors = [];

function load(path) {
  const file = path.split("/").pop();
  const sprite = parseSprite(file, readFileSync(join(root, path), "utf8"));
  if (sprite.errors.length) { errors.push(...sprite.errors); return null; }
  return rasterize(sprite);
}
const png = (img) => "data:image/png;base64," + encodePng(img).toString("base64");

// Compose sprites onto a floor of wood tiles (1x). placements: [{ img, x, y }] in tiles.
const floor = load("art/src/floor-wood.sprite");
function scene(tilesW, tilesH, placements) {
  const w = tilesW * 16, h = tilesH * 16, rgba = Buffer.alloc(w * h * 4);
  const blit = (img, ox, oy, opaqueOnly) => {
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (opaqueOnly && img.rgba[i + 3] === 0) continue;
      img.rgba.copy(rgba, ((oy + y) * w + ox + x) * 4, i, i + 4);
    }
  };
  for (let ty = 0; ty < tilesH; ty++) for (let tx = 0; tx < tilesW; tx++) blit(floor, tx * 16, ty * 16, false);
  for (const p of placements) blit(p.img, p.x * 16, p.y * 16, true);
  return { width: w, height: h, rgba };
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const home = load("art/src/player-idle-down.sprite");
const nowOutfit = Object.fromEntries(["casual", "out", "pajamas"].map((k) => [k, load(`art/src/player-${k}-idle-down.sprite`)]));
const box = load("art/src/delivery-box.sprite");
const bagNow = load("art/options/reference/takeout-bag-154.sprite");

function card(group, c) {
  const img = load(`art/options/${c.file}.sprite`);
  if (!img) return "";
  let sceneImg;
  let sceneNote;
  if (group.kind === "bag") {
    sceneImg = scene(5, 2, [{ img: box, x: 0, y: 0.5 }, { img: bagNow, x: 1.5, y: 0.5 }, { img, x: 3.5, y: 0.5 }].map((p) => ({ ...p, x: Math.round(p.x * 16) / 16 })));
    sceneNote = "on the floor: the package box, the bag now, this one";
  } else {
    const row = { home, ...nowOutfit, [group.slot]: img };
    sceneImg = scene(4, 1, Object.values(row).map((im, i) => ({ img: im, x: i, y: 0 })));
    sceneNote = `in the wardrobe: everyday, casual, out, pajamas (this one in place of ${group.slot})`;
  }
  return `<figure class="card"><figcaption><b>${c.letter}</b> ${esc(c.label)}</figcaption>
<div class="shots"><div><img class="big" src="${png(img)}" width="128" height="128"><small>8x</small></div>
<div><img class="small" src="${png(img)}" width="16" height="16"><small>1x</small></div></div>
<img class="scene" src="${png(sceneImg)}" width="${sceneImg.width * 3}"><small>${sceneNote} (3x)</small></figure>`;
}

// Rug layouts (issue 166): each design drawn over the real room, with the facts about where it lies.
const DOOR_TILES = [[10, 9], [11, 9]]; // the front door in the south wall
const BOX_TILE = [10, 8]; // where the package box and the takeout bag sit
function rugFacts(layout, img) {
  const { col, row, w, h } = layout.tile;
  const tiles = [];
  for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) tiles.push([c, r]);
  const at = ([c, r]) => MAP[r]?.[c] ?? "#";
  const tucked = new Set(), walls = [], stand = [];
  for (const [c, r] of tiles) {
    const ch = at([c, r]);
    if (ch === "#" || "pqufwW12".includes(ch)) walls.push(`${c},${r}`);
    else if (ch !== "." && ch !== "@") tucked.add(nameOf[ch] ?? ch);
    else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => hasTasks[at([c + dc, r + dr])])) stand.push(`${c},${r}`);
  }
  const hitsBox = tiles.some(([c, r]) => c === BOX_TILE[0] && r === BOX_TILE[1]);
  const hitsDoor = tiles.some(([c, r]) => DOOR_TILES.some(([dc, dr]) => dc === c && dr === r));
  // How much of the rug the bed picture leaves showing (the bed and the sleeping picture are 80x96 and drawn over it).
  const bedBox = { x: 12 * T, y: 2 * T, w: 80, h: 96 };
  const bedAlpha = (name) => { const b = loadFile(name); return b; };
  const holes = (name) => {
    const b = bedAlpha(name); if (!b) return null;
    const x0 = layout.tile.col * T, y0 = layout.tile.row * T;
    let n = 0;
    for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) {
      const px = bedBox.x + x, py = bedBox.y + y;
      if (px < x0 || py < y0 || px >= x0 + w * T || py >= y0 + h * T) continue;
      if (b.rgba[(y * b.width + x) * 4 + 3] === 0 && img.rgba[((py - y0) * img.width + (px - x0)) * 4 + 3] !== 0) n++;
    }
    return n;
  };
  return { tiles, tucked: [...tucked], walls, stand, hitsBox, hitsDoor, holes: layout.sleep ? Object.fromEntries(["bed-made", "bed-unmade", "player-sleep-bed", "player-sleep-bed-unmade", "sp-bed-top"].map((n) => [n, holes(n)])) : null };
}
function rugCard(layout, design) {
  const img = load(design.src);
  if (!img) return "";
  const { col, row, w, h } = layout.tile;
  const rug = { img, x: col * T, y: row * T };
  const room = composeMainRoom({ rugs: [rug], box: layout.box });
  const m = 16;
  const crop = cropScale(room, rug.x - m, rug.y - m, w * T + 2 * m, h * T + 2 * m, 8);
  const sleepCrop = layout.sleep ? cropScale(composeMainRoom({ rugs: [rug], sleep: true, player: false }), rug.x - m, rug.y - m, w * T + 2 * m, h * T + 2 * m, 8) : null;
  return `<figure class="card rug${design.shipped ? " shipped" : ""}"><figcaption><b>${design.id}</b>${design.shipped ? ' <span class="tag">IN THE GAME</span>' : ""} ${esc(design.label)}</figcaption>
<div class="scroll"><img class="room1" src="${png(room)}" width="${room.width}" height="${room.height}"></div><small>the room at 1x</small>
<div class="scroll"><img class="room8" src="${png(crop)}" width="${crop.width}" height="${crop.height}"></div><small>8x, a tile of margin around it${layout.box ? " (the package box is waiting at col 10, row 8)" : ""}</small>
${sleepCrop ? `<div class="scroll"><img class="room8" src="${png(sleepCrop)}" width="${sleepCrop.width}" height="${sleepCrop.height}"></div><small>8x, with the sleeping picture drawn over the bed</small>` : ""}</figure>`;
}
function rugSection(g) {
  const blocks = g.layouts.filter((l) => !l.out).map((l) => {
    const first = load(l.designs[0].src);
    const f = rugFacts(l, first);
    const { col, row, w, h } = l.tile;
    const facts = [
      `Footprint: ${w} x ${h} tiles (${w * T} x ${h * T} px) at cols ${col}-${col + w - 1}, rows ${row}-${row + h - 1} (x ${col * T}, y ${row * T}).`,
      `Slots: ${l.slots}`,
      f.walls.length ? `WARNING: covers wall tiles ${f.walls.join(", ")}.` : "It covers no wall tile.",
      f.tucked.length ? `Runs under: ${f.tucked.join(", ")}.` : "It runs under nothing.",
      `Package and takeout tile (col 10, row 8): ${f.hitsBox ? "COVERED" : "clear"}. Front door tiles: ${f.hitsDoor ? "COVERED" : "clear"}.`,
      f.stand.length ? `Open floor tiles beside a piece with tasks that it lies on (you can still stand and walk there, it is not solid): ${f.stand.join(" | ")}.` : "It lies on no standing tile for a task.",
      f.holes ? `Bed check: transparent pixels of each bed picture that let the rug show through (0 means the bed covers it cleanly): ${Object.entries(f.holes).map(([n, v]) => `${n} ${v}`).join(", ")}.` : "",
    ].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join("");
    return `<div class="layout"><h3><b class="L">${l.letter}</b> ${esc(l.label)}</h3><ul>${facts}</ul><div class="row">${l.designs.map((d) => rugCard(l, d)).join("")}</div></div>`;
  }).join("\n");
  return `<section><h2>${esc(g.title)}</h2><p>${esc(g.blurb)}</p>${blocks}</section>`;
}

// Alebrije candidates (issue 167): each is a small in-room sprite (the trinket cell policy, at most 10x8, foot on row 12)
// shown in the desk's right corner of the real room, and a 48x48 close-up shown on a mock of the Examine card (issue 173).
function alebrijeCard(g, c) {
  const small = load(`art/options/${c.file}.sprite`);
  const close = load(`art/options/${c.close}.sprite`);
  if (!small || !close) return "";
  const room = composeMainRoom({ trinket: { img: small } });
  const crop = cropScale(room, 96, 8, 72, 44, 8);
  return `<figure class="card alebrije"><figcaption><b>${c.letter}</b> ${esc(c.label)}${c.current ? ' <span class="tag">IN THE GAME</span>' : ""}</figcaption>
<div class="pair"><div><div class="night"><img src="${png(close)}" width="144" height="144"></div><small>close-up, 48x48 shown at 3x (candidate art, nothing ships from it yet)</small></div>
<div><div class="night sm"><img src="${png(small)}" width="128" height="128"></div><small>small, 16x16 cell shown at 8x</small></div></div>
<div class="scroll"><img src="${png(crop)}" width="${crop.width}" height="${crop.height}"></div><small>on the desk, next to the laptop, 8x</small>
<div class="scroll"><img src="${png(room)}" width="${room.width}" height="${room.height}"></div><small>the whole room at 1x</small>
<div class="exam"><div class="exam-img"><img src="${png(close)}" width="144" height="144"></div><div class="exam-txt"><b>${esc(c.name)}</b><span>FROM: A PACKAGE</span><p>${esc(c.note)}</p></div></div><small>the Examine card as the design draws it (the game draws the text in its own font)</small></figure>`;
}
function alebrijeSection(g) {
  return `<section id="alebrije"><h2>${esc(g.title)}</h2><p>${esc(g.blurb)}</p><div class="row">${g.candidates.map((c) => alebrijeCard(g, c)).join("")}</div></section>`;
}

// Replacement furniture (issue 172): each candidate drawn in the real room in place of the piece, at 1x, and an 8x crop of the piece
// with its neighbours; the first card is the stand now, so the candidates can be judged beside it. The sprite name stays what the game finds.
function furnitureCard(g, c, now) {
  const img = load(c.src ?? `art/options/${c.file}.sprite`);
  if (!img) return "";
  const room = composeMainRoom({ swap: { [g.piece]: img } });
  const crop = cropScale(room, g.crop.x, g.crop.y, g.crop.w, g.crop.h, 8);
  return `<figure class="card furn${c.now ? " cur" : ""}"><figcaption><b>${esc(c.letter)}</b> ${esc(c.label)}</figcaption>
<div class="shots"><div><img class="big" src="${png(img)}" width="128" height="128"><small>8x</small></div><div><img class="small" src="${png(img)}" width="16" height="16"><small>1x</small></div></div>
<div class="scroll"><img src="${png(crop)}" width="${crop.width}" height="${crop.height}"></div><small>in the room, 8x (the sofa, the lamp table and the south wall around it)</small>
<div class="scroll"><img src="${png(room)}" width="${room.width}" height="${room.height}"></div><small>the whole room at 1x</small></figure>`;
}
function furnitureSection(g) {
  const all = [{ letter: "NOW", now: true, src: g.current.src, label: g.current.label }, ...g.candidates];
  return `<section id="${g.id}"><h2>${esc(g.title)}</h2><p>${esc(g.blurb)}</p><div class="row">${all.map((c) => furnitureCard(g, c)).join("")}</div></section>`;
}

const sections = config.groups.map((g) => {
  if (g.kind === "furniture") return furnitureSection(g);
  if (g.kind === "rugs") return rugSection(g);
  if (g.kind === "alebrije") return alebrijeSection(g);
  const current = g.current.map((c) => {
    const img = load(c.src);
    return img ? `<figure class="card cur"><figcaption>${esc(c.label)}</figcaption><div class="shots"><div><img class="big" src="${png(img)}" width="128" height="128"><small>8x</small></div><div><img class="small" src="${png(img)}" width="16" height="16"><small>1x</small></div></div></figure>` : "";
  }).join("");
  return `<section><h2>${esc(g.title)}</h2><p>${esc(g.blurb)}</p><div class="row">${current}</div><div class="row">${g.candidates.map((c) => card(g, c)).join("")}</div></section>`;
}).join("\n");

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(config.title)}</title>
<style>
body{margin:0;padding:24px 16px;background:#1a1a2e;color:#edf2f4;font:15px/1.45 system-ui,sans-serif}
main{max-width:1100px;margin:0 auto}h1{font-size:22px}h2{margin-top:40px;border-bottom:1px solid #3b3e5c;padding-bottom:4px}
p{color:#a9adc9;max-width:70ch}.row{display:flex;flex-wrap:wrap;gap:16px;margin:16px 0}
.card{margin:0;background:#2b2d42;border-radius:8px;padding:12px;width:300px}.card.cur{border:1px dashed #a9adc9}
figcaption{margin-bottom:8px;min-height:3em}figcaption b{display:inline-block;background:#f08a4b;color:#1a1a2e;border-radius:4px;padding:0 7px;margin-right:4px}
.shots{display:flex;gap:16px;align-items:flex-end}.shots>div{display:flex;flex-direction:column;gap:2px}
img{image-rendering:pixelated;display:block}.big,.small{background:repeating-conic-gradient(#242538 0 25%,#2b2d42 0 50%) 0 0/16px 16px}
.card.furn{width:auto;max-width:100%}.card.furn img{margin-top:6px}.card.rug{width:auto;max-width:100%}.card.shipped{border:2px solid #5fae6b}.tag{background:#5fae6b;color:#1a1a2e;border-radius:4px;padding:0 6px;font-size:12px;font-weight:700}.card.rug img{margin-top:8px}.scroll{overflow-x:auto;max-width:100%}.layout{margin:24px 0;padding:12px;border:1px solid #3b3e5c;border-radius:8px}.layout h3{margin:0 0 6px}.L{background:#f2a7c0;color:#1a1a2e;border-radius:4px;padding:0 8px;margin-right:6px}.layout ul{color:#a9adc9;margin:6px 0;padding-left:20px;max-width:90ch}
.small{background-size:2px 2px}.card.alebrije{width:auto;max-width:100%}.pair{display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap}.night{background:#2b2d42;border:2px solid #1a1a2e;display:inline-block;padding:0}.night.sm{background:#b5835a}.card.alebrije img{margin-top:6px}.exam{display:flex;gap:12px;margin-top:10px;background:#edf2f4;color:#1a1a2e;border:2px solid #1a1a2e;padding:8px;max-width:520px}.exam-img{background:#2b2d42;border:2px solid #1a1a2e}.exam-txt{display:flex;flex-direction:column;gap:6px;font:12px/1.5 ui-monospace,monospace}.exam-txt span{color:#6b6f94}.exam-txt p{margin:0;color:#1a1a2e;max-width:22ch}.scene{margin-top:12px;max-width:100%;height:auto}small{color:#a9adc9;font-size:12px}
</style><main><h1>${esc(config.title)}</h1>
<p>Candidates only: nothing here is in the game. Each is shown large (8x) on a checkerboard, at its real size (1x), and in a small scene. For outfits only the standing-facing-down frame is drawn so far. Tell the planner the letters you like, for example "bag D, casual B, out A, pajamas C".</p>
${sections}</main>`;

mkdirSync(join(root, "dist-options"), { recursive: true });
writeFileSync(join(root, "dist-options/index.html"), html);
console.log("wrote dist-options/index.html");
