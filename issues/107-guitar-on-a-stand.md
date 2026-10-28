---
id: 107
title: The guitar: flipped so it reads as standing on a stand
status: in-progress
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
- 2026-10-28 (claude, independent review): **Verdict: changes needed** (small). Branch `issue/107-guitar-stand`; diff vs main is only the two sprites, their two PNGs and this file.
  - Rendered before (main) and after at 8x and 16x, and the sofa's west end from `main-room-mockup.png`. Before: neck north-west, body low east, dark side on the bottom-right. After: oval body north-east with a dark sound hole, neck running south-west to a headstock with mist tuners, lit top and left edges, dark bottom and right, a dusk tripod (post and splayed legs) at the lower right. In the room at 4x it reads as a guitar leaning/standing with its neck into the room, beside the sofa arm; the legs are small but legible. Nylon is the same drawing in cream/tan/oak and matches.
  - Names and sizes: pass (16x16 both, same file names, PNGs 16x16). `guitar-tall` and `guitar-nylon-tall` (sprite and PNG): no diff. No stray files; only ignored generated mockups/contact sheet changed locally. Palette keys only, no text in the sprites. No reference-photos or personal details.
  - Checks: `npm run sprites` clean, `npx tsc --noEmit` clean, `npm test` 2773 pass, `npm run build` pass. Goldens unchanged, as the author said (not hashed over the guitar's pixels). Browser feel: can't verify (Marc to look).
  - Neck southwest, light from top-left: pass. Reads as standing on a stand: pass, with the note that the tripod is thin.
  - **Fails "full ink outline" (issue 099, art-style: 1 px ink around the outside of every object):** I checked every non-ink pixel against its four neighbours. In `guitar.sprite` and `guitar-nylon.sprite` (same rows) the neck heel under the body, row 10, cols 7-9 (`7`, `9`/`8`, `7`), has transparent pixels directly below with no ink row, so a light stub of body colour shows unoutlined under the body (visible in the 16x zoom). The tripod legs (`4` pixels, rows 9-15) are 1 px wide with ink only on their right side; the left side is open. The headstock tuners (`5`) are open on the outside, as the old sprite's were, so that is accepted.
  - Not a fail but note: `docs/art-style.md` (lines ~98 and ~115) still describes the guitar as hanging on a wall hanger and `player-guitar` as holding the "hanging" guitar; the doc was not updated (not in the issue's list). `player-guitar` still draws its own mirrored guitar, neck east, which replaces the piece while playing, so the stand guitar disappears during play; acceptable as scoped, but Marc may see the neck flip from south-west to east when playing starts.
  - To do:
    - [ ] Add an ink pixel row/cells under the neck heel (rows 10-11, cols 7-9) in both sprites so the body and neck are fully outlined.
    - [ ] Outline the tripod legs on their left side (or draw them as ink-only 1 px lines) in both sprites.
    - [ ] Re-run `npm run sprites` and re-view at 8x; optionally update the guitar rows in `docs/art-style.md`.
