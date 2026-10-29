---
id: 109b
title: Inventory stage 2: the THINGS page (read-only)
status: todo
owner: claude
depends_on: [109a]
---

## Goal
Stage 109b: the THINGS page on the pause screen (button and `I`), read-only: grid of sprites, entry box with the sprite at 2x beside the name, line, source and where it is now. Keyboard, touch (093 tap targets), 224 and 320 views, hint lines.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: tap list equals drawn list, cursor wraps, paging, 224 and 320 renders, clock stays held, golden room frames unchanged. Render at 1x on both sizes and look. No count or total anywhere. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review; Marc plays it.

## Progress log

