---
id: 012
title: Interaction edge cases
status: review
owner: claude
depends_on: []
---

## Goal
Fix the minor findings from the review of issue 003. None are visible today; they would bite once real task data or the polished HUD arrives.

## Acceptance criteria
- A task with `duration: 0` completes immediately and never produces a NaN progress value.
- Pressing interact in the few frames before a task finishes (or just after it ends) isn't lost: buffer the press briefly, like jump buffering. Buffer length lives in `config.ts`.
- When zones overlap, the player starts the first task that is not on cooldown, not just the first in the list. The prompt shown matches the task that will start.
- A task with 0 base points is a deliberate decision: either validate it away in the data check or document that `minPoints` applies.
- Each fix has a unit test.

## Progress log

- 2026-10-22: Started. Plan: guard zero duration, add a buffered interact press (`INTERACT_BUFFER_TIME` in config), pick the first off-cooldown task in reach for both `nearby` and the start, and document that `minPoints` applies to 0-point tasks (the tasks data has none; no validator exists to extend).
- 2026-10-22: Done, ready for review.
  - `duration: 0` completes the frame it starts; `progress` returns 1 for a running zero-duration task, never NaN.
  - Interact press is remembered for `INTERACT_BUFFER_TIME` (0.15s) in `interaction.ts`, including presses made during a task, which can start the next task the frame the previous one finishes. Side effect: a press just before walking into a zone or landing also counts.
  - `nearby` is the first in-reach task off cooldown, else the first in reach, so the prompt matches what starts.
  - 0 base points: decision is "`minPoints` applies", documented on `Interactable.points`; tested.
  - Files: `src/game/config.ts`, `interaction.ts`, `interactable.ts`, `interaction.test.ts`.
  - Checked: `npm test` (35 pass, 6 new), `npm run build`. Not checked: how the buffer feels in a browser.
