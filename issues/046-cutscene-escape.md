---
id: 046
title: Escape during a cutscene's text
status: todo
owner: claude
depends_on: []
---

## Goal
From the 040 review: Escape is ignored while a `say` line is up, so in "admire the art" it only skips during the short pause. `docs/activities.md` (around line 89) wrongly says Escape closes a cutscene's dialog.

## Acceptance criteria
- Decide with a test and a note: Escape during a cutscene's `say` skips the rest of the scene (apply nothing, restore the view, release the lock) or does not, and make code and docs agree. Skipping is the expectation, as with the pause.
- Every exit path still releases the input lock, closes the dialog and clears any view; the 022 fuzz-style test still passes.
- `npm test` and `npm run build` pass.

## Progress log
