---
id: 025
title: Top-down art spec
status: review
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
- 2026-10-22: Done, ready for review. Marc chose a **16x16 player** (one tile), so the size rule needed no relaxing.
  - `docs/art-style.md` rewritten for top-down: perspective, overhang rule, grid, shadows, naming (variants, stages, directional frames, doing poses), reuse audit table of all 24 side-view pieces (6 reuse, 10 adapt, 8 redraw), and how to view the samples. Palette, Materials, outline and no-semi-transparency rules kept.
  - Samples in `art/src/`: `floor-wood`, `floor-tile`, `rug`, `wall-back`, `wall-side-left`, `wall-side-right`, `doorway`, `sofa-td` (adapted from `sofa`), `bed-made` (new, 32x48), `player-idle-down`, `player-walk-down-1`.
  - Pipeline: shared code split into `scripts/sprite-lib.mjs` (palette, parse/validate, rasterize, PNG), added a kebab-case name check, `--sheet=prefix,...` to filter the contact sheet, and `scripts/room-mockup.mjs` (sample room to `art/room-mockup.png`, gitignored). Tests in `scripts/sprite-lib.test.mjs` (49, include every file in `art/src`).
  - Checked: `npm run sprites` (43 sprites), `npm test`, `npm run build` pass; looked at the contact sheet and room mockup.
  - **Not done:** the last criterion (every sprite referenced by level data exists) depends on 020; no level data to check yet. **Not checked:** Marc's approval of the look (needed before any furniture batch). Up/left/right character frames and the "doing" poses are named and sized in the doc but not drawn.
  - Follow-up for planner: `art/src` still holds the old side-view player sprites; remove them when the game switches over (019/020).
