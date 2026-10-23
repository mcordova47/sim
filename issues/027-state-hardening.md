---
id: 027
title: State hardening
status: done
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
- 2026-10-23: **Review (independent): changes needed.** Own edge-case checks in a scratch dir outside the repo; `npm run build` passes, `npm test` 520 pass.
  - **Unknown names at load: pass for the real data, with one defect.** Real rooms and the placeholder room validate; typos in `requires` (including inside `anyOf`), `effects`, `pointsBonus`, cutscene `set`, variant `when` and `blockedWhen` are all reported with room and task named; `Game` ctor and `loadLevel` check against the game's own state (a custom state with `mood` accepts it, rejects `energy`; default state rejects `mood`). **Defect:** `parseTileMap` calls `validateLevel(level)` with the default `STATE_VARS` and has no way to pass the game's variables, so a room built with `parseTileMap` that uses a custom variable (checked: `effects: [{var:"mood"}]`) now throws `level: task "t" effects uses the unknown state variable "mood"` before any `Game` exists. That worked before this issue, and the log's "a game with custom variables checks against those" only holds for hand-built `Level` objects. No test covers it.
  - **`min == max` with `wrap`: pass.** Rejected in the constructor; `min == max` without wrap still accepted. (Not new: `initial: NaN` is accepted, since the range check uses `<`/`>`; minor, optional.)
  - **Events after all effects: pass.** Sleep-like list with a repeated variable and a net-zero variable gave one event per changed variable, in first-appearance order, each seeing all effects applied; net zero gave none; an unknown name late in the list throws with nothing applied. An effect applied from inside a listener nests cleanly. Tick announces clock then energy after both are written.
  - **Clock event: pass.** Full day at 2 min/s from 0: events at hours 1..23, plus one at the midnight crossing (23.99999 to 0.03, one event), so 24 a day; independent of dt (1/60, 0.5, 7 s). A single tick or a task effect (sleep's `clock add 7`, or a 1000 s tick) crossing several hours gives one event with the net previous and value, not one per hour. `docs/state.md` should say listeners must not assume consecutive hours (minor, optional).
  - **Docs: pass.** `docs/state.md` covers variable, requirement, effect, variant, load checks, events and the lighting decision.
  - **Beyond criteria:** scope is clean (9 files, no PLAN.md, no other issues). Pre-existing, not from this issue: `Game.update` calls `state.get("energy")` so a game whose custom state has no `energy` throws on the first update. The yawn compares raw values but only runs on floor-change events; fine while `ENERGY.lowBelow` (25) is a whole number, would miss a crossing if it were fractional.
  - **Unverified (needs a browser):** how the yawn and the status panel look and behave.
  - **Checklist for the author:**
    - [ ] Let `parseTileMap` take the known variables (for example a `MapOptions` field passed to `validateLevel`, defaulting to `STATE_VARS`), or defer the name check for such rooms to `Game`; add a test with a custom variable room built by `parseTileMap` and played in a `Game` with a custom state.
    - [ ] Optional: note in `docs/state.md` that one clock event can span several hours; reject a `NaN` `initial`/range.
- 2026-10-23: Review round 1 asked for changes (custom-variable rooms built by `parseTileMap` were rejected). Fixed: `MapOptions.knownVars` passed to `validateLevel` (default the real list); test builds a custom-variable room and plays it in a `Game` with custom state. Also noted in `docs/state.md` that a multi-hour change gives one clock event. Status `review`. Not done: NaN `initial` rejection (pre-existing, optional).
- 2026-10-23: **Review round 2 (independent): approve.** `npm run build` passes; `npm test` 521 pass (32 files). Own edge-case test in a scratch dir outside the repo, 3 checks passing.
  - **Round 1 checklist resolved.** `parseTileMap` now takes `MapOptions.knownVars` and passes it to `validateLevel` (default the real list). Own check: a room built with `knownVars` for a custom variable `mood` accepted it in task `requires`, `effects`, `pointsBonus`, a variant `when` and a solid `blockedWhen`; a typo (`moood`) still throws and names the room; the real variable `energy` is rejected when `knownVars` says only `mood` exists; a `Game` whose state lacks `mood` rejects that room. The author's new test builds a custom room and plays it in a `Game` with custom state, and checks the default still throws. Docs note on multi-hour clock events added. NaN `initial` stays unfixed (optional, pre-existing).
  - **Unknown names at load: pass.** Real rooms and the placeholder room are validated by `apartment-rules.test.ts`; error names room and task/object.
  - **`min == max` with `wrap`: pass** (constructor throws; round 1 checked, code unchanged).
  - **Events after all effects: pass** (code unchanged since round 1 check; tests in `state.test.ts` and the sleep test).
  - **Clock event: pass.** Per whole hour (floor), 24 a day, documented in `docs/state.md` with the per-frame `game.state.get("clock")` alternative; multi-hour change gives one event, now documented.
  - **Docs: pass.** `docs/state.md`.
  - **Beyond criteria:** the round 2 diff (d5cd93f) touches only `tilemap.ts`, `apartment-rules.test.ts`, `docs/state.md` and this file. No PLAN.md or other issues touched. No reference-photo content.
  - **Unverified (needs a browser):** yawn behavior and status panel visuals.
  - Minor, optional: yawn compares raw values only on floor-change events, which would miss a crossing if `ENERGY.lowBelow` were fractional (it is 25).
