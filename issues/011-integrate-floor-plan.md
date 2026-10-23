---
id: 011
title: Integrate the floor plan and task data
status: todo
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
