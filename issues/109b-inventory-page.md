---
id: 109b
title: Inventory stage 2: the THINGS page (read-only)
status: review
owner: claude
depends_on: [109a]
---

## Goal
Stage 109b: the THINGS page on the pause screen (button and `I`), read-only: grid of sprites, entry box with the sprite at 2x beside the name, line, source and where it is now. Keyboard, touch (093 tap targets), 224 and 320 views, hint lines.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: tap list equals drawn list, cursor wraps, paging, 224 and 320 renders, clock stays held, golden room frames unchanged. Render at 1x on both sizes and look. No count or total anywhere. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review; Marc plays it.

## Progress log


- 2026-10-28 (claude): started. Plan: `achievements/inventory-draw.ts` (grid, entry box, tap rects), page `things` in feature.ts (button, `I`, arrows/WASD, PAGE, BACK), pause buttons made 16 px tall to fit a seventh button, tests, render at 1x on both views and look.
- 2026-10-28 (claude): done, in review. New `achievements/inventory-draw.ts`: grid (5 columns on 320 wide, 4 on 224, cells 24 tall, 4 rows, the pantry cell shows its top 22 px), the entry box (sprite at 2x top right, name, deadpan line, FROM, where, CHANGE IT AT, wrapping under the sprite once past it), `thingsCells`/`thingsButtons` (the same rects are drawn and tapped), `moveThingsCursor`. `feature.ts`: page `things`, `I` on the list opens it, Esc or `I` back, `L` still closes the whole screen, arrows and WASD (the touch pad sends WASD) move the cursor; left/right wrap through the whole list and up/down wrap within a column, and the page follows the cursor so every entry is reachable by keys. Touch: cells select (a second tap does nothing), PAGE (only when more than one page, the page numbers only) and BACK in the title row. Pause list: a THINGS button, and `I: THINGS` hint on desktop. To fit the seventh button the touch buttons are 16 tall with a 2 gap (were 18 and 3); the achievements page control and rows moved down 9 and 9 px (pageTop 89, rowsTop 102), still six rows a column. `config.ts`: `ACHIEVEMENTS_UI.thingsKey`. `docs/decor.md` note updated. Read-only: no save, no decor change, no sound, no points. No count, total, NEW badge or progress anywhere (test checks every drawn text). Tests: `inventory-page.test.ts` (layout inside the picture at both views, every real entry fits its box and font, no counts, fresh game, cursor wrap, paging, I/Esc/L, clock held, nothing changes in the save, tap list equals drawn list, no overlap, tap again does nothing, PAGE and BACK, touch hint names no desktop key); `transfer-draw.test.ts` updated for the seventh button and new geometry. `npm test` (132 files, 2944 passed; golden room frames unchanged, not re-recorded), `npx tsc --noEmit`, `npm run build` pass. Rendered at 1x (and 3x to read) on 320x192 and 224x208, desktop and touch, fresh and everything owned, pantry, silkscreen (widest), two-page narrow, and the pause list on both: looked at them, all text inside the box, nothing overlapping. Note: in the real game the pause screen is always drawn at 320x192 (it asks for the full picture), so the 224 layout is for robustness and is only reachable in tests. Not checked: how it feels in a browser, a real phone's thumb, and the grid's look with the real canvas rather than my software render.
