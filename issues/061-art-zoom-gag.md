---
id: 061
title: Admire the art: zoom in on a piece and comment very seriously
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc's gag ideas (2026-10-23): (1) the Ferris Bueller painting zoom: the view pushes in on one piece of art, closer and closer, until it dissolves into its dots; (2) while it zooms, the narration comments very seriously on the brushwork, composition and so on, while the screen shows a very small pixel-art image. The deadpan seriousness is the joke; the lines are plain and sincere, not wink-wink (Marc finds some text too jokey in general; this one he asked for, so keep it dry).

## Acceptance criteria
- "Admire the art" gets a zoom sequence after the full wall view (issue 060): the view moves from the wall to one piece, then closer to that piece's brushwork, then to its individual pixels, as a few discrete steps (nearest-neighbour integer scale steps so the pixels stay crisp: 1x, 2x, 4x, 8x, centered on the chosen piece) with a short timed push between steps, not a smooth blur. A cutscene step (for example `zoom {to: {x, y, w, h}, ms}` on the active `view`) built into the existing cutscene `view` machinery, with Escape (046) and every exit path still clearing the view, and the input lock released.
- A different piece each time (cycle through the ten, remembered in the apartment state so it does not repeat back to back, with a wrapping state variable like `recordSort`), each with two or three lines of serious commentary on that piece (what it is, how it is composed, the brushwork), plain and sincere, font-safe, kept in one data file so Marc can review them in the text pass (037). No names, no real-world artists, nothing about who made them; keep the real prints abstract.
- Ending: at the closest zoom the picture is just big square pixels; one last dry line, then the view returns to the room. Points and mood as for the existing admire-art (unchanged unless the issue's author finds a reason).
- Art: the zoom works on the existing `view-gallery-wall` sprite for steps 1 to 2; for the close-up steps, either draw a larger close-up sprite per piece (`view-art-<piece>`, 320x192 each) or zoom the same sprite with the cutscene scaling it up; say which and why (a drawn close-up reads better but costs ten pictures; start with scaling the wall picture and add drawn close-ups for two or three pieces if the scaled look is too empty).
- Tests: the zoom steps validate at load (rectangles inside the picture), scale only by integer steps, restore the view on Escape at any step; a rendered frame for each zoom level; `npm test` and `npm run build` pass. Marc plays it and reads the lines.

## Progress log
