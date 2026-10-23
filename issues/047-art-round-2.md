---
id: 047
title: Art round 2 from the 034 playtest
status: review
owner: agent
depends_on: []
---

## Goal
Marc's notes after playing the 034 build (2026-10-23): overall it looks really good. These are the adjustments. Reference photos are in `reference-photos/` (read by absolute path from the main checkout, never copied or captioned into the repo).

## Acceptance criteria
- **Sofa** (`sofa-td`): two seat cushions, a wooden back and wooden arms. Redraw from the sofa photos, including `sofa-detail`.
- **Table:** the microwave is on the wrong side; put it where the photos show it (check `microwave-on-table-with-mail` and `table-farther`). Keep the clutter, which Marc likes. Marc asked what the thing on the left of the table is: it is the coffee dripper on its scale next to the bean jar; if that is not what he means, ask. Make the dripper and scale read more clearly if it is hard to tell.
- **Barn painting** (`painting`): less busy; fewer details, a few clear shapes.
- **Guitar:** it still reads as facing the same way (Marc added `guitar1` for the perspective; `guitar2` is a second, nylon-string guitar that is a possible alternate or second guitar: draw it as `guitar-nylon` at the same size and say so in the log, not wired into the map). Flip it so the body, neck and headstock read hanging on the west wall.
- **Silkscreen print over the bed** (`painting-wide`): the picture is not centered inside its frame; center it.
- **Bookshelf:** the current drawing is the wrong direction and not overhead. Redraw it as a top-down piece (the top and the front slice, like the other furniture). Keep the book and object detail for a possible future "face the bookshelf" view (picking out a book); save the current drawing's detail under a different name such as `view-bookshelf` (not drawn into the room), and note it for that idea.
- **Radiator:** a bit long; shorten it (check the photo and the floor plan; if the map has to shrink, propose it and do not edit the map).
- Update `docs/art-style.md` where names or sizes change. `npm run sprites`, `npm test` and `npm run build` pass; render frames of the main room and look at them. Marc judges at 1x.

## Progress log

- 2026-10-23: Started. Plan: redraw `sofa-td`, reorder `table`, simplify `painting`, redraw `guitar` (+ `guitar-nylon`), centre `painting-wide`, redraw `bookshelf` top-down (old drawing saved as `view-bookshelf`), shorten `radiator`; update `docs/art-style.md`; render real frames.
- 2026-10-23: Done, ready for review.
  - **Sofa** (`sofa-td`, 96x32): oak back rail across the top, oak arms, kilim-pattern back cushion, two seat cushions with a seam between them, oak front rail and legs. Checked against `sofa-detail` (wooden frame around the back cushion, wooden arm, patterned cushion). The mid-sofa wooden bar of the old drawing is gone.
  - **Table:** the microwave and its pile of mail are now at the west (left) end, as in `table-farther` and `microwave-on-table-with-mail`. Bean jar, walnut box, grinder and kettle follow, with the clutter kept. What Marc called the thing on the left was the coffee dripper on its scale next to the bean jar; I could not ask, so I moved it to the east end next to the kettle (as in the photos) and redrew it clearer: white cone over a mug on a black scale with a display and a red light. If he meant something else, he should say what.
  - **Barn painting** (`painting`, 32x16): cream frame, mauve mat, and only a grey-roofed barn with a dark door, a lean-to and a golden field.
  - **Guitar:** my reading of "flip it": hung by its headstock on a wooden hanger at the west edge of its 1x2 tiles, neck straight down, body showing the lit face, cutaway on the right shoulder and the shaded side toward the wall. This is a judgement call; Marc should say if he wants it angled differently (e.g. mirrored, or in side profile). **`guitar-nylon`** (16x32, from `guitar2`: pale cedar top, reddish sides, slotted headstock, black tuners) is drawn at the same size and hanging; it is not wired into the map.
  - **Silkscreen print** (`painting-wide`): the picture moved 3 px left so it is centred in its frame (frame x 2..45, picture now x 19..28 with the mat equal either side).
  - **Bookshelf** (`bookshelf`, 16x64): redrawn top-down: the oak top with a sansevieria, a stack of books on a tray, a white bowl and a vase of dried flowers on it, and the south end as the front slice. The old face-on drawing, with its book spines, records, drawers and cubes, is saved unchanged as `view-bookshelf` (16x64, not drawn into the room) for a future "face the bookshelf / pick out a book" view.
  - **Radiator:** drawn three tiles long (48 rows) in the first three tiles of the 16x64 sprite, valve end at the bottom; the fourth tile is transparent floor. **Proposed map change (not made):** change the `r` column in `MAIN_MAP` to rows 1 to 3 only (row 4 becomes `.`), update `docs/floor-plan.md` (radiator 1x3), and resize `radiator.sprite` to 16x48. Until then the map still blocks the fourth tile (an invisible block on the east wall by the bed).
  - **Files:** `art/src/{sofa-td,table,painting,painting-wide,guitar,guitar-nylon,bookshelf,view-bookshelf,radiator}.sprite`, `docs/art-style.md`, this issue. No map or code changes.
  - **Checked:** `npm run sprites` (130 sprites), `npm test` (651 pass), `npm run build` pass. Rendered `node scripts/main-room-mockup.mjs` and a real frame of the game in headless Chrome (dev server) and looked at both, plus zoomed views of each changed sprite.
  - **Not checked:** how it feels at 1x on Marc's screen; whether the guitar reads right to him; the photo match of colours is approximate (palette only).
