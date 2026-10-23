---
id: 027
title: State hardening
status: todo
owner: claude
depends_on: [021]
---

## Goal
Fix the smaller findings from the review of issue 021 before the sound, achievement and clock-lighting features (and the real task list) lean on the state system.

## Acceptance criteria
- **Unknown variable names fail at load, not at run time.** A task's `requires`, `effects`, `pointsBonus` and a variant rule that names a variable that is not in `state-vars.ts` is reported when the level is built (with the task or object named), not when it is first read. A test over the real level data (and the placeholder room) enforces it, so the personal task list (024 and the content issue) can't ship a typo.
- **A variable with `min` equal to `max` and `wrap`** (which gives NaN) is rejected when the state is created.
- **`stateChanged` events arrive after all of a task's effects have applied.** Today a task with several effects emits one event per variable as each is applied, so a listener on the first sees later effects not yet applied (for example sleeping: energy is 100 while the bed is still made). Apply all effects, then emit the events, in a stable order, and test it.
- **The clock event is useful for lighting.** The clock `stateChanged` fires when the rounded value changes (about 25 events a day, an extra one at midnight). Decide, document and test what 009d (the day and night cycle) can rely on: either one event per whole in-game hour (floor, not round), or a separate way to read the exact time each frame, and say which.
- Docs: a short section in `docs/` (or the issue) describing how to add a state variable, a requirement, an effect, a variant, and what events they produce.

## Progress log
