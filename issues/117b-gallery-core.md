---
id: 117b
title: Photo gallery 2: the gallery core (not wired)
status: review
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
