---
id: 012
title: Interaction edge cases
status: done
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

- 2026-10-22: Review (independent). Verdict: approve.
  - `npm test` 35 pass, `npm run build` ok. Diff touches only config.ts, interaction.ts, interactable.ts, interaction.test.ts and this issue file; no PLAN.md or other-issue edits.
  - Own edge-case suite (11 tests, kept outside the repo, all pass): zero and negative duration finish instantly with finite progress and normal cooldown; two overlapping zero-duration tasks start only the first per press; a buffered press expires (press out of reach then entering after 0.2s does not start; entering inside the window does); airborne press starts on landing only within the window; one press never starts two tasks (start consumes the buffer); press mid-task starts the next task as the previous finishes; a press mid-task does not leak past the window when the only task is on cooldown; partial-overlap zones: `nearby` and the started task agree before and after cooldown. `Game.update` locks the player with `NO_INPUT` when `busy`, and a zero-duration task never sets `busy`, so no lock flicker.
  - Criteria: zero duration pass; interact buffer in `config.ts` pass (logic verified by tests, feel in a browser unverified); first off-cooldown task and matching prompt pass; 0 base points pass (documented, `minPoints` applies, tested; tasks data has none); unit test per fix pass.
  - Unverified: how the 0.15s buffer feels in a browser.
  - Notes, non-blocking: a press made while out of reach or airborne also counts if the player enters/lands within 0.15s (author documented it); `nearby` stays set while busy (pre-existing); when every in-reach task is cooling down the prompt still shows the first one (intentional fallback).
