---
id: 044
title: Place the new art on the map (robin, mic stand, stool, gallery wall, hanging guitar)
status: done
owner: claude
depends_on: [034, 047]
---

## Goal
Issue 034 drew pieces the floor plan has no slot for. Put them on the map, with Marc picking the spots where it is a taste call.

## Acceptance criteria
- Propose a slot for each, from the 034 log and `docs/floor-plan.md`, and ask Marc to confirm before editing the maps: `painting-robin` (north wall, col 5), `mic-stand` (col 5, row 1), and `gallery-wall` (the south wall face behind the sofa, cols 1-6 of main row 7, replacing six `wall-front` tiles; check the wall classification in `wall-tiles.ts` still holds).
- **Guitar** hangs on the west wall and is now a 16x16 sprite (047): one `G` tile. Proposal from 047: keep `G` at col 1 row 5 and make col 1 row 6 floor (or put `G` at row 6 if it should sit by the sofa's near end); confirm with Marc. Free the floor tile it used to block, move the interact spot and the wall tile, and keep the `guitar` task usable (`player-guitar` pose stays for issue 045).
- **Radiator** (from 047): shrink it to 1x3: the `r` column in `MAIN_MAP` covers rows 1 to 3 only (row 4 becomes `.`), resize `radiator.sprite` to 16x48, update `docs/floor-plan.md`. Until then the fourth tile is an invisible block on the east wall by the bed.
- Every task is still reachable and usable (the apartment tests and a BFS), every sprite named exists, the `wall-tiles` tests are updated.
- `docs/floor-plan.md` updated (pieces, sizes and the wall classification pictures).
- `npm test` and `npm run build` pass. Marc looks at the main room.

## Progress log
- 2026-10-23: Started, from Marc's answers below. Plan: robin print and mic stand into `MAIN_MAP`, guitar to one tile, radiator to 1x3 (sprite 16x48), update tests and `docs/floor-plan.md`, render and look.
- 2026-10-23: Done, ready for review. Map coordinates below are `MAIN_MAP` columns and rows (wall included), which is what Marc's answers use.
  - **Map:** `k` (robin print, `painting-robin`, a wall piece, added to `WALL_PIECES.main`) at col 5 row 0, replacing a `#`; `M` (mic stand, `mic-stand`) at col 5 rows 1 and 2, because the sprite is 16x32 (1x2): it fills the gap column between the table and the desk, leaving row 3 open to walk through (judgement: Marc said "col 5, row 1"; one tile would have squashed the sprite). Guitar `G` now only col 1 row 5; col 1 row 6 is `.`. Radiator `r` rows 1 to 3; col 17 row 4 is `.`. Stool and gallery wall not placed.
  - **Sprite:** `art/src/radiator.sprite` trimmed to 16x48 (the cut rows were all transparent), PNG regenerated with `npm run sprites`.
  - **Wall classification:** the 19x10 picture is unchanged (furniture is open; `k` sits in the back wall with an open tile south of it). `wall-tiles.test.ts` has a new test that pins `k`, the sides beside the guitar and the radiator, and that the new furniture is not a wall tile.
  - **Tests added** in `apartment.test.ts`: piece names, sprites and tiles; the freed radiator and guitar tiles are open; col 5 row 3 is still open; the guitar can be faced from col 1 row 4 and that spot is reachable.
  - **Checks:** `npm test` (1018 pass, the apartment reachability and task-spot tests included), `npm run build`, and my own flood fill over `MAIN_MAP` (walk on `. @ 1 2`): every furniture piece with a task has a reachable neighbour; the only unreachable floor tiles are col 8 row 7 (already sealed by the lamp table and record stand before this issue) and col 1 row 6 (new, see below). Rendered the main room headless at 1x (320x192), 4x (1280x768) and `?hour=23` and looked at them: robin print sits between the barn print and the desk print; the mic stand (tripod, pole, mic) is in the gap under it and reads; the radiator is three tiles; the guitar hangs on the west wall with one wood tile below it.
  - **Flag for Marc:** the freed guitar tile (col 1 row 6) is walled in by the wall, the sofa and the guitar, so it is a visible but unreachable bit of floor. If that looks odd, put `G` at row 6 and `.` at row 5 instead (then the tile is reachable and the guitar is used from row 5 facing down).
  - **Not checked:** how it feels in the browser at Marc's window size. `docs/art-style.md` still says `mic-stand` and `painting-robin` are "not placed" (out of scope here, left for the planner).
- 2026-10-23: **Review (independent): approve.**
  - **Proposal and Marc's confirmation:** pass. Marc's answers (bottom of this file) confirm robin col 5, mic stand col 5 row 1, guitar col 1 row 5, radiator 1x3; stool left out and gallery wall dropped by Marc, so those criteria no longer apply. The mic stand covers rows 1 and 2 because the sprite is 16x32 (reasonable; matches the 1x2 footprint).
  - **Guitar:** pass. One `G` at col 1 row 5, col 1 row 6 is `.`; `guitar` task zone is the one tile (16,80); usable from (1,4) facing down, reachable. `player-guitar` pose untouched.
  - **Radiator:** pass. `r` is rows 1-3 of col 17, (17,4) open and not blocked; `radiator.png` is 16x48 (checked), `art/src/radiator.sprite` trimmed, `docs/floor-plan.md` updated.
  - **Every task reachable, sprites exist:** pass. My own BFS across all three rooms through the doors (own script, not the repo tests): every doorway and every task has a reachable standing neighbour; the only unreachable open tiles are (1,6) (new, the freed guitar tile, walled in by wall, sofa and guitar) and (8,7) (already sealed before this issue). Sprite sizes versus footprints for every piece in all three rooms: no mismatch or missing sprite; robin 16x16 on 1 tile, mic stand 16x32 on 2, radiator 16x48 on 3, guitar 16x16 on 1. `wallKind` gives `back` for the `k` tile and for its `#` neighbours, `left` for west wall tiles beside the guitar, `right` for east wall beside the radiator; no wall tile became null or changed kind.
  - **Wall-tiles tests updated:** pass (new test pins `k`, the sides, and that furniture is not a wall tile; the 19x10 picture test still holds unchanged).
  - **docs/floor-plan.md:** pass (pieces, sizes, wall piece list; coordinates are inside the walls, consistent with the existing convention, and I checked each against the map). The wall classification picture is unchanged, which is correct.
  - **npm test / npm run build:** pass (1018 tests, build clean).
  - **Render:** pass. Headless Chrome at 320x192 and 1280x768, `?hour=14` and `?hour=23`, and compared against main: robin print sits between the barn print and the desk print, the mic stand is in the gap under it, radiator is three tiles with the lower window visible past it, guitar hangs on the west wall with one floor tile under it, nothing else drawn differently. The 4th radiator tile was empty art, so main looks the same there.
  - **Scope:** only `apartment.ts`, its two tests, `floor-plan.md`, the radiator sprite and PNG and this file; no PLAN.md or other issue edits, nothing from `reference-photos/`.
  - **Unverified:** how it feels in a real browser at Marc's window size; whether the guitar, mic stand and robin print read well to Marc (taste); whether Marc is happy with the visible-but-unreachable floor tile at col 1 row 6 (author flagged it; alternative is `G` at row 6 and `.` at row 5).
  - **Non-blocking nits for the planner:** `docs/art-style.md` still says mic-stand, painting-robin are "not placed" and that radiator is proposed 1x3 (lines 102, 118, 120); `docs/floor-plan.md` still has the stool and gallery wall noted as not on the map (fine). PLAN.md table needs updating by the planner.

## Marc's answers (2026-10-23)
- `painting-robin`: north wall, main room col 5 (default). `mic-stand`: col 5 row 1, between the table and the desk, directly below the robin print.
- **Leave out the stool for now.** It could be something that only comes out for guitar playing or recording (a prop that appears with the task, drawn in the pose or placed temporarily); not placed on the map in this issue.
- **Guitar:** one `G` tile at col 1 row 5, col 1 row 6 becomes floor (default). The side walls are now thick (054) so the guitar sits against the wall.
- **Radiator:** shrink to 1x3, rows 1 to 3, row 4 becomes floor, sprite resized to 16x48 (default).
- **Gallery wall:** not on the map (viewed in the admire-art view, issue 040); drop it from this issue.
