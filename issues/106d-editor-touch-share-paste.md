---
id: 106d
title: Track editor on phones 4: share and paste
status: done
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

- 2026-10-29 (claude, independent review): **Verdict: approve** (status set to done; the phone check below is still Marc's to do).
  **Commands (in the worktree):** `npx tsc --noEmit` clean; `npm test` 158 files, 3610 passed, 3 skipped; `npm run build` ok. Goldens untouched (diff has no golden files).
  **Criterion: mangled-text cases pass. Pass.** Besides the author's tests I ran my own throwaway script (outside the repo) against `cleanTrackText`/`importText`. Unchanged, as they must be: clean text, a `note:` line containing "Sent from", `#` comments with `--` in them, a partly quoted text (only some lines start with `>`), `&nbsp;` as literal text, sharps and flats and rests, a drum line starting with `S`; the function is idempotent and a 1 MB input runs fast. Cleaned correctly: CRLF, lone CR, U+2028, NBSP and full-width spaces, tabs, BOM and zero-width marks, curly quotes and dashes, `> ` on every line, a code fence with a language tag, "Sent from my iPhone" and "Get Outlook", a `--` or `___` line with a name after it, all combined. Text that is not a track still reaches the parser's own message (empty, whitespace, grocery list). Minor, not blocking: a nested `>> ` quote, a fence on the same line as the first line, a signature followed by more text ("Thanks!"), and a single em dash line as a delimiter are not cleaned (the parser then refuses them with its message); a title's curly quote or dash is turned plain, which is intended.
  **Share fallbacks. Pass.** Shared / cancelled (no copy) / unsupported / failed / rejected all behave as designed; `share` is called inside the tap, before any await. Nit: if the sheet fails after the player has already left the editor, the fallback still copies to the clipboard (silent, harmless).
  **Paste box states. Pass.** Clipboard null, blank (opens the box), junk (message, no box on touch), good (imports, never opens); box: a mangled track imports and closes it, junk empties it with the reason, a few typed letters wait and Go reads them, Go on an empty box asks for a paste; a late clipboard answer while naming is ignored (name kept), while the box is open it imports and closes the box, after `cancel()` it does nothing; no taps while the box is open; Escape/B leaves the whole editor (same as naming, draft kept).
  **Desktop unchanged. Pass.** With touch hints off a null clipboard read gives "Press Ctrl+V to paste.", no box, `textBox` false; the menu list change is touch only.
  **touch-ui textarea. Pass (by reading the code).** The field's keydown always `preventDefault`s Enter (and Escape) and sends the game key, so no newline is ever typed in; `setText` for a name filters through `nameChars` (no newline allowed) and cuts to `nameMax`; the paste event is intercepted, so a name paste cannot carry line breaks either. The hidden 1 px style is unchanged when not boxed (`placeBox` clears it every frame; cheap). Not run in a real browser.
  **Renders at 1x. Pass.** I drew the real touch editor code (esbuild bundle, headless Chrome) at 224x208 and 320x192 in edit and paste modes: the paste hint "TAP THE BOX, HOLD, CHOOSE PASTE" fits the top strip on both and nothing is clipped. The More menu is a dialog, not drawn by this code; I did not look at it myself (the author did, and the menu test covers the entry list).
  **Scope and privacy. Pass.** Changed files are the editor, clipboard, touch-ui plumbing, render strip text, docs/make-tracks.md section 15, tests and this issue file; no PLAN.md, other issues, flashcards or reference-photos. No real names or personal details (the one email-like string is the placeholder `Someone@example.com` in a test).
  **Cannot be verified here (unverified, not passed):** the iOS share sheet from a canvas tap (and whether the gesture still counts); clipboard permission prompts (Safari's Paste bubble, Android Chrome); the paste box itself in a real phone browser (tap, long press, Paste bubble, soft keyboard Enter on a textarea), and its placement over the picture with the keyboard up; Marc trying it on his phone (the issue's last criterion).
  **For the planner:** the table in PLAN.md needs updating to done for 106d (only the planner edits it).
