---
id: 032
title: Activity follow-ups from the 022 review
status: review
owner: claude
depends_on: []
---

## Goal
Close the small gaps the two reviews of 022 left open.

## Acceptance criteria
- `Game.render` guards `activity.draw`: a throwing `draw` cancels the task like a throwing `update` does (a test fails on old code), and the loop keeps running.
- A cutscene `set` step with an unknown state variable is rejected at level load, naming the task. Apply a cutscene's `set` steps so a later failure cannot leave earlier ones half applied, or document that they stay applied (decide and say which).
- Notes `count` and typing `lines` reject non-numbers such as `"3"` at load, not just by coercion.
- `docs/activities.md` says that a scripted walk which ends on or crosses a door tile enters the door and later steps run in the new room. Decide whether the walk should stop at doors instead; if it stays, a test pins it.
- Interface gaps from review round 1, only if a real content need appears (list the ones the content issue hits and do those): a cutscene step that runs another activity and returns its result (open mic), task effects or points that depend on the result, a `cue` that waits for an animation or sound, reading state from an activity (difficulty from energy), world-space drawing, and a hook when the room changes mid-activity.
- `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: Started. Plan: guard `draw`, validate `set` vars and strict numbers at load, pin the door walk, docs.
- 2026-10-23: Done, in review.
  - `Game.render` now calls the activity's `draw` in a try/catch; a throw goes through the new `InteractionSystem.abandonActive` (same path as a throwing `update`: logged, cancelled, no points/effects/cooldown). Test fails on old code.
  - Cutscene `set` vars are checked at load against the game's own state (new optional `ValidationContext` passed through `validateLevel` and `validateActivity`; `Game` passes `{ hasState }`). Decision: `set` steps stay applied if a scene is skipped or later steps fail; they are not rolled back. Because an unknown variable is rejected at load, a `set` cannot fail partway, so there is nothing to half-apply. Documented.
  - Notes `count` and typing `lines` now reject any non-number (`"3"`, `true`, `null`, `[3]`) instead of coercing.
  - Door walk: decision is it stays (walk enters doors, later steps run in the new room). Documented in `docs/activities.md` and pinned by two tests (ending on a door; crossing one).
  - Interface gaps (open mic result, result-dependent effects, waiting cue, reading state, world drawing, room-change hook): no content issue hits any yet, so none done.
  - Files: activity.ts, activities/{cutscene,notes,typing}.ts, game.ts, interaction.ts, level.ts, activity-guards.test.ts, docs/activities.md.
  - Checks: `npm test` 513 pass; `npm run build` ok; `tsc --noEmit` clean. With the old game.ts, the new draw and state-var tests fail. Not checked: anything in a real browser (a real canvas throw).
