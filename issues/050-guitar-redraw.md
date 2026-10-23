---
id: 050
title: Guitar redraw (Marc's tweaks)
status: todo
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
