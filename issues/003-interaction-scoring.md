---
id: 003
title: Interaction and scoring system
status: review
owner: claude
depends_on: [002]
---

## Goal
Let the player walk up to objects, press a key and do a task that awards points.

## Acceptance criteria
- Interactable objects defined as data: id, position, prompt text, duration, base points, cooldown.
- A prompt appears when the player is in range; pressing the interact key starts the task and locks the player for its duration.
- Diminishing returns: repeating a task within a window reduces its points.
- Streak/combo hook: a score multiplier when different tasks are done in quick succession (rules can be simple, tuned later).
- Task definitions live in a single data file so adding a task needs no engine changes.
- Three placeholder tasks to prove it out (e.g. fridge, sink, bed).

## Progress log
- 2026-10-22: Done, ready for review. Branch `issue/003-interaction-scoring`, worktree `../life-worktrees/003-interaction-scoring`.
  - Added `src/game/interactable.ts` (the data type), `scoring.ts` (`Scoreboard`), `interaction.ts` (`InteractionSystem`), `placeholder-interactables.ts` (fridge, dishes, nap), a `SCORING` block and `DEFAULT_TASK_COOLDOWN` in `config.ts`, an interact key (E) and `NO_INPUT` in `controls.ts`, and rewired `main.ts` with a throwaway debug HUD (issue 004 replaces it).
  - Added `vitest` as a dev dependency with `npm test`, plus `scoring.test.ts` and `interaction.test.ts` (14 tests, all pass). This is the first test suite in the repo; it was not in the criteria but the scoring rules need regression coverage while they get tuned.
  - Criteria:
    - Interactables as data (id, position, prompt, duration, points, cooldown): `Interactable` type; `zone` is a pixel rect.
    - Prompt in range; interact key starts the task and locks the player: `InteractionSystem.update` finds the zone the player overlaps; `main.ts` feeds the player `NO_INPUT` while `busy`. Requires the player to be grounded. Covered by tests (range, grounded, lock/progress); the prompt rendering itself is not tested.
    - Diminishing returns: points halve per earlier completion of the same task within 90s, floor of 1 (`SCORING.repeatDecay`, `repeatWindow`, `minPoints`).
    - Variety combo: each different task within 25s of the last extends a chain; multiplier is 1 + 0.5 per link after the first, capped at 3x. Repeating a task in the chain restarts it, and the combo expires after 25s. All in `SCORING`.
    - Task definitions in a single data file: `placeholder-interactables.ts`; the engine reads only the `Interactable[]`.
    - Three placeholder tasks: fridge (on the counter), dishes (floor), nap (loft bed).
  - Checks: `npm run build` passes (tsc strict + vite build). `npm test`: 14 pass.
  - **Not checked in a browser:** that the three zones are comfortable to reach and trigger, and how the debug HUD reads. Marc needs to play it.
  - Cooldown is optional per task (defaults to 10s) because 005's draft `Task` type has no cooldown field and says repeats are scaled by the scoring system.
  - Notes for the planner:
    - 005's `Task` shape (`src/game/tasks.ts` on its branch) uses tile-based zones (`x`, `w`, `feetFrom`, `feetTo`) and a `piece` field. The engine wants pixel rects, so adopting 005's data needs a small converter from its `Task` to `Interactable`. Not done here since 005 isn't merged.
    - 005's room is 35 tiles wide, but the viewport is 20 tiles and the plan says one screen. That needs a decision (camera scroll, a smaller tile size, or a shorter room) before 007.
    - Game time only advances in `update`, so the cooldown and combo clocks pause when the tab is hidden. That seems right for this game.
