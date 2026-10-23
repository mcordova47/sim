---
id: 060
title: Draw the gallery wall view
status: todo
owner: agent
depends_on: []
---

## Goal
"Admire the art" (issue 040) shows a full-screen picture of the south gallery wall, `view-gallery-wall`, which is still a labelled placeholder. Draw it from Marc's close-ups (2026-10-23: "a relatively easy improvement").

## Acceptance criteria
- Replace `art/src/view-gallery-wall.sprite` (320x192, same name) with a straight-on picture of the whole gallery wall: the real arrangement of the ten pieces on the wall with the plaster texture (the warm greys from 058), the baseboard at the bottom, maybe a bit of the sofa's back rail in the foreground (the view is from the sofa). Read the gallery photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` (`gallery-wall*`, absolute paths, never copied into the repo; no readable text or signatures). Reuse the existing `gallery-wall` strip's pieces where they fit, but this picture is larger, so draw the frames bigger and with more detail than the 16 px strip can hold.
- Keep key content in the top 140 px: the dialog box covers the bottom. The three lines of the admire-art scene must remain readable over it.
- Palette only; render it in the real game (`Admire the art` from the sofa; the dev build shows it) and look at it at 1x and 4x, in the day and at `?hour=23`; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
