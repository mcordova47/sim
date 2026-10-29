---
id: 113d
title: Photo reel 4: the reel and the sofa task
status: review
owner: claude
depends_on: [113c]
---

## Goal
Stage D: `ReelActivity` and the conditional sofa task "Scroll through photos" with one fixed caption line per session; absent when there are no pictures.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- With pictures the task plays; with none the game is exactly as before (golden frames unchanged); `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-29 (claude): started. Plan: derived state var `hasPhotos` (as `parcel` does) makes the sofa task conditional via `requires`; `ReelActivity` in `src/game/activities/reel.ts` modelled on make-track; the Game owns the reel store handle and the PHOTOS page shares it and tells the game when the list changes.
- 2026-10-29 (claude): built. Files: `src/game/activities/reel.ts` (+ test, registered in `activities/index.ts`), `src/game/reel-game.test.ts`, `src/game/config.ts` (`REEL`: pass 6, 4 s, scale 3, the caption pool), `tasks.ts` (`scroll-photos`, 5 points, pose sit-sofa), `apartment.ts` (sofa list, after doomscroll), `state-vars.ts` (`hasPhotos`), `game.ts` (reel handle, `photosChanged`, `syncPhotos`, host `reelPictures`), `activity.ts` (host field), `achievements/feature.ts` (shares the game's store, calls `photosChanged` after every list read, `hasPhotos` not saved or synced, the task excluded from the "every task" set), `achievements/photos-draw.ts` (`drawPic` takes a whole-number scale), `game-activities.test.ts` (type list), `docs/text-review.md`.
- Behaviour: up to 6 pictures, shuffled with the game's random source, no repeats; 4 s each; Right or E (tap on the panel) goes on; Escape or a tap outside leaves paying nothing; the last picture finishing pays 5 and changes no mood. One caption line chosen at the start, shown under the first picture only. Fixed phone-shaped panel (152 x 173) holds both orientations at 3x. With none stored the task is not offered (requires hasPhotos), `hasPhotos` is 0 and golden frames are unchanged (golden test untouched and passing).
- Checked: `npx tsc --noEmit`, `npm test` (all pass), `npm run build`, `npm run check:dist`. Rendered the reel at 1x on 320 x 192 and 224 x 208, landscape and portrait, synthetic scene through `pixelate` (a headless rasterizer script outside the repo), and looked at them: panel fits both views, caption wraps to two lines.
- Not checked: how it feels in a browser or on an iPhone (the 4 s pace, tap targets); the real IndexedDB path at game start (only memory stores in tests).
