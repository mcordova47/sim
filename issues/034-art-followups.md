---
id: 034
title: Art follow-ups from 028 to 030
status: todo
owner: agent
depends_on: []
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

- **Marc's notes from playing the sprite build (2026-10-23)**, to be judged in the running game at 1x:
  1. `lamp-table`: the lamp reads more side-on than everything else; redraw to the same top-down angle (Marc may send a reference photo of the lamp).
  2. Close-up labeled photos of the paintings and other art: Marc offered; list which ones to ask for (desk print, barn drawing, gallery wall, robin linocut).
  3. `guitar`: fine as is if it looks better, but try flipping it and shortening it so it hangs on the west wall (1x1 or 1x2, hanging, not leaning). Check the floor plan: the guitar tile may then be free floor or wall.
  4. Doors: Marc doesn't read them. For the main room to kitchen passage, draw an open passage (no door leaf) rather than a door: change the doorway tile for those two tiles (`doorway-*` or a new `opening-*`). Review the bath and front door doorways for the same readability problem.
  5. A reference picture of a mug and of the lamp from Marc will improve `table` (mug) and `lamp-table`.
  6. The front door is white (old, painted many times): redraw `front-door` white with layers of paint (chipped edges, a bit of an off-white or yellowed tint), not tangerine.
  7. Clutter piles on the desk: this is issue 042 (waits on this issue's art). Draw the piles as separate variants when 042 starts.

- **Reference photos (Marc renamed and completed them, 2026-10-23):** `ls /Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` and read what is relevant by absolute path; the names say what each shows (art close-ups, gallery wall by piece, the mics, stool, chairs, books and records, coffee station, mail on the table, desk clutter, kitchen and bath, overhead chair, silkscreen over the bed, and so on). Never copy a photo, caption or readable text into the repo (poster, book and record titles stay unreadable; no names).
- Redo the paintings (`painting`, `painting-desk`, `painting-wide`) and the `gallery-wall` strip from the new close-ups so they are better impressions of the real pieces; add `painting-robin` and a piece for the silkscreen over the bed if there is a wall slot (check the floor plan; propose a slot if not, do not edit the map).
- Use the new references to improve whatever else they show: mic stand, stool, chair and desk-chair (overhead), books and records on the shelf, coffee station and mug on the table, nightstand, fridge, kitchen counter, microwave and mail on the table, desk clutter (for 042), made and unmade bed.

- `view-gallery-wall` (320x192, same name): a straight-on view of the whole south gallery wall for the admire-art scene (issue 040). Keep key content in the top 140 px or so, because the dialog box covers the bottom. It is a labelled placeholder now.

## Progress log
