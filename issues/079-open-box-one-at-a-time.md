---
id: 079
title: Opening the box with several gifts is illegible; show them one at a time
status: review
owner: claude
depends_on: [043]
---

## Goal
Marc (2026-10-27) played 043 stage A with `?days=` and opened a box holding many gifts: every "OPENED: X" popup appeared at once over the player and the text collided into an illegible pile (`Game.collectDeliveries` calls `say` once per item). A long save or a long sleep can bring up to ten at once, so this will happen in real play.

Fix: opening the box walks through the items one at a time, and the whole set can be seen again later.

## Design (planner's recommendation; Marc asked for cycling or a later view)
- Opening the box starts a dialog (the existing `DialogRunner`, `game.openDialog`) with one page per item: "OPENED: <NAME>" (deadpan, keep the wording style of the current line). E advances, the usual dialog Escape rules apply. One item behaves like today (one line), so the common case is not slower than now.
- Items are collected (added to `owned`) up front as today, so closing the dialog early or Escape loses nothing.
- Later view: the swap lists already show every owned item. Check that a newly arrived item is easy to find there and say in the log how; do not add a new screen unless the swap list cannot show it.
- Also check the other places that stack several popups at one spot at the same time (several arrivals after a sleep: "A PACKAGE HAS ARRIVED." once per arrival?). Make several arrivals at one moment show one line (or space them), without losing the arrival itself.

## Acceptance criteria
- With ten items waiting, opening the box shows ten pages in order, one name at a time, no overlapping popups; every item ends up owned whether the dialog is finished, skipped or aborted with Escape.
- One item waiting: same behaviour as today in effect (one line, one press), tests updated to the new shape.
- Several arrivals at once (a sleep skip, `?days=10`) never overlap text.
- Works while the activity framework owns the controls (collectDeliveries is called from an activity): the dialog opens without breaking the task's finish, the cooldown, or the box state (`parcel`, `boxes`). Test it end to end, not only the unit.
- A regression test that fails on the old code (ten popups at one point) and passes now. `npm test`, `npx tsc --noEmit`, `npm run build` pass; golden frames unchanged.
- Docs: `docs/decor.md` deliveries section updated.

## Progress log

- 2026-10-27 (claude): started. Plan: open the box as a dialog chain (one `say` per item), keep the activity alive while it shows so Escape works through the framework, coalesce arrival lines per frame.
- 2026-10-27 (claude): done, in review.
  - `Game.collectDeliveries(onClosed)` collects up front (owned, boxes, parcel as before), builds a chain of `say("OPENED: NAME")` and opens it; if a dialog is already open it falls back to one joined popup. `ActivityHost.collectDeliveries` takes `onClosed`; the `collect-delivery` activity is now `cancellable`, finishes quietly when the dialog closes or on Escape (no taskCancelled, no cooldown, no points). Arrival: `deliveries.onArrive` sets a flag and `update` says "A PACKAGE HAS ARRIVED." once per frame.
  - Files: src/game/game.ts, src/game/activity.ts, src/game/activities/collect-delivery.ts, src/game/open-box-one-at-a-time.test.ts (new), src/game/deliveries.test.ts and src/game/checkpoints-stage-a.test.ts (the box now shows a dialog that the tests close with E), docs/decor.md, this file.
  - Criteria: ten pages in order with no OPENED popups, all owned at once, Escape mid-way keeps all (tests); one item is one page/one press (test); ten arrivals via a sleep skip and two advances in one frame make one popup (tests); end-to-end through the real task at the door: busy while pages show, quiet end, no cooldown, parcel 0, boxes 1 (tests, plus existing boxes.test). Regression test checked to fail on the old code (5 of 7 fail with game/activity changes stashed). `npx tsc --noEmit`, `npm test` (2338 pass, golden frames unchanged) and `npm run build` pass.
  - Later view: the swap lists already show every owned item in table order; an inventory item is the one with no IN PLACE and no place line. No new screen. Noted in docs/decor.md.
  - Not checked: how the pages look and feel in a browser (dialog box layout, text-voice per letter). Pressing E on the last page with the single-press behaviour was tested only by simulation.
