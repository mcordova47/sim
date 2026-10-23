---
id: 012
title: Interaction edge cases
status: todo
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
