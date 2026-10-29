---
id: 106c
title: Track editor on phones 3: name, More menu, delete
status: review
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
