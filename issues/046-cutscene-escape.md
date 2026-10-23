---
id: 046
title: Escape during any action (and a cutscene's text)
status: done
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

### 2026-10-23 (independent review)
Verdict: **approve**.

Checked by me: `npm test` 882 passed, `npm run build` ok. Diff touches only src, docs, README and this issue; no PLAN.md or other issues, no reference-photos. Wrote my own edge tests (kept outside the repo, 67 cases plus a coverage probe) against the real `Game`:
- Escape at every 3rd frame offset (0 to 200) into wait, dialog task (nested menu), cutscene with `say`, with `ask`, walking then `say`, and `view` then `say`, each with `DIALOG.pauseClock` true and false: always ends not busy, dialog closed, lock released, score 0, `dishes` unchanged, events exactly `taskStart, taskCancelled`, and nothing resumes after 200 more frames. Held Escape for 5 frames: harmless.
- Escape and E in the same frame while a scene runs: cancels, does not restart (one `taskStart`). Escape and E in the same frame that opens the task: the task starts, that Escape is lost (nothing was running yet), the next Escape cancels. Acceptable.
- Escape on each frame around the end of a 3 s wait: exactly one of complete (100 points) or cancelled, never both. Short wait-then-`say` cutscene with Escape at 150 frame offsets: always a clean cancel.
- Cutscene walk across a door tile, Escape at 40 offsets (43 of 80 landed in the new room): cancels cleanly in either room, no points, the later `set` step is not applied.
Criteria: reproduction and table in `docs/activities.md` pass; Escape cancels any running action except notes (as agreed), no points, effects or cooldown, pass; the cutscene `say` decision (cancel, code and docs agree, stale "dialog owns Escape" text fixed) pass; every exit path releases lock, dialog and view, and the 022 fuzz-style test and the 7-moment real-task test pass; test and build pass.
Unverified: how `ESC TO STOP` looks and feels in a browser. By the numbers it is centred at x=198 in the 152..244 gap between the score and the status box, about 11 glyphs wide, so it should fit, but legibility over the gallery picture is unchecked.
Opinion for Marc: leaving notes uncancellable contradicts "Escape cancels any running action", and with no hint shown a player will hit the same "can't escape" he reported. I think notes should be cancellable too (a one-line change plus tests); the author is right to leave it until he decides.
Minor, non-blocking: the comment on `cancel` in `src/game/activity.ts` is one very long line.
