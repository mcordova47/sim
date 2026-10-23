---
id: 003
title: Interaction and scoring system
status: done
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
- 2026-10-22: **Review (approve).** Reviewer: independent agent. Worktree `../life-worktrees/003-interaction-scoring`.
  - `npm run build` passes; `npm test` 14/14 pass. I also wrote an independent suite (kept outside the repo, not committed; 22 checks) against the real `Scoreboard`, `InteractionSystem`, `Player` and `PLACEHOLDER_SOLIDS`.
  - Criteria:
    - Interactables as data: **pass**. `Interactable` has id, zone, prompt, duration, points, optional cooldown.
    - Prompt in range, interact starts task and locks player: **pass** (logic). Zone detection, grounded requirement, interact ignored mid-task, task completing after the player was moved away or after a huge dt all behave. Using the real Player physics and a BFS over controls, I reached and triggered all three zones (fridge on the counter, dishes on the floor, nap on the loft bed via the shelf). Prompt rendering and feel in a browser: **can't verify** by me; Marc reports (user-reported, not verified by me) that gameplay feels good.
    - Diminishing returns: **pass**. Boundary exactly at 90s still decays, just past it does not; floor of 1 holds over 2000 repeats; no NaN/overflow.
    - Variety combo: **pass**. Exactly 25s keeps the chain, just past it resets; a-b-a restarts the chain at a; 1000-task chain caps at 3x.
    - Single data file, no engine edit to add a task: **pass**. Appending a data-only entry to the array worked with no engine change.
    - Three placeholder tasks: **pass**.
  - Beyond the criteria:
    - Scope: OK. Only issue 003 files, config, controls and main.ts touched; no other issues or PLAN.md edited.
    - vitest and `npm test`: reasonable scope. Small devDependency, first tests in the repo, and the scoring rules are being tuned. `package-lock.json` change is as expected (+1417 lines from vitest and its transitive deps; the single removed line is the vite devDependency line reformatted).
    - Conventions: tuning in `SCORING` and `DEFAULT_TASK_COOLDOWN` in config; fine.
    - Privacy and regressions: nothing found; movement code unchanged.
  - Minor observations (non-blocking, for the planner / 004):
    - `progress` is NaN if a task has `duration: 0` (0/0).
    - A task with 0 base points awards `minPoints` (1).
    - Overlapping zones: the first in the list wins, and if it is on cooldown the second cannot be started. Placeholder zones do not overlap; 005's data should avoid overlaps or this should be revisited.
    - Task duration effectively starts counting the frame after the press (one-frame lag), so no visible effect.
    - Pressing interact on the exact frame a task finishes is ignored (not buffered), and cooldown starts at finish. Fine.
  - Verdict: approve. Merge `issue/003-interaction-scoring`. The PLAN.md table needs updating (003 -> done).
