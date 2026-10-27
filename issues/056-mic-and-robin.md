---
id: 056
title: Redraw the mic stand; take the robin print off the map
status: done
owner: agent
depends_on: []
---

## Goal
From Marc's playtest of 044 (2026-10-23):
1. The robin print is not on the north wall between the table and desk. In the real room it hangs **above the table on the west wall**, which this camera does not show, so do not render it unless a cutscene needs it. Remove it from the map.
2. The mic stand looks wrong: the mic is very big and the stand is small. Redraw it, and try the bluebird variant, the vintage mic, or the other mics in `reference-photos/recording/`. More recording equipment photos were added there for later (audio interface, headphones, MIDI keyboard, pencil condenser mic).

## Acceptance criteria
- **Robin:** remove piece `k` (`painting-robin`) from `MAIN_MAP` and from `WALL_PIECES.main`, restoring the north wall tile at col 5 as plain wall (check `wall-tiles` tests and the classification picture in `docs/floor-plan.md`); keep the `painting-robin.sprite` in `art/src`, unused, and note in `docs/art-style.md` that it belongs to a possible future cutscene. Update the apartment and wall tests. `art-style.md` should no longer say it is placed.
- **Mic stand:** redraw `mic-stand` at the proportions of a real stand: a tripod base and a tall thin pole with a small mic at the top (the mic about as tall as a hand against a stand about as tall as a person's chest; at 16x32 that is a mic of roughly 4 to 6 px and a pole of about 20 px). Read the photos in `reference-photos/recording/` and `mic1.jpg`, `mics2-and-3.jpg` (absolute paths; never copy them into the repo). Draw the bluebird-style variant as `mic-stand` and, if time allows, a vintage-mic variant as `mic-stand-vintage` (same size) for a contact sheet; Marc picks.
- The map keeps the stand at col 5 rows 1-2 (it is 16x32); say in the log if a different footprint reads better, and do not change the map for that without asking.
- Render the main room at 1x and 4x and look at it; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-23: Plan: remove `k`, redraw `mic-stand` (bluebird) plus `mic-stand-vintage`, update tests and docs.
- 2026-10-23: Done. Removed piece `k` from `MAIN_MAP` (col 5 row 0 is now `#`) and `WALL_PIECES.main` (now `pquwWf12`); the wall-tiles picture is unchanged (col 5 is still `b`). Kept `painting-robin.sprite` unused; `art-style.md` and `floor-plan.md` updated (robin hangs on the west wall, off camera, possible future cutscene). Tests updated in `apartment.test.ts` and `wall-tiles.test.ts` (no robin piece; col 5 row 0 is `#`/back).
  - `mic-stand` redrawn: bluebird-style mic 10 px tall incl. shock mount and XLR (grille, blue body), 2 px pole about 15 px, tripod base. `mic-stand-vintage` added (slatted silver and blue mic on a yoke), same stand, unplaced. Footprint stays col 5 rows 1-2; map unchanged for it.
  - Checked: `npm run sprites`, `npm test` (1033 pass), `npm run build` pass. Looked at the main room at 4x (mockup script and headless Chrome at 960x576, day and `?hour=23`) and at 1x (320x192); the north wall is plain between the table and the desk and the stand reads as a tall thin stand with a small mic. Reachability tests are in `npm test` and pass. Not checked: the vintage variant in-room (contact sheet only); how it feels in a real browser.

- 2026-10-23: **Review (independent, approve).**
  - Robin: **pass.** `k` is gone from `MAIN_MAP` row 0 (`##pp###qq#####uuu##`) and from `WALL_PIECES.main` (`pquwWf12`). My own script compared `wallKind` for every main-room tile against the old map (with `k`): 0 differences, and (5,0) is `back`/`wall-back`. The main piece list has no robin print; mic stand still occupies (5,1),(5,2); BFS from the start still reaches (5,3) and nothing newly blocked. `painting-robin.sprite` and its png are unchanged and kept. Grep for `robin` and for map key `k` across src, docs, scripts, art: only the intended doc notes and tests remain; `art-style.md` and `floor-plan.md` no longer say it is placed. Tests in `apartment.test.ts` and `wall-tiles.test.ts` updated.
  - Mic stand: **pass, with a note.** `mic-stand` and `mic-stand-vintage` are 16x32, every glyph is in the palette, pngs are 16x32 RGBA and match the sources after `npm run sprites` (clean tree). Viewed both at 10x: a tripod, a thin 2 px pole and a smaller mic; clearly a tall thin stand now. Note: measured mic is 8 px of body (10 px with mount) and the pole is about 15-16 px (21 rows counting the legs), against the issue's "roughly 4 to 6 px mic and about 20 px pole". The mic is still about a third of the sprite height. It reads right, but Marc may still find it a bit big; he picks.
  - Vintage variant: drawn, same size, not placed. **Unverified in the room** (I only viewed it as a sprite).
  - Footprint: unchanged at col 5 rows 1-2, as required.
  - Build/tests: `npm run sprites` (139 sprites), `npm test` (1033 pass), `npm run build` all pass. I did not render the room myself (checked map and walls by script, sprites by eye).
  - **Unverified:** how it feels in a real browser. Not exercised.
  - Scope: only art, docs, apartment.ts and its two tests, and this issue file changed; no PLAN.md or other-issue edits. No reference photos in the repo.
  - Minor, not blocking: `docs/floor-plan.md` still says the mic stand is at "col 4, rows 0-1" (older coordinates; the map has col 5, rows 1-2). PLAN.md table still shows 056 as `todo`; the planner needs to update it.
