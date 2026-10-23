---
id: 054
title: Wall texture from the new photo
status: done
owner: marc + agent
depends_on: []
---

## Goal
Marc added `wall-texture.jpeg` (2026-10-23): a close-up of the real wall, a pale off-white, heavily textured plaster (a stippled, raised, uneven stucco-like surface, slightly warm grey). The current wall tiles (`wall-back`, `wall-side-*`, `wall-front`, and their kitchen and bath variants) may read as brick or plain; find out which walls in the real apartment look like this and redraw those tiles.

## Acceptance criteria
- Marc's answer (2026-10-23): **the main room walls are this plaster** (the texture photo is of them; replace the brick look); **the kitchen walls are drywall** (smooth painted wall with a faint orange-peel or roller texture at most; read the kitchen photos for the paint color); **the bathroom walls are white tiles** (a small square tile grid with grout lines, glossy highlight). Draw the main room, kitchen and bath wall sets separately (`wall-back`, `wall-front`, `wall-side-*` per room); the kitchen and bath variants already exist (`-kitchen`, `-bath`), the main room's are the base names.
- Redraw the main room's plaster wall tiles as a tileable 16x16 texture from the photo: a few palette colors, an irregular pattern with no visible repeat seams when tiled, and enough contrast to read at 1x without becoming noisy behind the furniture. Keep the baseboard, shadow and top-slice rules from `docs/art-style.md`.
- Corner and doorway tiles still join correctly (`wall-tiles.ts` rules); render all three rooms and look at them at 1x.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23 (agent): Started. Plan: draw the main room's plaster, the kitchen's drywall and the bath's tile as separate wall sets. Rendered all three rooms first: the "brick" look is actually the wood and stone *floors*; the old walls were plain mist grey.
- 2026-10-23 (agent): Done, status review. Photos read: `wall-texture.jpeg` (pale warm-grey raised plaster, clumpy bumps), `west-facing-kitchen.jpg` (smooth warm greige drywall, white painted baseboard), `west-facing-bath.jpg` (white glossy tile).
  - **Main (plaster):** `wall-back`, `wall-front` redrawn on a 16-wide wrap-around bump field (palette 5 base, 6 highlight bumps on the window-lit side, a few 4 dents); kept top slice, wood baseboard, shadow band and ink lines. `wall-side-left/right` top faces got a few 5 specks.
  - **Kitchen (drywall):** new `wall-back-kitchen`, `wall-front-kitchen`: 5 with a few orange-peel specks, and a white-painted baseboard (6/6/5) as in the photo instead of wood.
  - **Bath (tile):** new `wall-back-bath`, `wall-front-bath`: white 6 tiles, 5 grout every 8 px, a sky-blue glint on each tile for gloss. Marc said small square tiles; the photo shows larger rectangular subway tile, so I followed Marc's words (8x8 squares). Easy to change if he prefers subway.
  - **Code:** `wallTileName` in `src/game/wall-tiles.ts` now adds `-kitchen`/`-bath` to back and front too (before only side walls had variants); test updated. Docs `docs/floor-plan.md` and `docs/art-style.md` updated. Corner and doorway rules (`wallKind`) untouched, doorway sprites untouched (their wall-thickness columns are not plaster).
  - **Palette note:** no warm grey exists, so plaster is mist (cool) with paper highlights; the kitchen greige is also mist. Not added to the palette.
  - **Known limit:** the plaster repeats every 16 px horizontally (one tile per kind); the bump field wraps so there is no seam, but a repeat is faintly visible on long walls.
  - Verified: `npm run sprites`, `npm test` (1017 pass), `npm run build` pass. Rendered main, kitchen and bath at 4x (hour 12 and hour 23, lamp glow) and 1x (330x240 window) via the dev server; plaster reads as texture without fighting furniture. Not checked: how it feels in a real browser at other window sizes.

- 2026-10-23 (reviewer, independent): **Verdict: approve.**
  - Checks run: `npm run sprites`, `npm test` (48 files, 1017 pass), `npm run build` all pass; sprites run left the tree clean (generated PNGs match the sources). Own script (vite-node, kept outside the repo) walked every wall tile of `MAIN_MAP`, `KITCHEN_MAP`, `BATH_MAP` through `wallKind`/`wallTileName`/`doorwayName`: every resolved wall sprite and doorway sprite exists as `.sprite` and `.png` in all three rooms (main 48 tiles, kitchen 37, bath 22), none missing. Only `wallTileName` in `src/game` references wall names (via `tilemap.ts`), so no stale name uses.
  - Criterion 1 (separate sets per room, materials per Marc): pass. Main plaster, kitchen drywall (white baseboard as in the photo), bath white 8x8 grout tile; all eight back/front sprites exist, side walls per room already existed.
  - Criterion 2 (tileable plaster, few palette colors, no seams, readable at 1x, baseboard/shadow/top slice kept): pass. Only palette keys 1,4,5,6,8,9,7 used; top slice, wood baseboard, shadow band and ink line are intact. Seams: the bump field has no pixel run broken at col 15/col 0 (checked by reading rows; the 6 at col 15 in row 11 meets a 5 at col 0). Rendered main room at hour 12 and 23 (1280x900 headless) and the plaster reads as stipple, not noise, behind the furniture and under the lamp glow.
  - Criterion 3 (corners and doorways join): pass. `wallKind` rules untouched; rendered all three rooms day and night: doorway, window and corner tiles sit cleanly against the new walls, bath tile grout lines align (period 8 both ways), nothing floating. The kitchen front door still draws the main `doorway` sprite as before (pre-existing, not part of this issue).
  - Criterion 4 (sprites, tests, build): pass.
  - Scope: only art sprites, generated PNGs, `wall-tiles.ts` and its test, two docs and this issue file changed; no other issues or PLAN.md touched. No reference photo content copied; no personal details.
  - Judgement calls (not failures, for Marc): (1) The plaster is sparse specks on a mist base, so on screen it looks a bit like terrazzo or granite and is cooler and darker than the photo's pale warm off-white; the photo is a dense, even pebbly texture. Acceptable under the "few palette colors, not noisy" criterion, but Marc may want it lighter or denser. (2) The 16 px horizontal repeat is faintly visible on the long back wall in the screenshot (regular dot rhythm), as the author said; no hard seam. (3) Kitchen drywall uses cool mist rather than the photo's warm greige (no warm grey in the palette). (4) Bath uses 8x8 squares per Marc's words though the photo shows larger subway tile. (5) The bath and kitchen front-wall bottom rows are clipped by the canvas edge at 1280x900; this is the camera framing, not the tile. Not checked: other window sizes in a real interactive browser.
