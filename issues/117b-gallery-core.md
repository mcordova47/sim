---
id: 117b
title: Photo gallery 2: the gallery core (not wired)
status: done
owner: claude
depends_on: [113c]
---

## Goal
Stage B: pure `gallery.ts` (state, paging, cells, `closeupScale`, thumbnail rule) and `gallery-draw.ts` (grid, close-up, phone chrome), with tests, not called by the game.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Layout tests at 320 x 192 and 224 x 208; the close-up scale is the largest whole number that fits (5x wide, 4x narrow, 3x for portrait in scene mode); only new files and tests; the checks above pass; an independent review.

## Progress log


- 2026-10-29 (claude): Started. Plan: pure `reel/gallery.ts`, `achievements/gallery-draw.ts`, tests with synthetic pictures, render both modes on both views at 1x and look at them. Nothing wired.
- 2026-10-29 (claude): Built. Files: `src/game/reel/gallery.ts` (state, paging, `move`, `open`, `others`, `withPics`, `tapCell`, `sceneGallery` six random, `manageGallery` newest first, `closeupScale`, `thumbWindow`, `gridLayout`, `closeupLayout`), `src/game/achievements/gallery-draw.ts` (`drawGrid`, `drawPhone`, `drawPhoneFoot`, `drawCloseup`; pictures only through `drawPic`), `src/game/reel/synthetic-pic.ts` and `src/game/achievements/soft-canvas.ts` (test and review helpers, never used by the game), `gallery.test.ts`, `gallery-draw.test.ts`. No existing file touched. Not called by the game.
  - Verified: close-up table of design 3.3 (manage 5x/4x/8x wide, 4x/3x/7x narrow; scene wide 5x landscape, 3x portrait; scene narrow 4x); layouts inside 320 x 192 and 224 x 208, no overlaps; paging, no wrap, short last page, no highlight on an empty cell; delete fallback; scene six random, no paging. Rendered both modes on both views at 1x (and enlarged) with synthetic pictures of all presets and portraits and looked at them. `npm test` (3220 pass) and `npm run build` pass.
  - Judgement calls (for 117c/117e to know): (1) a thumbnail too big for its cell even at 1x (Crisp portrait 48 x 64 in the narrow 64 x 48 cell) is cut to its middle; found by a test, design said whole at 1x only for Soft. (2) Scene close-up caption: band is 12 px for one line; a caption that wraps (narrow view) makes the band taller (9 per line + 5), costing a portrait one scale step (4x to 3x on narrow); on the wide view all candidate captions fit one line. (3) Manage close-up: a picture that fills the view height (portrait, Crisp, Chunky on the wide view) leaves no foot for the hint; it is stacked bottom-left when the margin is 72 px or more (portrait), else laid over the picture's foot (Crisp 64 x 48 at 4x and Chunky at 8x, margin 32). 117c may prefer to step those scales down or drop the hint there. (4) Highlight is a 2 px frame inside the cell, over the picture's edge. (5) Narrow scene has CONTINUE and LEAVE buttons in the phone; wide scene shows a key hint in the strip.
  - Not checked: how any of it feels or looks in a browser or on a phone (rendered with a software canvas, not a browser canvas); touch thumb feel; the text lines are placeholders from the design, not reviewed text.
- 2026-10-29 (claude, independent review): Verdict **approve**.
  - Layout tests at 320 x 192 and 224 x 208: pass. Own script (outside repo) laid out grid and close-up for 6 sizes (Crisp, Soft, Chunky and portrait twins) x 2 views x 2 modes: 6 cells, no overlaps, all inside the view and (scene) inside the phone screen; phone line, buttons and band clear of cells and picture.
  - Close-up scale: pass. Every scale equals `closeupScale` of its box and is the largest that fits. Manage wide 5x/4x(36x48)/4x(64x48)/8x, narrow 4x/4x/3x/7x; scene wide 5x landscape, 3x portrait (36x48), narrow 4x (one-line caption), all matching design 3.3.
  - Paging and state: pass. n = 0, 1, 5, 6, 7, 11, 12, 13, 18: newest first, right/left walk visits every picture and stops at both ends (no wrap), 500-step random walks never leave a filled cell, Down into a short last row goes to the last picture, `hasNextPage` correct, `open`/`tapCell`/`others` no-ops on empty or out of range, `withPics` (delete last on a page goes back a page, delete only picture, delete middle keeps the cell).
  - Scene picks with a degenerate `random()`: pass for 0, 0.9999999999999999, 1 and 0.5 with n = 0, 1, 2, 5, 6, 7, 20 (six or fewer, unique, from the pool, cursor in range). Minor, outside the `[0, 1)` contract: a negative or NaN `random()` gives a bad cursor or an undefined pick; `Math.random()` never does this, so not a failure.
  - Thumbnail rule: pass. 36 x 48 on the wide view is the 2x middle slice, narrow is whole at 1x; whole thumbnails always fit the cell. Drawing clipped to cells: pass (sentinel canvas, every size in every cell on both views, zero pixels changed outside the cells).
  - Rendered both modes on both views (grids pages 1 and 2 with empty cells, close-ups of every size) and looked at them: layout, highlight, phone chrome, empty cells and hint all read as designed.
  - `npm test` 3220 pass, `npm run build` pass. Diff vs main: only new files (gallery.ts, gallery-draw.ts, soft-canvas.ts, synthetic-pic.ts, two tests) plus this issue file; nothing outside the tests references them, so nothing is wired. No reference-photos use.
  - Notes for 117c/117e (not blockers): in the narrow scene close-up a 192 px tall portrait sits at y 2, so the 3 px phone bezel covers its top pixel row; the wide manage Crisp 64 x 48 and Chunky close-ups lay the hint over the picture's foot (author's judgement call 3); the narrow Chunky portrait (24 x 32) thumbnail is a 2x middle slice, a reasonable extension of the slice rule.
  - Unverified: how it looks or feels in a real browser or on a phone, touch thumb feel, the wording of the text lines.
