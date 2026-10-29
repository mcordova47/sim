---
id: 106a
title: Track editor on phones 1: touch layout and drawing
status: review
owner: claude
depends_on: [093]
---

## Goal
Stage 1 of section 7: `touchEditorLayout`, `drawTrackEditorTouch`, the live-view drawing in both shapes, hint wording through `hintLine`.

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- Layout and hint tests pass (every rectangle inside the view at 224 x 208 and 320 x 192, none overlap, cell rectangles map back to (step, pitch), bar buttons at least 50 x 18); docs updated (`docs/make-tracks.md` On phones, `docs/mobile.md` section 4); desktop unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-29 (claude): Started. Plan: `src/render/track-editor-touch.ts` (one layout function for both shapes, the drawing, the wording through `keyLabel`), the activity draws it when `touchHints()` is true, tests, docs.

- 2026-10-29 (claude): Built. Status: review.
  **What changed:** new `src/render/track-editor-touch.ts` (`touchEditorLayout`, `cellRect`, `cellAt`, `stepKeyAt`, `touchRowKeys`, `layoutRects`, `drawTrackEditorTouch`, `TOUCH_TEXT`); `render/track-editor.ts` (two optional `EditorView` fields, `page` and `firstTouch`; the desktop drawing is untouched); `activities/make-track.ts` (draws the touch look when `touchHints()`, `hidesStopHint`, a first-note tip flag, touch wording for the copy-failed and paste-fallback messages); `game.ts` (one condition: skip the game's `B TO STOP` line when the activity says `hidesStopHint`, which only the touch editor does); tests `render/track-editor-touch.test.ts` (67: layout at both sizes, 16 and 32 steps, 6 and 3 rows: inside the view, no overlaps, cells map back, bar buttons at least 50 x 18, the row window, the wording) and `activities/make-track-touch.test.ts` (a sweep of everything drawn and flashed on touch rejects desktop key names, desktop draw calls equal `drawTrackEditor`'s, layer switch mid-edit keeps the grid); docs `make-tracks.md` section 15 and `mobile.md` section 4.
  **Decisions:** (1) Portrait vs landscape is decided by width (at least 300), not by width over height, because the narrow view 224 x 208 is wider than tall. (2) The tempo stepper is three rectangles (minus 26, value 24, plus 26 in portrait; 40, 52, 40 in landscape), not two of 36, so the bpm number has room; the minus and plus are about 43 x 28 CSS px. (3) The top 12 px is the editor's one line of text (message, tip, or `B leaves. Your draft is kept.`); the design's longer reminder is 41 characters and does not fit 224 px. (4) The touch editor shows the tab names without digits (MELODY, BASS, BEAT) because `1 2 3` are keys. (5) Pitch rows are fixed blocks of six from the channel's lowest note. (6) The beat channel has 3 rows of 40 rather than 6 rows. (7) Layout also reserves Undo and Next buttons in the landscape panel; in portrait Undo waits for the More menu (106c).
  **Acceptance:** layout and hint tests pass (above); docs updated; desktop unchanged (all existing editor, Escape and golden tests pass untouched; the desktop-draw test compares call lists); `npx tsc --noEmit`, `npm run build` clean; `npm test` 3063 passed. One flashcards test (`treats a backend that throws as no connection` and a sibling) fails intermittently under full-suite load; it also failed on a clean `main` run (stashed my work), so it is unrelated and flaky.
  **Looked at:** rendered both touch layouts at 1x in headless Chrome (224 x 208 melody, bass on page 2 playing with 32 steps, beat with a message; 320 x 192 beat with 32 steps and landscape panel). Text, tabs, grid, notes, cursor, page strip, bar and panel are all inside the view and readable. The screenshots are not in the repo.
  **Not checked (needs a real phone):** how the cells feel under a thumb (33 CSS px tall at 1.67x), legibility of the 5 x 7 font at 1.67x on a real screen, and the editor in the live game on the narrow view (I drew the editor through a scratch page; I did not drive the real game to the desk). Until 106b nothing on the touch look is tappable: only the pad and A edit, so a phone player sees buttons that do nothing yet; this stage is not meant to ship alone.
  **Out of scope, noted:** the make-track task is still reachable on a phone (the old note in `docs/mobile.md` about a "needs a keyboard" message was never built); 106b should decide whether to hold the task back until taps land.
