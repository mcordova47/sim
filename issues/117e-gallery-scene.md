---
id: 117e
title: Photo gallery 5: the sofa scene replaces the slideshow
status: review
owner: claude
depends_on: [117b]
---

## Goal
Stage E: the phone view (phone chrome, six random pictures, the fixed line) and the close-up (a pick of the six, the close-up caption, E leaves and pays the task's 5 points, Esc pays nothing) replace the 113d slideshow in one commit; no ad interruption yet. Caption candidates go to `docs/text-review.md` for Marc.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Task id, prompt, requirement and points unchanged; the slideshow code is removed in the same commit; a game with no photos behaves exactly as before; render both views at 1x and look; the checks above pass; an independent review.

## Progress log


- 2026-10-29 (claude): started. Plan: rewrite `activities/reel.ts` as the scene on top of `reel/gallery.ts` and `achievements/gallery-draw.ts`; REEL config becomes `pass`, `phoneLines`, `closeupLines`; slideshow code (auto-advance, `shuffledPass`, `reelLayout`, first-picture caption, `REEL.seconds/scale/captions`) removed.
- 2026-10-29 (claude): done, in review. Task id `scroll-photos`, prompt, `requires hasPhotos`, 5 points, pose all unchanged (tasks.ts untouched). Scene: phone view of six random pictures (one screen, no paging), highlight by arrows/WASD (no wrap, never on an empty cell), E or a tap on the highlighted cell or CONTINUE opens the close-up with a caption picked at open; E (or any tap) in the close-up completes and pays 5; Esc anywhere, LEAVE, or a tap outside the phone cancels quietly (no points, no cooldown). No ad interruption (117f). No pictures: ends quietly at start (and the task is not offered). Taps come from the same `gridLayout` as the drawing (093). Files: `src/game/activities/reel.ts`, `reel.test.ts` (rewritten), `src/game/reel-game.test.ts`, `src/game/config.ts`, `docs/text-review.md`. Checks: `npm run build`-equivalent `tsc --noEmit` clean, full vitest 3315 pass, golden room frame unchanged. Rendered both views at 1x with synthetic pictures (phone view and a landscape close-up, mixed portrait/landscape set) and looked: highlight visible, line centred, narrow buttons inside the panel, caption and E: DONE in the band. Not looked at: a portrait close-up of the scene on screen (layout covered by 117b's tests), the view flip, feel on a phone (117g).
