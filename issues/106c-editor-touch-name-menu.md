---
id: 106c
title: Track editor on phones 3: name, More menu, delete
status: done
owner: claude
depends_on: [106b]
---

## Goal
Stage 3: `wantsText`, `textValue`, `setText`; the More menu; Undo; delete with confirm.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- Naming works through the hidden input; the menu equals the keys; a touch-only run through make, save, rename and delete passes in tests; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-29 (claude): Started in worktree ../sim-worktrees/106c-editor-touch-name-menu. Plan: `wantsText`/`textValue`/`setText` on the activity, name and More taps, a More menu equal to the keys (Rename, 16/32 steps, Undo, Copy, Paste, Delete, Back), one-level Undo, name box that shows the tail while typing, a touch Save message at the track limit, tests including a touch-only run.
- 2026-10-29 (claude): Built. Status: review.
  **Files:** `src/game/activities/make-track.ts` (wantsText/textValue/setText, `openMore`, `undo`/`remember`, the name/More/UNDO targets, limit message on touch), `src/render/track-editor-touch.ts` (`fitTail`; the typing name shows its end), `src/input/touch-ui.ts` (one change: a canvas tap that makes the game start wanting text also focuses the hidden field in that same pointer-up, so tapping the name button raises the keyboard; a tap on a screen already typing does not), `src/game/activities/make-track-menu.test.ts` (new, both views, 15 tests including the touch-only make/save/rename/delete run), `make-track-taps.test.ts` (the 106b "Not on the phone yet" placeholder test replaced by one that checks the name button and More work), `docs/make-tracks.md` section 15.
  **Notes from earlier reviews handled:** Delete is in More, and the 12-track message on touch points to it (tested: open a saved track from the start menu, More, Delete, Yes at the limit); the 24-letter name keeps the caret and last letters visible (looked at, below); cutting 32 to 16 steps is in More as "Cut to 16 steps", and Undo brings the notes back (tested).
  **Checks:** `npx tsc --noEmit` clean; `npm test` 3196 pass (golden unchanged); the only failure in one run was the known flaky `flashcards.test.ts` (untouched). `npm run build` run below.
  **Looked at (headless Chrome, 1x, real draw code):** 224 x 208 and 320 x 192 with a 24-letter name being typed (shows the tail with the caret, `DEFGHIJKLMNOPQRSTUVWX_`), and the track-limit message on both views. Nothing clipped.
  **Not verified (needs Marc's phone):** that tapping the name button raises the iOS keyboard from the canvas pointer-up (touch-ui has no tests for DOM focus; only the logic is covered), how the keyboard covers the screen, thumb feel of the menu rows. The field's aria-label still says "Sync key".

- 2026-10-29 (claude, independent review): **Verdict: approve.**
  **Checks run:** `npx tsc --noEmit` clean; `npm test` 142 files, 3197 pass, 1 skipped (golden frames unchanged, no flake this run); `npm run build` OK. Scope: only the 7 listed files; no PLAN.md, other issues or reference-photos; no real names or personal details in the diff.
  **Criteria:**
  - Naming works through the hidden input: pass. `wantsText` is true only while naming (and not done, edit phase); `setText` ran on empty, spaces, newline/tab, emoji, combining marks, NUL, curly quotes, RTL override and a 100k string: always at most 24 chars, never throws; spaces-only then Enter says "The name is unchanged."; ignored when not naming. `game.wantsText` is also false while a dialog is open, so a menu never raises the keyboard. Enter/Escape from the field reach the activity as keys.
  - Menu equals the keys: pass. Entries Rename/steps/Undo/Copy/Paste/Delete/Back call the same methods as N, `,` `.`, C, V, D; More while playing keeps playing and Rename then typing works; a second More tap with a dialog open says "Not now." and does not stack; Back and Escape change nothing.
  - Touch-only run through make, save, rename, delete: pass (tests in both views, 15 tests, also re-run by me).
  - tsc, test, build: pass (above).
  - Constraints: desktop unchanged: pass (touchHints off: no tap targets, N/E/typing work, Z does nothing, goldens pass). Hint strings: the new messages ("Nothing to undo.", "Undone.", "12 saved. Open one, More, Delete.") name no key. Layout at 224x208 and 320x192, both step counts and all three channels: all buttons inside the view and pairwise disjoint (my own check).
  - Escape at each state (edit, naming, menu, delete confirm) leaves the editor with the saved track kept (my check). Switching touchHints off mid-name keeps the typed text and the keys still finish it.
  **touch-ui.ts change:** reads right. `wanted` is live from the game, so right after a tap that starts naming it is true; the focus happens only when the screen was not already typing, so it cannot re-raise or fight a field already focused, and it runs only when the touch layer is visible and a button was pressed. A tap that starts any other text screen would also raise the keyboard, which is the wanted behaviour. No unit test covers the DOM focus.
  **Minor findings (not blocking, for a later issue):**
  1. Undo after Paste does not restore `editingId`: paste sets it to null, so after Undo the old saved grid is back but Save then creates a second track instead of updating the first (checked: id demo-1 before, null after Undo). No data loss.
  2. The design (section 4) asks for touch rows in `escape.test.ts`; none were added (Escape is not touch dependent and works in my check, so only a test gap).
  3. The hidden field's aria-label still says "Sync key" (author noted it).
  **Unverified (needs Marc's real phone):** whether tapping the name button raises the iOS keyboard from the canvas pointer-up; how the keyboard covers the canvas; thumb feel of the menu rows and the 33 CSS px grid. Also not looked at by me: the drawing in a browser (I did not run a headless browser; the author's screenshots are their claim, and fitTail is covered by a unit test).
  PLAN.md table needs updating by the planner.
