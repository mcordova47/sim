---
id: 033
title: Floor plan fixes found while drawing the art
status: todo
owner: claude
depends_on: []
---

## Goal
Small map and level-data changes the art batches (028 to 030) showed are needed, so the sprites fit.

## Acceptance criteria
- **Fridge** (Marc's decision, 2026-10-23): it belongs in the southeast corner of the kitchen, against the south wall, facing north. In `KITCHEN_MAP`, move `FF` from rows 6-7 down to rows 7-8 and put the floor tiles in the freed row, keeping the leg of the L walkable. Re-run the spot and reachability tests; every task is still reachable and the fridge tasks are still usable from a walkable tile.
- Sprite names in `src/game/apartment.ts` match the art: `u` (painting over the nightstand) uses `painting-wide`; `w` (the upper east window with no blinds) uses `window`; `W` stays `window-blinds`. Check every sprite named in level data exists (the open criterion of 025); add the test.
- Decide what the map's `#` filler, corners and the south wall draw (the mockup shows heavy grey bands from `wall-front`): one tile name per wall kind and where each applies, written into `docs/floor-plan.md`. Issue 031 does the drawing.
- `docs/art-style.md`'s reuse table no longer lists `shower-curtain` (removed in 029).
- `npm test` and `npm run build` pass.

## Progress log
