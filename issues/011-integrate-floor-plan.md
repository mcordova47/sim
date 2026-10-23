---
id: 011
title: Integrate the floor plan and task data
status: review
owner: claude
depends_on: [005, 003]
---

## Goal
Replace the placeholder room and tasks with the real data from issue 005 and make the engine run on it.

## Acceptance criteria
- A converter turns 005's tile-based data (`room.ts` pieces, `tasks.ts` tasks with tile `zone`s) into the engine's pixel `Solid[]` and `Interactable[]`. Conversion lives in one place and is unit tested.
- The game starts in the real room with the player spawned in a clear spot (physics assumes the spawn doesn't overlap a solid).
- No two interactable zones overlap, or overlap is resolved on purpose. The interaction system currently takes the first zone in the list, and if that one is on cooldown a second overlapping task can't be started. Either validate that zones don't overlap (a test over the real data) or change the system to pick the first available task.
- Every interactable is reachable with the real jump height. The effective apex is about 37px, not the configured 40. Use 005's reachability check (`reach.ts`) or a simulation with the real `Player`, and add it as a test.
- Tasks have no cooldown in 005's data, so they use `DEFAULT_TASK_COOLDOWN` unless 005 adds one. Check the defaults feel reasonable against durations.
- Placeholder files (`placeholder-room.ts`, `placeholder-interactables.ts`) are removed, or kept only if tests still use them.

## Decision: scale
Keep 1 tile = 1 ft with the player at 14px tall (about 10 in) and the 2.5-tile jump, as decided with Marc. 005's reachability check was re-run against these constants, so no rescale is needed. Revisit only if the sprites feel too small.

## Progress log
- 2026-10-22: Done, ready for review. Branch `issue/011-integrate-floor-plan`, worktree `../life-worktrees/011-integrate-floor-plan`.
  - Added `src/game/apartment.ts` (all tile-to-pixel conversion: furniture solids, floor, ceiling and end walls, spawn, task zones; exports `APARTMENT_LEVEL`) and `src/game/apartment.test.ts` (11 tests). `Level` gained `size` (room size in pixels, for the camera in 010). `main.ts` now runs `APARTMENT_LEVEL`. `placeholder-room.ts` and `placeholder-interactables.ts` are deleted (nothing used them).
  - Criteria:
    - Converter in one place, unit tested: `apartment.ts`; tests check piece positions and sizes, one-way slabs, and that a player standing on the counter overlaps the dishes zone while one on the floor does not.
    - Starts in the real room, spawn clear: spawn is on the sofa seat; a test checks the body overlaps no solid, and another that the game settles the player on the sofa.
    - No overlapping zones: a test over the real data found one clash (`make-bed` contained `open-blinds`). Fixed in `tasks.ts`: make-bed is the left two tiles of the bed, open-blinds the right two.
    - Every task startable: a second test checks each zone is overlapped by a body standing on some surface, because the interaction system only starts tasks for a grounded player. It found that `guitar` could not be started (its zone was 3 to 6 tiles up the wall and nothing stands there). Fixed in `tasks.ts`: guitar is now done from the sofa seat, next to doomscroll (doomscroll is the left tile, guitar the right).
    - Reachable with the real jump: the test measures the limits from the real `Player` (a rise of 2.25 tiles, a gap of 2 tiles, rounded down to quarter tiles) and runs 005's `check()` with them. Every piece and task is reachable and nothing hits the ceiling. These limits are tighter than the 2.5 and 3 that 005 assumed.
    - Cooldowns: 005's tasks have none, so they use `DEFAULT_TASK_COOLDOWN` (10 s). Tasks last 1 to 10 s, so the cooldown is at least as long as most of them. Not play-tested.
    - Placeholders removed: yes.
    - Font: a test checks every task name and prompt only uses characters the pixel font can draw (flavor text is not drawn yet; issue 014 extends this).
  - Data changes to 005's files (all in `tasks.ts`): the three zone edits above. `docs/floor-plan.md` updated to match (guitar, bed, measured limits, scale decision).
  - Checks: `npm run build` passes; `npm test` 41 pass (29 existing plus 12 new).
  - **Known interim state:** the room is 560 px wide but the view is 320 px and the camera is issue 010, so until 010 lands the player walks off the right of the screen past the middle of the kitchen. The spawn, main room and most of the kitchen's left side are visible.
  - **Not checked:** how it looks and plays in a browser; whether the task zones feel right to walk into; whether 10 s cooldowns feel right.
  - Notes for the planner: overlap resolution in the engine is still "first in the list" (issue 012). Doomscroll and guitar zones touch at the middle of the sofa, and a 10 px body standing there overlaps both, so it picks doomscroll. 012's "first available task" fix will make that nicer.
