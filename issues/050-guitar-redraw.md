---
id: 050
title: Guitar redraw (Marc's tweaks)
status: review
owner: agent
depends_on: []
---

## Goal
The hanging guitar (`guitar`, 16x16, headstock west, neck and body east, profile like the player facing right) reads weakly: at 1x it looks like a small bow-tie, with no sound hole or strings. Marc has tweaks and may draw it himself (2026-10-23). `guitar-nylon` should match.

## Acceptance criteria
- Marc supplies a drawing or direction (as a `.sprite` grid, a sketch or a photo); an agent turns it into `guitar` and `guitar-nylon` (same format, 16x16, palette only) and renders it at 1x and 4x in the main room next to the player sprite.
- If 16x16 cannot carry it, propose a different footprint or pose, with Marc's pick, then do it in 044 (map).
- Guitar and nylon guitar both read as guitars at 1x (sound hole, a few strings, a clear body-and-neck shape); Marc signs off.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Marc's concept sketches (2026-10-23)
Three references in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/`: `guitar-concept-side.jpeg` (option 1, from the side, matching the pieces drawn that way), `guitar-concept-top-down.jpeg` (option 2, from above, matching the sofa next to it), and `guitar-concept-proposed.jpeg` (option 3, **Marc's recommendation**: a combination, seen diagonally from the top, side and front). The proposed sketch: the neck runs up and to the west at a slant from the body, headstock with tuners at the top-left, the body below it with a cutaway, a dark sound hole on the lit face, and the face skewed toward the viewer. Do option 3 first; if it does not read at 16x16, draw option 1 or 2 from the other sketches and put the alternatives side by side in a contact sheet for Marc to pick. Same for `guitar-nylon` from `guitar2` (a nylon-string guitar: wider neck, no pickguard, a rosette around the sound hole).

## Progress log

- 2026-10-23 (agent): Read Marc's three sketches. Option 3 as a near-vertical figure (neck slanting, body upright) read as a boot at 16x16; the same idea laid along the 45 degree diagonal (headstock top-left, body bottom-right, waist, dark sound hole) reads as a guitar and is now `guitar` and `guitar-nylon` (16x16, palette only, drop-in, same hanger spot). Nylon: pale cedar top, reddish sides, rosette ring, no pickguard. Options 1 (side) and 2 (top-down) drawn too, but they read poorly at 16x16 (side looks like a box with a stick, top-down like a banjo); kept only on the contact sheet.
- Also drew option 3 at 16x32 as `guitar-tall` and `guitar-nylon-tall`, which reads most clearly (proper upright guitar with a leaning neck). That is the "different footprint" proposal: it needs a 1x2 spot on the west wall, decided with Marc and done in 044 (I did not touch the map). Not used by the game.
- Files: `art/src/guitar.sprite`, `art/src/guitar-nylon.sprite`, `art/src/guitar-tall.sprite`, `art/src/guitar-nylon-tall.sprite`, regenerated `public/sprites/*`, `art/contact-sheet.png`, `art/guitar-options.png` (contact sheet for Marc, left to right: 16x16 diagonal, 16x16 diagonal nylon, 16x32 tall, 16x32 tall nylon, option 1 side, option 2 top-down, player for scale), `art/guitar-in-room-1x.png` and `art/guitar-in-room-4x.png` (main room west end with the new guitar next to the player).
- Checks: `npm run sprites`, `npm test` (985 pass) and `npm run build` pass. Looked at the sprite at 12x and in the real main room at 1x and 4x.
- Not checked / open: Marc's sign-off that it reads as a guitar at 1x; his pick between 16x16 diagonal and the 16x32 tall version (if tall, 044 needs a 1x2 spot and the `guitar-tall` sprite swapped in); nylon only seen on the sheet, not in the room.
