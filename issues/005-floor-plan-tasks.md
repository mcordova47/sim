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
