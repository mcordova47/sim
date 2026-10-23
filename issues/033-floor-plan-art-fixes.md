---
id: 033
title: Floor plan fixes found while drawing the art
status: review
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

- 2026-10-23: Plan: move the fridge, fix the three sprite names, add a sprite-exists test, write the wall-tile rules into `docs/floor-plan.md`, drop `shower-curtain` from the art doc.
- 2026-10-23: Done, ready for review.
  - Fridge: `KITCHEN_MAP` rows 6-8 now floor, `FF` on rows 7-8 (cols 10-11), south wall right below; the bath door (col 7, row 7) still opens onto floor. Comments and `docs/floor-plan.md` updated. New test checks the fridge tiles, the wall below, the floor above, and that `fridge-stare` and `humidifier` have a reachable spot. The existing reachability test still passes for every task.
  - Sprites: `u` -> `painting-wide`, `w` -> `window`, `W` stays `window-blinds`. New tests: every sprite named by a piece or an appearance variant has a file in `public/sprites` (uses `import.meta.glob`, no node types needed); and the three names above. Checked the tests fail when a name is wrong (temporarily broke `painting-wide`).
  - Wall decision (in `docs/floor-plan.md`, "Wall tiles"): by open orthogonal neighbour, first match wins: south open -> `wall-back`; east open -> `wall-side-left`; west open -> `wall-side-right`; north open -> `wall-front`; no open neighbour (corners, bath block, step-down filler) -> not drawn, ink background shows. Side walls/floors/doorways use the room's own `-kitchen`/`-bath` tiles. This replaces the mockup's "everything else is wall-front" which caused the grey bands.
  - `docs/art-style.md`: removed the `shower-curtain` row and adjusted the redraw count (8 -> 7).
  - Verified: `npm test` (510 pass) and `npm run build` pass. Not viewed in a browser (no drawing change in this issue).
  - For 031/planner: `scripts/main-room-mockup.mjs` and `room-mockup-kitchen-bath.mjs` still use the old wall logic and a fridge position read from the map; not touched (out of scope).
- 2026-10-23: Review (independent). Verdict: **changes needed** (one criterion fails on substance; the rest pass).
  - Fridge: pass. `KITCHEN_MAP` rows 6-8: row 6 `########....#`, rows 7-8 `FF` at cols 10-11, south wall row 9 below. Bath door `3` (col 7, row 7) arrives at (8,7), still floor. Own BFS over the raw maps (parsed from source, not the game's Grid): every task in all three rooms has a reachable walkable adjacent tile; kitchen `fridge-stare` and `humidifier` have 4 spots each. The only unreached floor tile is main (8,7), a pre-existing sealed pocket (main map untouched).
  - Sprite names: pass. `u` -> `painting-wide`, `w` -> `window`, `W` -> `window-blinds`; all three files exist. Mutation checks: breaking each of the three names made both new tests fail (2 failed each time); changes reverted. Exists-test covers pieces and appearance variants.
  - Wall-tile rules: **fail** (see list below). I ran the rule (south open -> back; east open -> left; west open -> right; north open -> front; else none) over every `#` in the three maps. Each `#` gets exactly one tile, but several are not sensible and the doc is silent on decorations.
  - Art doc: pass. `shower-curtain` row removed, no other mention in src/docs/scripts. Redraw rows other than the player row: bed, boxes, desk, mic-stand, table, toilet, tub = 7, so "7 redraw" is correct.
  - `npm test` 510 pass, `npm run build` pass.
  - Scope: pass. Only art-style.md, floor-plan.md, apartment.ts, apartment.test.ts and this file; PLAN.md and other issues untouched.
  - Changes needed:
    - [ ] The doc does not say which tile sits under the non-`#` wall pieces: east-wall windows `w`/`W` (main col 18 rows 3,4,6,7), west doors `1`/`2`, kitchen `c` curtain, kitchen doors/bath door, front door `f`, paintings. "A wall tile of the kind above" is undefined for them since the rules only classify `#`. State the tile (for example: treat decorations as `#` when classifying, or name it per piece).
    - [ ] First-match order gives side walls the wrong tile where the wall sits above or below a door/window, because "open" counts doors and decorations: main (0,2), main (18,2), main (18,5), kitchen (12,2), kitchen (7,6), bath (8,2) all come out `wall-back` though they are part of a side wall. Fix by counting doors/side-wall decorations as wall for classification, or by checking east/west before south for those, and state it.
    - [ ] Kitchen (3,5) and (7,5) (the bar's south wall either side of the hood) come out `wall-side-left`, contradicting the doc's own line that the bar's south wall under the sink, stove and hood is `wall-front`. The hood `h` counts as an open neighbour. Say how the hood row is classified.
    - [ ] Optional: add a test or a script that prints the classification so 031 does not reimplement it differently; the mockup scripts still use the old logic (author already noted).
- 2026-10-23: Review round 1 said changes needed (wall-tile rules). Fixed:
  - New `wallKind` / `wallTileName` in `src/game/wall-tiles.ts`; maps exported from `apartment.ts` with a `WALL_PIECES` list per room (windows, doors, paintings, front door, curtain, hood).
  - Wall pieces and doors never count as open, so wall tiles beside a door or window are side walls (main (0,2), (18,2), (18,5), kitchen (12,2), (7,6), bath (8,2) are now left/right, not back).
  - Rule order is now back (open south), front (open north), left (open east), right (open west), none. This makes kitchen (3,5) and (7,5), either side of the hood, front like the hood tile itself; the doc and rule agree.
  - Every wall-line character (pieces included) gets the tile of its position; documented in `docs/floor-plan.md` with the full result pictured.
  - `wall-tiles.test.ts` pins the result for every tile of all three maps, plus spot checks for the reviewed tiles. `npm test` (516) and `npm run build` pass.
