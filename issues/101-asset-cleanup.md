---
id: 101
title: Asset cleanup: plant pots, the side-project picture, unused sprites
status: review
owner: claude
depends_on: [100]
---

## Goal
Marc's decisions (2026-10-28, `docs/asset-review.md`): (1) the **plants on the bookshelf**: pots seen from above and an outline pass (`plant-0..3`, `plant-wilted`, `plant-dried`; low priority, keep every sprite name and size); (2) **`view-side-project`**: replace the small picture of the game with readable HUD words and an older room layout by plain shapes (no readable text, in the game's palette); (3) **delete the unused sprites**: window, floor-tile, rug, painting-robin, icon-phone, icon-plug, guitar-tall, guitar-nylon-tall (re-verify each is unused by grep first, including tests, docs and `sprite-names.ts`; fix every reference); keep view-bookshelf, gallery-wall, guitar-nylon and mic-stand-vintage as reserved and say so in `docs/art-style.md`. Toilet and vanity are left alone.

## Acceptance criteria
- The plants, the picture and the deletions are done; `npm run sprites` leaves the PNGs matching the sources and removes the deleted PNGs; no dangling references (a test lists sprite names against files); goldens re-recorded deliberately with a note; `npm test`, `npx tsc --noEmit`, `npm run build` pass. Marc looks at the plants and the picture; unverified items listed.

## Progress log
- 2026-10-28 (claude): started. Plan: delete the 8 unused sprites (fix scripts/room-mockup.mjs and docs refs), redraw plant-0..3/wilted/dried pots from above with an outline pass, redraw view-side-project as plain shapes, add a files-vs-sources test, re-record goldens if the room changes.
- 2026-10-28 (claude): done, ready for review. Deleted window, floor-tile, rug, painting-robin, icon-phone, icon-plug, guitar-tall, guitar-nylon-tall (sources and PNGs); grep over src, scripts, docs, tests found no code use (only `scripts/room-mockup.mjs` used floor-tile and rug: switched to floor-bath and plain floor-wood; doc mentions in art-style, decor, hud-design, tasks and two code comments updated). Plants plant-0..3, -wilted, -dried redrawn from above (round rim, soil, leaves radiating, ink outline; same names and 16x16; dried is the wooden vase from above), viewed at 8x on oak. view-side-project redrawn: monitor showing an older room (desk, table, rug, sofa, bed, tiny figure) with the HUD words as plain bars, no text; viewed at 4x. docs/art-style.md has a new "Deleted and reserved sprites" section (view-bookshelf, gallery-wall, guitar-nylon, mic-stand-vintage reserved). New tests in src/render/sprite-names.test.ts: PNGs and sources match one to one, deleted names absent, reserved present. `npm run brand` re-run because social.png is made from the plant sprites (public/social.png changed). Golden frame test passed unchanged (it does not hash sprite pixels), so no re-record was needed. npm test, tsc, build pass. Not checked: how the plants and picture feel in a browser at game scale; Marc's eyes needed on the plants and the picture.
