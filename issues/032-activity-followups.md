---
id: 032
title: Activity follow-ups from the 022 review
status: todo
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
