---
id: 105
title: Dried flowers should not offer to be watered
status: review
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

- 2026-10-28 (claude): Took the planner's recommendation (b), no reason found against it. Plan: a task field `liveSlot` hides the plant tasks while the slot's item is not live; the slot's plant variables freeze while it is; the swap resets the plant only for live over live.
- 2026-10-28 (claude): Done. Decisions: "live" = the item's family has stages or droops (`Decor.isLive`), so the dried flowers and `plant-test-grown` (family `plant-test`, never grows or droops) are still items. Found a real problem on the way: the swap reset the slot's stage, growth and dryness for ANY new item, so putting the dried flowers in lost the snake plant's growth; now it resets only live over live (nothing live can be swapped to today besides the snake plant, so in practice never). Dryness: `ApartmentState.frozen` (set by Game from `Decor.frozenVars`) refuses rises of the slot's stage, growth and dry vars, so tick, nap and sleep (`addSkipped`) do not dry the plant while a still item stands in; sets and decreases still work. Existing test "swapping the plant starts the new one small" (it swapped in the test grown plant) became "a still item keeps the live plant's state and it freezes". Old saves: no save format change; the plant vars are saved as before. Achievements and the gift milestones count `water-plant` completions, which only the live plant can produce, so Green Thumb and the day gifts are unaffected (the dried flowers arrive after stage 3 is reached). Files: src/game/{interactable,tasks,decor,game,state}.ts, activities/swap-decor.ts, decor-swap.test.ts, docs/decor.md. Checks: tsc, npm test (117 files), npm run build pass; goldens unchanged. Not checked: how it feels in a browser.
