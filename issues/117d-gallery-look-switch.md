---
id: 117d
title: Photo gallery 4: the LOOK switch
status: in-progress
owner: claude
depends_on: [117a, 117c]
---

## Goal
Stage D: the LOOK switch on the PHOTOS page cycling the presets, with a line saying it applies to new pictures only.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Defaults to Soft (today's look); chosen look kept across reloads and untouched by reset; new uploads use it, old ones keep theirs; the checks above pass; an independent review.

## Progress log

- 2026-10-29 (claude): Started. Plan: a LOOK button and S key on the PHOTOS page cycling Crisp, Soft, Chunky (read from `look-settings.ts`, kept in its own key), the line saying new pictures only, `addPhotos` gets the chosen look.
- 2026-10-29 (claude): Built. Changed: `src/game/achievements/photos-draw.ts` (LOOK button after ADD PHOTOS, note line, layout for all four view/input cases), `feature.ts` (look state read once from `life.reel.look.v1`, `S` and the button cycle and save it, `addPhotos` passes it, option `lookStorage` for tests), `src/game/reel/looks.ts` (`nextLookId`), `photos-look.test.ts` (new, 65 tests, synthetic pictures), `docs/text-review.md`. Nothing in the save, sync document or reset changed.
  - Layout: wide keyboard, LOOK is in the keys line (the line now wraps BACK to a second row; the note sits right-aligned on the status row when the text leaves room); wide touch, no room in the button row, so LOOK is a 16 px button in the title row beside PHOTOS and the note sits at the right of the status row; narrow views, LOOK is in the button list and the note is its own row under the status (messages get the two rows above it). The empty page shows the long sentence. The short line "New pictures only." is used on the grid because the long one does not fit a row. The LOOK button is hidden in the close-up, while a picture is being made, and with no storage (as ADD is).
  - Behaviour: default Soft; order Crisp, Soft, Chunky and wraps; new uploads (landscape and portrait twin) get the chosen size and look, kept ones are not touched; the choice is read once and held for the session if the browser cannot keep it (then a message says so). Reset, REMOVE ALL and the save do not touch it.
  - Checked: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` (see below); layouts for 0, 1, 7 and 12 pictures x 3 looks x 4 view/input cases (also with REMOVE ALL asked) are inside the view and clear of buttons, cells and text; taps on LOOK (centre and both corners) cycle it on both touch views. Rendered all four cases at 1x (grid, asked, message, empty, Soft and Chunky) with synthetic pictures and looked at them.
  - Not checked: a real browser or phone (thumb feel, real localStorage), the look of each preset on real pictures (117g), the wording (placeholders in `docs/text-review.md`).


- 2026-10-29 (claude, independent review): Verdict: CHANGES NEEDED (one regression, otherwise sound).
  - Ran `npm test` (155 files, 3483 pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`: all clean. Scope: only the issue file, `feature.ts`, `photos-draw.ts`, `looks.ts`, the new test and `docs/text-review.md`; no PLAN.md, no other issues, nothing from reference-photos.
  - My own checks (outside the repo, synthetic pictures): a 1441-case layout sweep over 4 view/input cases x 0/1/6/7/13/60 pictures x 5 message sets (none, not-kept, 5-line summary, deleted, "No pictures added.") x armed x 3 looks x progress on/off: every button, cell, text line, note and page label inside the view with no overlaps (page label treated as right-aligned); LOOK button 16 px high on touch (093 size kept); LOOK present whenever not busy. Rendered all four cases at 1x (grid, message, armed, empty) and looked: wide keyboard, wide touch (LOOK in the title row), narrow touch/keyboard read well, no overlaps.
  - Author's tests re-read for key and tap routing (S cycles, ignored in close-up, while busy and with no storage; S while REMOVE ALL asked only cancels the question; LOOK tap cycles and reaches nothing else), persistence in a new session, junk in the key, blocked storage (message, held for the session), reset/save/sync document hold no look, REMOVE ALL keeps the look, portrait twin sizes (36x48 / 24x32 / 48x64), kept pictures untouched. All sound.
  - Criteria: Defaults to Soft: pass. Look kept across reloads: pass (in memory storage; real localStorage can't verify). Untouched by reset: pass. New uploads use it, old ones keep theirs: pass. The checks above pass: pass, except the regression below. Independent review: this entry.
  - FAIL (regression): on the wide keyboard view the keys line now wraps to a second row, so the status/message area dropped from 2 rows to 1 (narrow views from 3 to 2). A normal add summary is cut off mid-sentence. Example, wide keyboard, message "4 pictures added." "2 were already here." "1 could not be read.": main shows "...1 could not" / "be read."; this branch shows only "4 pictures added. 2 were already here. 1 could not" and "be read." is lost (seen in my render). On narrow views the worst-case 5-line summary now loses its third line ("The rest stayed where they were."). The wide touch view was already one row on main, so it is unchanged. The "New pictures only." line is also dropped on the wide views whenever a message shows (the author's design; acceptable on its own).
  - Unverified (not passed): feel in a real browser or on a phone, real localStorage and IndexedDB behaviour, how each preset looks on real pictures (117g), the wording of the new lines (placeholders in `docs/text-review.md`).
  - Checklist for the author:
    - [ ] Wide keyboard: give messages back the second row (for example put LOOK on the first keys row without wrapping BACK, or shorten the keys line) so the 3-line example above is not cut off any worse than on main.
    - [ ] Narrow views: do not take a message row for the note when a message is showing (for example drop the note while a message is up, as the wide views do), so the 3-row message capacity of main is kept.
    - [ ] Add a test that fails on this: the number of message lines shown for the 3-line example is at least what main shows, in all four view/input cases.
