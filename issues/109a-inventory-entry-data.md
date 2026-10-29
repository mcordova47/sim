---
id: 109a
title: Inventory stage 1: entry data
status: review
owner: claude
depends_on: [109]
---

## Goal
Stage 109a of `docs/inventory-design.md` section 4: `from` and `note` (deadpan, short) on the real items, and `Decor.entries()` with order, where-now and change-at. Pure data and functions, no drawing.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: order follows owned order; where text for placed and inventory items; test items never listed; pantry and plants included. No save change. Lines added to `docs/text-review.md` for Marc to mark. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-28 (claude): started. Plan: `from`/`note` on the real items, `Decor.entries()`, tests, lines to docs/text-review.md.
- 2026-10-28 (claude): done, in review. Added `DecorItem.from`, `NOTE_MAX`/`FROM_MAX` and validation of both (font and length) in `decor-data.ts`/`decor.ts`; `note` and `from` for all 19 real items (starting items `ALREADY HERE`, gifts `A PACKAGE`; test items have none and are never listed). `Decor.entries()` returns `{item, from (full "FROM: ..." line), where, changeAt?}` in owned order (starting items first, kept through save/load), skipping test items and unknown ids; `changeAt` is the full `CHANGE IT AT THE DINING TABLE` line (several objects joined with OR for an item in the inventory; none for the pantry). No save change, no count in the result. Tests in `src/game/decor-entries.test.ts` (order, save round trip, test and unknown ids hidden, where for placed/inventory/swapped, pantry, plants, from fallback, no save change, line length/font/no counts). Lines added to `docs/text-review.md` for Marc; `docs/decor.md` "Not built" note updated. `npm test`, `npx tsc --noEmit`, `npm run build` pass. Not checked: nothing is drawn yet (109b).
