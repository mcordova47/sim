---
id: 005
title: Floor plan and task list
status: review
owner: marc + agent
depends_on: []
---

## Goal
Turn Marc's real apartment into a level layout and a list of tasks.

## Blocked on
Marc to provide photos of the apartment (each wall and corner), rough room dimensions and a few furniture measurements (couch, bed, counter, desk).

## Photo handling
Photos are placed in `reference-photos/` (gitignored). Read them by path. Do not copy, embed or commit them, and do not write anything into the repo that identifies the address or personal belongings beyond furniture type, size and color. Output text descriptions only. Marc deletes the photos when this issue is done.

## Acceptance criteria
- Inventory of every furniture piece and fixture with approximate size and position, from photos plus measurements.
- A proposed side-on layout: which pieces are platforms, which are interactable, which are decoration. Needs Marc's review.
- Reachability check: every interactable can be reached by jumping from the floor given the physics constants in issue 002.
- Task list: for each interactable, the task name, prompt text, duration, base points and one-line joke or flavor text.
- Output as data (`src/game/room.ts` and `src/game/tasks.ts`) plus a short `docs/floor-plan.md` explaining choices.

## Progress log
- 2026-10-22: Unblocked. Marc supplied 16 photos and measurements (main room 17x8 ft, kitchen 11x8, bath 7x4, queen bed, table 4'4"x2'6", sofa 5'8"x3', desk 4'x2'6", ~10 ft ceilings). Jump/physics constants from 002 are not available yet, so reachability is checked against a parameterised placeholder and must be re-run when 002 lands. Plan: 1 tile = 1 ft, write `src/game/room.ts`, `src/game/tasks.ts`, `src/game/reach.ts` and `docs/floor-plan.md`. Working in a worktree because the main checkout has uncommitted work from 001.
- 2026-10-22: Ready for review. Files: `src/game/room.ts` (17 pieces, decor, derived `SOLIDS`, spawn), `src/game/tasks.ts` (21 tasks), `src/game/reach.ts` (reachability check), `docs/floor-plan.md`. Type-checked with `tsc --strict`; reachability run via esbuild bundle. All pieces and tasks reachable with placeholder limits (rise 3, gap 2, player 3 tall); with rise 2 the bed, bookshelf and guitar fail.
  - NOT verified: reachability against issue 002's real constants (002 not done). Re-run `check()` once it lands.
  - NOT verified: Marc's review of the layout. Needs sign-off on the squeezed main room, the lack of open floor and the reordered kitchen.
  - Follow-ups for the planner: the level is 35x12 tiles but 001's view is 20x12, so the view or tile size must change. Geometry types in `room.ts` (`Rect`, `Solid`) are local; 002 may want to own them. `npm run build` not run: 001's files are uncommitted in the main checkout, so this branch has no `package.json`.
- 2026-10-22: Review (independent). Verdict: CHANGES NEEDED (not done yet; two criteria cannot be closed).
  - Inventory: PASS. 17 pieces plus 7 decor with size, position and colour; spot-checked against photos (table with microwave and coffee gear, bed, bookshelf), consistent. No overlapping pieces.
  - Proposed layout (platform / interactable / decor): PASS on content, but "needs Marc's review" has not happened. CAN'T VERIFY sign-off.
  - Reachability: CAN'T VERIFY against 002's constants. I re-ran `check()` via esbuild: placeholder rise 3 / gap 2 / height 3 gives no unreachable pieces or tasks; rise 2 makes bed, bookshelf and 5 tasks (make-bed, open-blinds, water-plant, sort-records, guitar) unreachable. The check logic reads correct.
  - Task list: PASS. 21 unique tasks, every interactable has at least one, each has name, prompt, duration, points, flavor; all piece ids resolve.
  - Data output and docs: PASS. room.ts, tasks.ts, reach.ts, docs/floor-plan.md present; `tsc --strict --noEmit` clean. `npm run build` not runnable on this branch (disclosed).
  - Scope: PASS. Only 005's files and its issue file changed; PLAN.md and other issues untouched.
  - Privacy: PASS. No photos in repo, no address. Minor: the plant, records, guitar, mic stand and journal tasks name belongings beyond furniture; Marc may want to confirm he is fine with that.
  - Checklist to finish:
    - [ ] Marc reviews and signs off the layout (squeezed main room, no open floor, reordered kitchen, assumed dimensions)
    - [ ] Re-run `check()` with issue 002's real jump constants once 002 is done; adjust heights if it fails
    - [ ] Planner: reconcile 35x12 level with 001's 20x12 view
- 2026-10-22: Re-checked against 002's real constants (`PLAYER` in `src/game/config.ts` on main: jumpHeight 40 px = 2.5 tiles, player 10x14 px, TILE 16). First run failed: bookshelf (3 ft step from the 2 ft desk) and the wall-guitar task zone. Fixes: desk 2 -> 3 ft (standing desk), guitar zone and decor lowered to start at 3 ft. Re-run with rise 2.5 and gaps of 2 and 3: all pieces and tasks reachable, nothing hits the ceiling. `tsc --strict` clean. Updated `docs/floor-plan.md`. Files touched: `src/game/room.ts`, `src/game/tasks.ts`, `docs/floor-plan.md`, this file.
  - Open for planner: player is 14 px tall, about 10 in at 1 tile = 1 ft, so scale needs a decision. The level is 35x12 tiles (560x192 px) vs the 320x192 `VIEW`. `room.ts` still uses its own `Rect` and `Solid` types in tiles, not 002's pixel `Solid`; the integration will need a tile-to-pixel conversion.
  - Marc said "lgtm" in chat on the layout; not yet recorded as a review sign-off.
