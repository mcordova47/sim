---
id: 106d
title: Track editor on phones 4: share and paste
status: review
owner: claude
depends_on: [106c]
---

## Goal
Stage 4: Share (system share sheet, Copy fallback), Copy, Paste (clipboard first, then a hidden text box), `importText` cleanup (CRLF, NBSP, signature).

Design and Marc's answers (2026-10-28): `docs/track-editor-phones-design.md` (6 pitch rows of 20 game px; top-level buttons Play, Save, Length, More; tap clears a note; share sheet with Copy fallback; paste tries the clipboard then a hidden text box). Touch targets follow 093 (at least 44 CSS px where possible); desktop behaviour and golden frames unchanged.

## Acceptance criteria
- The mangled-text cases pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review; Marc tries it on his phone (first real check).

## Progress log

- 2026-10-29 (claude): Started in worktree ../sim-worktrees/106d-editor-touch-share-paste. Plan: Share in More (share sheet, Copy fallback), Paste with clipboard first then a visible paste box (hidden field becomes a textarea), `cleanTrackText` before the parser, tests.
- 2026-10-29 (claude): Built. Status: review.
  **Files:** `src/game/activities/make-track.ts` (share, paste box mode `pasting`, `importText` returns a boolean and cleans), `src/game/music/demos.ts` (`cleanTrackText`), `src/input/clipboard.ts` (`ShareLike`, `browserShare`), `src/input/touch-ui.ts` and `index.html` (the field is a textarea; `tp-box` style and placement over the picture while the game asks for a box), `src/input/text-entry.ts`, `src/game/activity.ts`, `src/game/game.ts`, `src/main.ts` (`boxed`/`textBox` plumbing), `src/render/track-editor.ts` and `track-editor-touch.ts` (a `pasting` flag and the strip text), `docs/make-tracks.md` section 15, tests: new `make-track-share-paste.test.ts`, the menu list in `make-track-menu.test.ts`.
  **Checks:** `npx tsc --noEmit` clean; `npm test` and `npm run build` run (see the commit). Goldens untouched.
  **Looked at (headless Chrome, 1x, real draw code):** both views (224 x 208, 320 x 192) with the paste hint in the top strip, and with the 8-entry More menu open (Share added): the menu fits and nothing is clipped. The DOM paste box itself was not looked at in a browser.
  **Note:** a record with an unknown wave is refused with the parser's message; `sawtooth` is accepted by the existing importer (the editor uses its own waves), so the design's remark about it does not apply.
  **Not verified (needs Marc's phone):** the iOS share sheet from a canvas tap through the dialog; clipboard permission prompts (Safari's Paste bubble, Android Chrome); the paste box (tap, long press, Paste bubble on iOS, a textarea for the keyboard); its placement over the picture; whether `navigator.share` still counts the dialog pick as the user's gesture.
