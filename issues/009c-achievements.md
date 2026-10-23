---
id: 009c
title: "Polish: achievements and saved progress"
status: todo
owner: agent
depends_on: []
---

## Goal
Give a game with no goal a pile of small, funny achievements, shown as toasts, and remember progress between visits.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- A single data file lists at least 15 achievements, each with an id, a funny name, a one-line description and a condition on tracked stats. They should be drawn from the real tasks (see `src/game/tasks.ts` and the flavor text), for example doing the same task three times (a "Doomscrolled three times" kind of name), doing every task in a room, a long variety chain, a big single award, repeating a task until it pays the minimum, jumping a lot, and finishing every task at least once.
- Stats are tracked from the game events (per-task counts, total points, best chain, jumps, and so on) in a separate plain module with tests.
- Toasts appear in screen space as a HUD layer: one at a time or a short stack, sliding in and out over a few seconds, never overlapping the HUD or each other, and never off screen. They use the pixel font and palette colours only, and every achievement name and description sticks to the characters the font has. A test checks all of them against the font's glyphs.
- Unlocked achievements, the best score and the lifetime stats are saved to `localStorage` under a versioned key. Storage is injected so tests use a fake; reads and writes are wrapped so a blocked or full storage never breaks the game, and the game works with no storage at all.
- A way to see what is unlocked: a simple key (for example Tab) shows a list screen or panel, with locked ones shown as "???" until earned. Keep it small and readable.
- A way to reset progress (a key combination that is hard to hit by accident, or a documented function), with a test.
- An achievement can only unlock once, even after reloads. Tests cover unlocking, not double-unlocking, saving, loading, and a corrupt saved value being ignored.
- Thresholds and toast timing live in the data file or `config.ts`.

## Notes
- Score persistence is optional in the original polish issue; here it means the best score and the unlocks. The running score still starts at 0 each visit.
- Marc will read these names, so make them good. They can be a little silly.

## Note: persistence now includes the apartment state
The apartment state system (issue 021, merged) holds dishes, the bed, energy and the clock as values in `ApartmentState`. Per the persistence decision in `PLAN.md`, saving progress between sessions must include those values (and restore them on load, validating them against `state-vars.ts` so a stale or corrupt saved value is ignored), as well as the score, achievements and settings. Keep the storage wrapped in try/catch, as decided.

## Current state of the game (2026-10-23, replaces the old "blocked" note)
The game is top-down now (issues 019 to 047). What this changes for this issue:
- Events: `step` and `bump` replace `jump` and `land`; also `taskStart`, `taskComplete`, `taskCancelled`, `taskBlocked`, `stateChanged` (with id, value, previous), `room`, dialog open and close. Drop jump stats; per-task counts, total points, best chain, steps taken, rooms visited and cancelled tasks are fair stats. Look at `src/game/events.ts` and `features.ts` for how to attach.
- State variables to save and restore, validated against `state-vars.ts`: dishes, bedMade, energy, clock, blinds, mug, recordSort, mood (and any added later). A save from before a variable existed must load with that variable at its default and never throw; unknown saved ids are ignored. The player's room, tile and facing are saved too (default to the start if the saved tile is blocked or the room is unknown).
- Achievement names and descriptions: plain and a little wry, not gag machines. Marc finds some text too jokey (issue 037 text pass); he will review the list. Use only characters the font draws (`unsupportedChars`).
- The list screen opens with a key that is not Tab, Escape, E, X or arrow keys (039 may use Tab to cycle tasks); pick one (for example L) and say which.
- Escape cancels actions (046); do not use it for the list screen while an action runs.
- Saving must not happen mid-task in a way that loses effects: save on `taskComplete` and every N seconds, and on `visibilitychange`.

## Progress log
