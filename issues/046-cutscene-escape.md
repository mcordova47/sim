---
id: 046
title: Escape during any action (and a cutscene's text)
status: review
owner: claude
depends_on: []
---

## Goal
From the 040 review: Escape is ignored while a `say` line is up, so in "admire the art" it only skips during the short pause. `docs/activities.md` (around line 89) wrongly says Escape closes a cutscene's dialog.

## Acceptance criteria
- **Marc's report (2026-10-23): "can't escape actions, I thought that was a thing."** First reproduce it: which actions can and cannot be escaped (every task type: wait, dialog, cutscene, typing, notes; with and without a `say` line up) and write the table into `docs/activities.md`. The expectation is that Escape cancels any running action (no points, no effects, no cooldown) at any time, including while text is up, and the screen shows a hint (for example `ESC TO STOP`) while an action runs. Notes tasks are currently uncancellable by design; decide with Marc whether that should change.
- Decide with a test and a note: Escape during a cutscene's `say` skips the rest of the scene (apply nothing, restore the view, release the lock) or does not, and make code and docs agree. Skipping is the expectation, as with the pause.
- Every exit path still releases the input lock, closes the dialog and clears any view; the 022 fuzz-style test still passes.
- `npm test` and `npm run build` pass.

## Progress log

### 2026-10-23 (claude)
Plan: reproduce Marc's report on the real `Game` for every task type, then make Escape cancel any running action at any time with a visible hint.

Reproduction (matrix in `src/game/escape.test.ts`, run against the unchanged code: 19 of 233 cases failed): ignored while running: wait, notes. Wait could not be escaped at all. Cutscene: Escape worked only on steps with no text; with a `say` up the dialog took the key and closed one line (the scene carried on); with an `ask` it closed the menu as an answer and carried on; and a skipped scene still paid points. Dialog tasks: Escape went back one menu level first. Only typing behaved. Table is in `docs/activities.md` ("Escape").

Changes:
- Wait, dialog and cutscene are now `cancellable`. Notes stays uncancellable on purpose (Marc: keep as is; open question in the report).
- `Game.update`: Escape while a dialog is up and the running action is cancellable cancels the action (`InteractionSystem.cancelActive`) and closes the dialog from any menu level (`DialogRunner.abort`). A dialog with no action keeps its own Escape.
- Cutscene cancel is a real cancel (`completed: false`): no points, effects or cooldown; view cleared, lock released, walk stopped. Earlier `set` steps stay applied (documented).
- `ESC TO STOP` hint drawn last (over pictures and dialogs) between the score and the clock, only while a cancellable action runs (`Hud.drawStopHint`).
- Updated the tests that pinned the old behaviour (cutscene skip paid). Added `escape.test.ts`: the matrix, nested menu, notes unchanged, standalone dialog unchanged, hint drawn, and every real task in every room with Escape at 7 moments.
- Docs: `docs/activities.md` (table, wrong dialog-owns-Escape text fixed), `docs/dialogs.md`, README.

Verified: `npm test` (882 passed), `npm run build` ok. Not checked: how it looks and feels in a browser (hint position and legibility over the gallery wall picture).
