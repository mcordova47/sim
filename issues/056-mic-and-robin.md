---
id: 056
title: Redraw the mic stand; take the robin print off the map
status: review
owner: agent
depends_on: []
---

## Goal
From Marc's playtest of 044 (2026-10-23):
1. The robin print is not on the north wall between the table and desk. In the real room it hangs **above the table on the west wall**, which this camera does not show, so do not render it unless a cutscene needs it. Remove it from the map.
2. The mic stand looks wrong: the mic is very big and the stand is small. Redraw it, and try the bluebird variant, the vintage mic, or the other mics in `reference-photos/recording/`. More recording equipment photos were added there for later (audio interface, headphones, MIDI keyboard, pencil condenser mic).

## Acceptance criteria
- **Robin:** remove piece `k` (`painting-robin`) from `MAIN_MAP` and from `WALL_PIECES.main`, restoring the north wall tile at col 5 as plain wall (check `wall-tiles` tests and the classification picture in `docs/floor-plan.md`); keep the `painting-robin.sprite` in `art/src`, unused, and note in `docs/art-style.md` that it belongs to a possible future cutscene. Update the apartment and wall tests. `art-style.md` should no longer say it is placed.
- **Mic stand:** redraw `mic-stand` at the proportions of a real stand: a tripod base and a tall thin pole with a small mic at the top (the mic about as tall as a hand against a stand about as tall as a person's chest; at 16x32 that is a mic of roughly 4 to 6 px and a pole of about 20 px). Read the photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/recording/` and `mic1.jpg`, `mics2-and-3.jpg` (absolute paths; never copy them into the repo). Draw the bluebird-style variant as `mic-stand` and, if time allows, a vintage-mic variant as `mic-stand-vintage` (same size) for a contact sheet; Marc picks.
- The map keeps the stand at col 5 rows 1-2 (it is 16x32); say in the log if a different footprint reads better, and do not change the map for that without asking.
- Render the main room at 1x and 4x and look at it; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: Plan: remove `k`, redraw `mic-stand` (bluebird) plus `mic-stand-vintage`, update tests and docs.
- 2026-10-23: Done. Removed piece `k` from `MAIN_MAP` (col 5 row 0 is now `#`) and `WALL_PIECES.main` (now `pquwWf12`); the wall-tiles picture is unchanged (col 5 is still `b`). Kept `painting-robin.sprite` unused; `art-style.md` and `floor-plan.md` updated (robin hangs on the west wall, off camera, possible future cutscene). Tests updated in `apartment.test.ts` and `wall-tiles.test.ts` (no robin piece; col 5 row 0 is `#`/back).
  - `mic-stand` redrawn: bluebird-style mic 10 px tall incl. shock mount and XLR (grille, blue body), 2 px pole about 15 px, tripod base. `mic-stand-vintage` added (slatted silver and blue mic on a yoke), same stand, unplaced. Footprint stays col 5 rows 1-2; map unchanged for it.
  - Checked: `npm run sprites`, `npm test` (1033 pass), `npm run build` pass. Looked at the main room at 4x (mockup script and headless Chrome at 960x576, day and `?hour=23`) and at 1x (320x192); the north wall is plain between the table and the desk and the stand reads as a tall thin stand with a small mic. Reachability tests are in `npm test` and pass. Not checked: the vintage variant in-room (contact sheet only); how it feels in a real browser.
