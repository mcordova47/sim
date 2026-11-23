// Art options browser (issue 155): builds dist-options/index.html, one self-contained page (images inlined,
// no server, no network) showing candidate sprites from art/options/ next to the current art.
// `npm run tools -- options` builds it and opens it. Candidates never touch art/src or public/sprites.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { root, parseSprite, rasterize, encodePng } from "./sprite-lib.mjs";

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

const sections = config.groups.map((g) => {
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
.small{background-size:2px 2px}.scene{margin-top:12px;max-width:100%;height:auto}small{color:#a9adc9;font-size:12px}
</style><main><h1>${esc(config.title)}</h1>
<p>Candidates only: nothing here is in the game. Each is shown large (8x) on a checkerboard, at its real size (1x), and in a small scene. For outfits only the standing-facing-down frame is drawn so far. Tell the planner the letters you like, for example "bag D, casual B, out A, pajamas C".</p>
${sections}</main>`;

mkdirSync(join(root, "dist-options"), { recursive: true });
writeFileSync(join(root, "dist-options/index.html"), html);
console.log("wrote dist-options/index.html");
