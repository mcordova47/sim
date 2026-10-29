---
id: 117c
title: Photo gallery 3: manage mode with delete one
status: review
owner: claude
depends_on: [117b]
---

## Goal
Stage C: the PHOTOS page shows the grid (newest first, paged), opens a close-up with E or a tap, deletes one picture from the close-up (DELETE then SURE? DELETE, any other key cancels, no delete in the grid), keeps ADD and REMOVE ALL; both views; touch.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Existing PHOTOS tests stay green; tests drive keys and taps; the sofa task is untouched; render both views at 1x and look; the checks above pass; an independent review.

## Progress log

- 2026-10-29 (claude): Started. Plan: PHOTOS page gets a gallery (grid 3 x 2 newest first, paged, close-up with E or tap, delete one in the close-up only with a two-step ask, ADD, REMOVE ALL, BACK kept); layout in photos-draw.ts from reel/gallery.ts, state in feature.ts; the old intro layout stays for an empty reel.
- 2026-10-29 (claude): Built. Files: `src/game/achievements/photos-draw.ts` (layout: grid and close-up from `reel/gallery.ts`; the empty reel keeps the old intro layout), `feature.ts` (gallery state, keys, taps, delete), `src/game/reel/gallery.ts` (added `turnPage`), `photos-manage.test.ts` (new, 31 tests, synthetic pictures), `photos-page.test.ts` (two edits, below), `docs/text-review.md` (new lines for Marc).
  - Behaviour: grid 3 x 2 newest first, paged; arrows move, PageUp/PageDown turn the page, E/Enter or a tap on the highlighted cell opens; close-up: Left/Right other pictures, Delete or Backspace asks, a second Delete/Backspace or Y deletes that one, any other key or Esc cancels; E/Esc leave. No delete key in the grid. ADD, REMOVE ALL (R, R/Y), BACK unchanged. Touch: cells, OPEN, page buttons `<` `>` in the title row, close-up `<` DELETE BACK `>`, tap on the picture goes back, SURE? DELETE then any other tap cancels. After a delete the list is read again (`photosChanged`, so `hasPhotos` follows at once, 0 after the last), the highlight stays on the same cell number (next older picture) or the last one.
  - Judgement calls: (1) close-up reserves a foot (10 px keyboard hint line, 18 px touch button row), so a picture as tall as the view drops a scale step (wide Soft portrait 3x not 4x; wide Soft landscape stays 5x, narrow 4x); no hint is laid over a picture. (2) A message replaces the status line; on the wide keyboard view the REMOVE ALL question makes the key line wrap to a second line and the second message row is not used. (3) Another tap cancels the DELETE question without doing its own action (REMOVE ALL's other buttons do both). (4) Highlight stays the 2 px frame; a Crisp portrait thumbnail in the narrow cell is cut to its middle (117b rule, unchanged). (5) Page number sits in the title row.
  - Changed existing tests on purpose: `photos-page.test.ts` layout bound `VIEW.height - 11` became `VIEW.height` (the grid page uses the foot of the view; the old hint line is gone), and the tap-list equality compares the buttons (first in the list) and leaves the grid cells after them. Everything else in it is untouched and green.
  - Verified: `npm test` 3342 pass, `npm run build` and `npm run check:dist` pass. Rendered grid, message/armed state, close-ups of Soft, Crisp, Chunky and a portrait, on wide keyboard, wide touch and narrow touch at 1x and 3x with synthetic pictures and looked at them. Sofa task untouched.
  - Not checked: a real browser or phone (touch feel, thumb size, scaling), the wording (placeholders in `docs/text-review.md`).
