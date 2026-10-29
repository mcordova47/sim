---
id: 109a
title: Inventory stage 1: entry data
status: todo
owner: claude
depends_on: [109]
---

## Goal
Stage 109a of `docs/inventory-design.md` section 4: `from` and `note` (deadpan, short) on the real items, and `Decor.entries()` with order, where-now and change-at. Pure data and functions, no drawing.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: order follows owned order; where text for placed and inventory items; test items never listed; pantry and plants included. No save change. Lines added to `docs/text-review.md` for Marc to mark. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

