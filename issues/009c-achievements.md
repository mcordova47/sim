---
id: 009c
title: "Polish: achievements and saved progress"
status: done
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

### 2026-10-23, agent: plan
Build in `src/game/achievements/`: stats from events, data-driven unlock conditions, a progress store with injected storage, a toast queue and layer, a list screen (key L) and a reset (Shift+R then Y with the list open, or `feature.reset()`). One line in `features.ts`.

### 2026-10-23, agent: done, ready for review
What changed: new module `src/game/achievements/` (data.ts 26 achievements, stats.ts, unlock.ts, progress.ts, toasts.ts, draw.ts, feature.ts, plus tests and fake-storage.ts), `ACHIEVEMENTS_UI` block in `config.ts`, and `attachAchievements(game)` in `features.ts`. `game.ts` is untouched.

Decisions:
- Stats are lifetime and saved: per-task counts, total points, best chain, best single award, best score (the running score still starts at 0 each visit), steps, bumps, cancelled tasks, rooms visited, minimum-payout repeats, seconds played.
- Conditions are data: `{stat, atLeast}`, `{task, atLeast}`, `{tasks: [...]}`, `{everyTask}`. Thresholds live in `data.ts`; toast timing, save interval, storage key and list key live in `config.ts`.
- Saved under `life.progress.v1` as `{version, unlocked, stats, world}`. `world` holds every variable in `STATE_VARS` by id, plus room, tile and facing. Load is tolerant per field: unknown variable ids are ignored, missing ones keep their start value (so a new `outfit` variable from 045 just works), values are clamped by `applyEffects`, a bad room, out-of-range, blocked or doorway tile leaves the player at the start, a corrupt or other-version save is ignored whole. Every storage call is in try/catch and no storage is fine.
- Saves on `taskComplete` (after the effects apply), on each unlock, every 10 s, and on `visibilitychange` when hidden. A task running at the moment of a reload is lost (its effects were never applied), by design.
- List screen: key L (not Tab, Escape, E, X or arrows), arrows move a cursor, L or Escape closes, locked ones show "???". It will not open while a task runs (a mash-the-keys task would open it by accident) or while a dialog is open, and it takes the input lock while open.
- Reset: with the list open press Shift+R then Y. Anything else cancels. It clears unlocks, stats and the saved game and puts the apartment variables back to their start values.
- Toasts: a stack of at most 2 down the right side below the status panel, 4 s each, drifting 24 px and fading in and out, always on screen and clear of the HUD and status boxes (tested at every frame of a run). Settings from the persistence decision: there are no settings in the game yet, so none are saved.
- Needs the real window for keys: `attachAchievements` listens on `window` and `document` (injected in tests) because layers get no controls.

Verification: `npm test` 956 pass (about 100 new), `npm run build` ok. Looked at screenshots from headless Chrome of the toasts and the list screen (seeded save), and a restored position and apartment state.
Not checked: how it feels over a long play session in a real browser; the exact wording of the achievements is for Marc to review. A restored low energy shows a YAWN popup at load (game.ts behaviour, left alone).


### 2026-10-23, reviewer: review (approve)
Checked in the worktree on branch issue/009c-achievements. `npm test` 956 pass, `npm run build` ok, `npx tsc --noEmit` clean. I also wrote 23 independent edge-case tests (kept outside the repo, all pass) covering save/load tolerance, double unlock, storage failure, toast layout, drawing, and the list/reset key flow.

Per criterion:
- 15+ achievements, data-driven, from real tasks: pass. 26 in data.ts; every task id they name exists in the apartment rooms; ids unique. Conditions are data.
- Stats from events in a separate module with tests: pass (stats.ts; steps, bumps, cancels, rooms, per-task counts, points, chain, award, best score, min-payout repeats, seconds).
- Toasts: pass. Every description wraps to at most 2 lines at the toast width, so the fixed 2-slot stack never overlaps. Stepped 26 queued toasts at 10 ms for 120 s: at most 2 shown, never overlapping each other, never off screen, never touching HUD_BOX or STATUS_BOX, alpha within 0..1. Bottom of the stack is y=126, above the dialog box. Only palette colours drawn (checked every fillStyle). Names and descriptions pass `unsupportedChars`; widths fit the toast, list column and footer. Huge dt and empty text are fine.
- Saved under a versioned key, injected storage, failures wrapped: pass. Tried getItem, setItem and removeItem all throwing; quota error on setItem; null storage; getItem returning undefined, a number or an object; none break play. Unlocks still happen when saving fails.
- Save/load tolerance: pass. Malformed saves (empty string, null, array, truncated JSON, other version, wrong types, huge or negative numbers, `__proto__` and `constructor` keys, unknown variable ids, fractional or out-of-range tile) never throw and start sane. Round trip reproduces the identical saved text, and a reload shows no toasts. A saved unlock whose stats are gone is kept and does not re-toast. A periodic save mid-run is valid, and the completion save has the post-effect variable values.
- List screen, "???" for locked: pass. Key L; all draw paths (none, all unlocked, cursor ends, reset message) run; hint and message widths fit; empty list does not crash.
- Reset: pass. Needs Shift+R then Y with the list open. A lone Y, plain R then Y, Shift+R then arrow then Y, and held-key repeats do not reset. Every state variable returns to its initial value, the stored key is removed, stats restart, and the score is 0.
- Unlock once, tests for unlock/double/save/load/corrupt: pass (existing tests plus mine).
- Thresholds and timing in data or config: pass (data.ts, ACHIEVEMENTS_UI).
- Current-state requirements: pass. Uses step/bump/taskCancelled/room events; L is not a reserved key; the list will not open while a task runs, a dialog is open, or input is locked; repeated open/close leaks no input lock; Escape closes the list only when it is open and is ignored otherwise, so it does not interfere with action cancel; saves on taskComplete (after effects), on each unlock, every 10 s and on visibilitychange (hidden only); variables validated through the game state, unknown ids ignored, missing ones keep defaults.

Scope: changed only the new achievements module, an ACHIEVEMENTS_UI block in config.ts, one line plus import in features.ts, and its own issue file. game.ts, PLAN.md and other issues are untouched. No reference-photos content or personal details.

Not verified (author did not either, and I could not): how it feels over a long play session in a real browser, and the wording quality of the achievement names (for Marc). I did not run a real browser, so the actual pixel look of the toasts and list is unchecked by me.

Minor observations, none blocking:
- The list is not a pause: the game clock and energy keep advancing while it is open (I saw the clock move and energy drop over 60 s). A dialog can also be opened under the list by code, and the list would hide it; nothing in the game does this today.
- `parseWorld` drops the whole world (including the apartment variables) if the saved facing, room or tile is missing or not a valid type. A merely invalid room or tile is handled correctly (variables kept, player at start). Only a damaged position field loses the variables, which is a harmless edge.
- Reset puts variables back but leaves the player where they stand.

Verdict: approve. PLAN.md table needs updating by the planner.
