---
id: "180"
title: "Remove the photo feature"
short: "Remove photos"
status: todo
owner: marc + claude
depends_on: ["176"]
summary: "Remove the photo reel, the PHOTOS pause page and the sofa photo scene, to make room on the crowded pause screen."
kind: chore
changelog: "The photo reel and the PHOTOS page are gone, and any pictures stored on your device are cleared."
decisions:
  - id: d1
    who: marc
    q: "Remove PHOTOS now (before the OUTFITS page is built)?"
    options:
      - "yes, now: it frees PHOTOS' cell on the pause screen for OUTFITS and removes about 1,700 source lines and 3,000 test lines before the OUTFITS build"
      - "later: build OUTFITS in another cell first and remove photos afterwards"
    recommendation: "yes, now: it frees PHOTOS' cell on the pause screen for OUTFITS and removes about 1,700 source lines and 3,000 test lines before the OUTFITS build"
    status: answered
    answer: "yes, now: it frees PHOTOS' cell on the pause screen for OUTFITS and removes about 1,700 source lines and 3,000 test lines before the OUTFITS build"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Remove photos (180, d2): also remove art/tools/pixel-looks.html (the page for choosing the photo looks), its entry in scripts/tools.mjs and its paragraph in docs/art-style.md, in a follow-up?"
    options:
      - "yes, in a follow-up"
      - "keep the tool"
    recommendation: "yes, in a follow-up"
    status: answered
    answer: "keep the tool"
    by: marc
    on: 2026-11-24
needs: [{who: marc, kind: decide, why: "Say 'merge 180' when ready (photos removed: 24 files, about 4,700 lines; reviewed; a quiet clean-up deletes stored pictures on the next load); answer d2 (the pixel-looks tool)", since: 2026-11-24}]
---

## Goal
Marc (2026-11-24): photos did not end up feeling natural and were too much friction; the pause screen is crowded (issue 176). The design of the OUTFITS page (`docs/outfit-equip-screen-design.md`, section 4) lists every place the photo feature touches and recommends removing it now as its own issue before the OUTFITS build. This issue does that removal and nothing else (the OUTFITS page is issue 181). Marc's decisions: d1 of issue 176 (photos are going; remove now or later depending on the mockups) and d8 of issue 176 (one quiet clean-up deletes the stored pictures and the look setting on the next load, so nothing invisible is left on a device).

## Acceptance criteria
- Remove everything section 4 lists: the PHOTOS pause page and its pieces (`achievements/photos-draw.ts`, `gallery-draw.ts` and the photo code in `achievements/feature.ts`, `draw.ts` (`PHOTOS_HINT`, the `photos` button) and `config.ts` (`ACHIEVEMENTS_UI.photosKey`, the `REEL` block, the ads' `interrupts: ["scroll-photos"]`)); the reel store (`src/game/reel/`); the sofa photo scene (`activities/reel.ts`, its registration, the `reelPictures?()` hook, the task `scroll-photos`, its `requires` on `hasPhotos`, its pose and its place in the sofa's task list, the derived variable `hasPhotos`, `Game.syncPhotos`/`loadReel`/`reel`) and the ad interruption of the close-up; the tests of all of these; leave nothing dangling (search for the exported symbols and file names, including `scripts/` and `docs/`). The photo design docs `docs/photo-reel-design.md` and `docs/photo-gallery-design.md` STAY as history, each with a one-line 'removed in issue 180' note at its top, and the gallery doc keeps its section 14 heading and what `scripts/issues-decisions.test.mjs` expects of it; `npm run issues:check` still passes.
- The clean-up (d8): one quiet clean-up on the next load deletes the stored pictures (the IndexedDB database) and the look setting (`life.reel.look.v1`), once, with no text, no popup, and never throws (private windows, blocked storage); a test with a fake store proves it and that nothing happens twice.
- The pause screen without PHOTOS: the pause list, the touch buttons (eight ids become seven) and the desktop hint line without the PHOTOS entry, still working on desktop, touch and the 224-wide phone view; leave PHOTOS' cell free for OUTFITS (issue 181) so the layout is not rearranged twice (say what you left).
- Docs that go stale: lessons `docs/learn/02-words.md` (built on the reel: give it another worked example or rewrite its steps and re-run its exercises), `docs/learn/05-state-and-sprites.md` if it names photos, `docs/learn/11-narrow-layout.md` (its 'if you are stuck' example `gallery-draw.test.ts`: use `achievements/inventory-page.test.ts` and check it fits), `docs/learn/reference-repo-map.md`, `docs/activities.md`, `docs/contributing.md`, `docs/text-review.md` (remove the photo strings), `docs/reduced-motion.md`, `docs/real-world.md`, and anything else the search finds; the learn exercises that change must be run to confirm they still work.
- A save from before the removal (with the `scroll-photos` task id in its history or stats, if any) loads without error; the sync merge and the save format are untouched (`hasPhotos` was never saved or synced) and a test proves an old save loads.
- Golden frames for a fresh game unchanged (the sofa task list changes only by the removed task; say what changes); standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; a `changelog:` line (at most 140 characters).

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main).
