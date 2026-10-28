---
id: 107
title: The guitar: flipped so it reads as standing on a stand
status: review
owner: claude
depends_on: [100]
---

## Goal
Marc (2026-10-28): the guitar has been hard to draw as hanging on the wall, so maybe the guitar could just be **reflected across its x axis**, so it looks like it is **on a stand**. Today the 1x1 `guitar` (and `guitar-nylon`) are drawn diagonal: neck up and to the west to a headstock, body low and to the east. Marc clarified (2026-10-28) what he means: **a vertical flip, reflecting the image over a horizontal line**, so the neck points **southwest** (down and to the left, into the room) and the body sits to the north-east, as if the guitar is on a stand facing into the room. (Today the neck points northwest and the body is low and to the east.)

## What to do
- Draw the vertical flip (neck southwest, body north-east) at 8x next to the current one, look at it in the room (the guitar sits at the sofa's west end, `G` on the main map, with the `guitar` task and the `held-guitar-*` and `player-guitar` poses) and make it read as standing on a stand; the plain flip may need hand adjustment (a small stand foot or tripod under the body is allowed within the 16x16 tile, palette only; the headstock now points toward the player). Flip `guitar-nylon` too (the gift variant) and keep both consistent with the new style (issue 099: a strip along the top, light from the top-left, full ink outline): a flipped sprite reverses the light direction, so redo the shading to keep the light from the top-left. If a left-right mirror reads better, show it as a second candidate and say so.
- Check the player poses still match where the guitar is (the player plays facing the guitar), the swap list names, and the unused `guitar-tall` and `guitar-nylon-tall` (issue 101 deletes them; leave them).
- Do not change maps, tasks or code unless the pose needs it.

## Acceptance criteria
- The guitar and the nylon guitar read as standing on a stand with the neck pointing southwest; before and after images are viewed and described in the log; sizes and names unchanged; `npm run sprites` clean; goldens re-recorded deliberately with a note; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc looks at it.

## Progress log
- 2026-10-28 (claude): Flipped `guitar` and `guitar-nylon` over a horizontal line: body north-east (dark sound hole), neck running south-west to the headstock with mist tuners. Redid the shading for light from the top-left (lit top and left edges, dark bottom and right; the plain flip had put the dark side on top) and added a small dusk tripod (post and three splayed legs, ink outline) under the body, inside the 16x16 tile, palette only. Nylon: the same drawing in cream/tan/oak. Viewed before and after at 16x (old hanging guitar left, stand version right) and in the room mockup at the sofa's west end: the body sits over the floor with the tripod legs reading as a stand; headstock points into the room. A left-right mirror (neck south-east) was not drawn: Marc asked for neck south-west, and a mirror would put the neck toward the sofa. Names and sizes unchanged; `guitar-tall` and `guitar-nylon-tall` untouched. Files: art/src/guitar.sprite, art/src/guitar-nylon.sprite, public/sprites/guitar.png, guitar-nylon.png.
  - Poses: `player-guitar` (32x48) draws its own mirrored lap guitar and replaces the piece while playing (`replacesPiece`), so it does not use `guitar.sprite`; left as is. The held-guitar-* overlays are separate carried drawings; left as is. No map, task or code change.
  - Goldens: `UPDATE_GOLDEN=1 npm test` changed nothing; the golden frames do not hash the guitar's pixels, so `main-room-frames.json` is unchanged.
  - Checks: `npm run sprites` clean, `npm test` (2773 pass), `npx tsc --noEmit`, `npm run build` pass. Not checked: how it feels in a browser; Marc to look.
