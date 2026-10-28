---
id: 105
title: Dried flowers should not offer to be watered
status: todo
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-28): the dried flowers (`plant-dried`, which can go where the snake plant goes) still give the option to water them, which makes no sense. His two ways to fix it: (a) the dried flowers can only replace other dried flowers, not the live plant; or (b) the plant slot becomes a slot for different kinds of objects, not all of them live plants, and the plant tasks depend on what is in it.

## Planner's recommendation (decide and record in the log)
Take (b): the shelf slot holds any decor of kind `plant` (and later others: a jar, a stack of books, a small figure), and what the slot offers follows the item. A **live plant** (a family with stages, `FAMILIES` in `src/game/decor-data.ts`; the water and revive tasks, the growth and dryness state in `tasks.ts` and `state-vars.ts`) offers watering; an item with no stages (dried flowers, anything else) offers **no** watering or reviving task, and the plant-state tasks are hidden (not just disabled) while a non-live item is in the slot. The swap list still shows every owned item that fits the slot. Check what happens to the plant's growth and dryness while a dried item stands in: they must not advance, drain or be lost (the live plant's state is kept for when it comes back), and the 063 growth rules still hold. Check the same for the other plant-like gift (`plant-test-grown` is a test item to be removed in stage 4).

## Acceptance criteria
- With the dried flowers in the slot, no water or revive prompt appears (a test at the object); with the snake plant back, watering and growth continue from the saved state; saves from before this change load as before; no other task or achievement that counts waterings is affected (check `Green Thumb` and the day gifts).
- `npm test`, `npx tsc --noEmit`, `npm run build` pass; goldens unchanged (or re-recorded with a note); Marc looks at it.

## Progress log
