---
id: 036
title: Art: more accurate paintings, the gallery wall, blinds states
status: todo
owner: agent
depends_on: []
---

## Goal
From Marc's playtest of the sprite build (2026-10-23): the paintings are generic colour blocks. Make them read as the real ones, even abstractly, and add the pieces the new couch tasks and alternating blinds need.

## Acceptance criteria
- **Paintings:** redraw `painting` (2x1) and `painting-wide` (3x1), and add variants as needed so the three on the north wall differ from each other, each a recognisable impression (palette, composition) of the real artwork. Read Marc's photos in `reference-photos/` by absolute path from the main checkout; ask Marc before using anything that shows readable text or a signature. Never copy photo content into the repo; abstract impressions only. If a photo of each painting straight on would help, say so in the log.
- **Gallery wall** (for "admire the art" in issue 035): a `gallery-wall` top-down piece, sized to a wall space chosen with Marc or from the floor plan, or if the floor plan has no spot, propose one and say so. Check `docs/floor-plan.md`.
- **Blinds open and closed:** `window-blinds-open` and `window-blinds-closed` (and `window` if it has the same alternation), same size as `window-blinds`.
- Update the reuse audit and `docs/art-style.md` where names are added. Sprites pass `npm run sprites`; contact sheet and a main-room mockup for Marc.
- `npm test` and `npm run build` pass.

## Progress log
