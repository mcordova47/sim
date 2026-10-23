---
id: 025
title: Top-down art spec
status: in-progress
owner: marc + agent
depends_on: []
---

## Goal
Decide how top-down art is drawn before anyone draws it, and prove it with a few sample sprites that Marc approves. The side-view art was drawn as front elevations. A Pokemon-style game shows things from slightly above and in front, so this needs its own rules.

## Acceptance criteria
- `docs/art-style.md` updated for the top-down view (the side-view rules remain in git history and the `side-view-prototype` tag): the perspective (front-on with a visible top slice, early Game Boy style), the 16 px tile, how big objects are in tiles, where the light comes from, outlines, the shared palette and the Materials table (kept), shadows, and naming for variants and frames (`bed-made`, `bed-unmade`, `dishes-2`, `player-walk-down-1`).
- **Character size:** decide with Marc whether the character is 16x16 or taller (for example 16x24 or 16x32, which needs the pipeline's "multiple of the tile" rule relaxed or the character drawn in two tiles). Directions: down, up, left and right (left may be drawn by flipping right), each with idle and walk frames. A list of the "doing" poses wanted (sitting, typing, playing guitar, reading, sleeping, eating) with sizes.
- **Reuse audit:** go through the 24 side-view furniture and decor sprites in `art/src/` and sort each as reuse as-is (front-facing pieces against the back wall, such as the bookshelf, fridge, stove and counter), adapt, or redraw from above. Record the table in the doc.
- **Floor and wall tiles:** a small tileset (wood floor, kitchen and bath tile, rug, back wall, side wall, doorway) drawn as samples.
- **Samples for approval:** the tileset, two furniture pieces (one reused or adapted, one new top-down piece) and the character facing down (idle and one walk frame), each rendered and shown on a contact sheet next to each other and on a sample room mockup. Marc approves the look before any batch of furniture is drawn.
- Pipeline: any change to `scripts/sprites.mjs` or the validation (size rules, animation naming) is made and tested; the existing palette-only and no-semi-transparency rules stay.
- The photos in `reference-photos/` are still the reference for what pieces look like (read by absolute path, never committed).
- A tests or script check that every sprite referenced by the level data exists, once 020 lands.

## Notes
- The look Marc pointed to: early Pokemon (3/4 top-down, 16 px tiles, front-facing furniture, rooms as screens). A later project may be isometric; not this one.
- Furniture batches for the new view are written after 020 gives the piece list.

## Progress log

- 2026-10-22: Started. Marc chose a 16x16 character (one tile). Plan: rewrite docs/art-style.md for top-down, audit the 32 existing sprites, draw sample tileset, one reused and one new furniture piece, and player-idle-down + walk frame; render a contact sheet and a room mockup; keep pipeline changes minimal.
