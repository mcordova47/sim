---
id: 044
title: Place the new art on the map (robin, mic stand, stool, gallery wall, hanging guitar)
status: todo
owner: claude
depends_on: [034, 047]
---

## Goal
Issue 034 drew pieces the floor plan has no slot for. Put them on the map, with Marc picking the spots where it is a taste call.

## Acceptance criteria
- Propose a slot for each, from the 034 log and `docs/floor-plan.md`, and ask Marc to confirm before editing the maps: `painting-robin` (north wall, col 5), `mic-stand` (col 5, row 1), `stool` (by the bookshelf's foot), and `gallery-wall` (the south wall face behind the sofa, cols 1-6 of main row 7, replacing six `wall-front` tiles; check the wall classification in `wall-tiles.ts` still holds).
- **Guitar** hangs on the west wall and is now a 16x16 sprite (047): one `G` tile. Proposal from 047: keep `G` at col 1 row 5 and make col 1 row 6 floor (or put `G` at row 6 if it should sit by the sofa's near end); confirm with Marc. Free the floor tile it used to block, move the interact spot and the wall tile, and keep the `guitar` task usable (`player-guitar` pose stays for issue 045).
- **Radiator** (from 047): shrink it to 1x3: the `r` column in `MAIN_MAP` covers rows 1 to 3 only (row 4 becomes `.`), resize `radiator.sprite` to 16x48, update `docs/floor-plan.md`. Until then the fourth tile is an invisible block on the east wall by the bed.
- Every task is still reachable and usable (the apartment tests and a BFS), every sprite named exists, the `wall-tiles` tests are updated.
- `docs/floor-plan.md` updated (pieces, sizes and the wall classification pictures).
- `npm test` and `npm run build` pass. Marc looks at the main room.

## Progress log
