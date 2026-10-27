---
id: 079
title: Opening the box with several gifts is illegible; show them one at a time
status: done
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

- 2026-10-27 (review, independent): verdict APPROVE.
  - Ran: `npx tsc --noEmit` clean, `npm test` 2339 pass (golden frames unchanged), `npm run build` ok. Checked out main's game.ts/activity.ts/collect-delivery.ts: 5 of 7 new tests fail, so the regression test does bite (restored afterwards).
  - Own scratch tests (throwaway, removed): E+Escape on one frame mid-dialog closes, all owned, no input lock left, no cooldown, box reopens with a later delivery (pass); owned list full (500) with a package waiting finishes at once, no dialog, not stuck (pass); waiting item already owned elsewhere finishes at once (pass); direction keys during the dialog do not move the player (pass); delivery queued/forced to arrive while the box dialog is open: dialog and busy state undisturbed, the new package waits, box reappears, parcel 1, openable afterwards, boxes stays 1 (pass); save mid-dialog and reload: everything owned, nothing waiting, parcel 0, no stale dialog (pass); ten arrivals from a sleep skip, also with another dialog open, give exactly one popup (pass).
  - Criteria: ten pages in order, all owned in any exit: pass. One item one press: pass. Several arrivals never overlap: pass (one line per frame). Activity framework end to end (busy, quiet end, no cooldown, parcel, boxes): pass. Regression test fails on old code, tsc/test/build pass, golden unchanged: pass. docs/decor.md deliveries section: pass. Scope: only the listed files, no PLAN.md edits.
  - Not verified: how the pages look and feel in a browser (dialog layout, per-letter voice, popup placement). Unverified, not passed.
  - Minor notes, not blocking: (1) E and Escape pressed on the very frame that opens the box start the task; Escape is ignored that frame and works from the next one (same as other tasks). (2) A package that arrives while the box dialog is open (only possible by a forced advance; the clock is paused in dialogs) shows its "ARRIVED" popup and draws the box during the dialog; harmless. (3) The "another dialog already open" fallback joins every name into one popup, which could be long with many items; practically unreachable. (4) YAWN/SIGH popups can still share a spot with each other or an arrival line; they were not in scope and were not changed.
  - PLAN.md table needs updating by the planner.
