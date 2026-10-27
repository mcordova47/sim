---
id: 079
title: Opening the box with several gifts is illegible; show them one at a time
status: todo
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
