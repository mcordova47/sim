---
id: 027
title: State hardening
status: review
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
- 2026-10-23: Started. Plan: `validateLevel` checks every variable name in a room (task requires/effects/pointsBonus, cutscene set steps, variant `when`, solid `blockedWhen`); reject `wrap` with `min == max` in the `ApartmentState` constructor; apply all effects (and a tick's clock and energy) before emitting `stateChanged`; clock events by floor; docs in `docs/state.md`; tests.
- 2026-10-23: Built, status `review`. `npm run build` passes; `npm test` 520 tests pass (was 506).
  - **Unknown names at load:** `validateLevel(level, knownVars?)` in `level.ts` (new `validateStateNames`), defaulting to `STATE_VARS`; `Game` passes its own state, so a game with custom variables checks against those, in the constructor and in `loadLevel`. The error names the room and the task, variant or solid. Tests in `level.test.ts` (each place) and `apartment-rules.test.ts` (all real rooms and the placeholder room validate; a typo in the real task list shape fails in `parseTileMap`).
  - **`wrap` with `min == max`:** the `ApartmentState` constructor throws.
  - **Event timing:** `applyEffects` writes all effects, then announces one event per changed variable, in effects order (net zero: none; the same variable twice: one). It also checks every name first, so an unknown name changes nothing. `tick` applies clock and energy, then announces both. Tests in `state.test.ts` and a sleep test in `apartment-rules.test.ts`.
  - **Clock for 009d (decision):** the event is per whole in-game hour (floor, not round): 24 a day, midnight once, value is the exact time at the crossing. For smooth lighting read `game.state.get("clock")` each frame. Time-driven energy events also use floor now, and the yawn compares raw values (matching the HUD and step slowdown). Tested for a full day.
  - **Docs:** `docs/state.md` (add a variable, requirement, effect, variant; load-time checks; events).
  - Files: `src/game/{state,level,game,events}.ts`, tests `src/game/{state,level,apartment-rules}.test.ts`, `docs/state.md`.
  - **Not checked:** nothing visual changed; the yawn now fires on the raw crossing (not seen in a browser).
