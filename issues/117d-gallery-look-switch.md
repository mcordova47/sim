---
id: 117d
title: Photo gallery 4: the LOOK switch
status: review
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

