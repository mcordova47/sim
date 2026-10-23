---
id: 034
title: Art follow-ups from 028 to 030
status: todo
owner: agent
depends_on: [031]
---

## Goal
The art that is left, and the small fixes the reviews noted. Do these after 031 so they are judged in the game at 1x.

## Acceptance criteria
- Judge the dish stages (`dishes-1..3`), the east window slivers and the other small pieces at true 1x in the running game; redraw whatever does not read.
- `dishes-1..3` leave transparent pixels at the rounded corners of the plates, mugs and pot inside the counter (8, 17 and 31 pixels); fill them with the counter-top color.
- Pieces from the floor plan that have no top-down sprite yet and the old side-view ones still in `art/src` (`sofa-arm`, `mic-stand`, `gallery-wall`, `spice-rack`): keep, redraw or delete each, with the reuse table updated.
- Doing poses on the real furniture, which now has the final sizes: `player-eat-table` (the floor plan has the table on the north wall and the player on its south side, so a back view may be right), `player-guitar` (the guitar is 1x2 vertical), and the sofa, bed and desk poses against the 6x2 sofa, 5x6 bed and 4x2 desk. Redraw to fit; the sleep lump is plain.
- Character: down-facing eyes, and the side-profile nose that reads as a beak in a couple of frames (Marc's taste call).
- Other outfits (casual, out, pajamas) as `player-<outfit>-...`, and held-item overlays (mug, laptop, guitar, book) as separate sprites.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
