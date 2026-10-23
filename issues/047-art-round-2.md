---
id: 047
title: Art round 2 from the 034 playtest
status: todo
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
