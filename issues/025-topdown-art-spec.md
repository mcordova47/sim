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
- 2026-10-22: Done, ready for review. Marc chose a **16x16 player** (one tile), so the size rule needed no relaxing.
  - `docs/art-style.md` rewritten for top-down: perspective, overhang rule, grid, shadows, naming (variants, stages, directional frames, doing poses), reuse audit table of all 24 side-view pieces (6 reuse, 10 adapt, 8 redraw), and how to view the samples. Palette, Materials, outline and no-semi-transparency rules kept.
  - Samples in `art/src/`: `floor-wood`, `floor-tile`, `rug`, `wall-back`, `wall-side-left`, `wall-side-right`, `doorway`, `sofa-td` (adapted from `sofa`), `bed-made` (new, 32x48), `player-idle-down`, `player-walk-down-1`.
  - Pipeline: shared code split into `scripts/sprite-lib.mjs` (palette, parse/validate, rasterize, PNG), added a kebab-case name check, `--sheet=prefix,...` to filter the contact sheet, and `scripts/room-mockup.mjs` (sample room to `art/room-mockup.png`, gitignored). Tests in `scripts/sprite-lib.test.mjs` (49, include every file in `art/src`).
  - Checked: `npm run sprites` (43 sprites), `npm test`, `npm run build` pass; looked at the contact sheet and room mockup.
  - **Not done:** the last criterion (every sprite referenced by level data exists) depends on 020; no level data to check yet. **Not checked:** Marc's approval of the look (needed before any furniture batch). Up/left/right character frames and the "doing" poses are named and sized in the doc but not drawn.
  - Follow-up for planner: `art/src` still holds the old side-view player sprites; remove them when the game switches over (019/020).
- 2026-10-22: **Review (independent): changes needed (one small doc fix).**
  - Pass: `npm run build`, `npm test` (194 tests), `npm run sprites` (43 sprites) and `node scripts/room-mockup.mjs` all run clean; no files outside scope changed (no PLAN.md or other issues touched, nothing from reference-photos).
  - Pass (pipeline): my own checks on `parseSprite`: Bed, a_b, -a, a.b, "a b" rejected as names; 9a accepted; unknown keys (`~ A 0 l`) and spaces rejected; non-tile sizes (16x24) rejected; wrong row width/count rejected; 32x16 accepted. Rasterize yields only alpha 0/255, so no semi-transparency possible; palette-only rule intact. Minor, not blocking: `size: 0x0` with no rows is accepted (harmless).
  - Pass: the new sprites use only palette keys; sizes in the reuse table match every original in `art/src` on main (checked all 32).
  - Pass: doc covers perspective, 16 px tile, overhang, light, outlines, palette and Materials (kept), shadows, naming incl. direction frames, character size (16x16, per Marc) and a doing-poses list with sizes. Sample set matches the doc (7 tiles, sofa-td, bed-made, player-idle-down, player-walk-down-1).
  - **Fail (doc claim wrong):** `docs/art-style.md` says "Verdict totals: 5 reuse, 10 adapt, 9 redraw". Counting the 24 sprites (window-blinds and window-curtain share one table row) the real totals are 6 reuse (gallery-wall, hood, spice-rack, tote, window-blinds, window-curtain), 10 adapt, 8 redraw. The author's own log says 6/10/8, so the doc contradicts the log. Fix the totals line and say the window row is two sprites.
  - Look (viewed contact sheet and mockup): reads as early-Pokemon front-on with a top slice. Back wall, doorway, rug, wood floor and bathroom tile read well; bed-made and sofa-td look coherent; top-left highlights plausible. Observations for Marc, not failures: (a) `wall-side-left/right` show no visible floor shadow strip as the doc describes (just ink, a 3 px light face and one ink column); (b) idle and walk-down-1 differ by only a pixel or two and look nearly identical at game scale; (c) the bathroom checker tile is pale next to the warm wood.
  - **Unverified:** Marc's approval of the look (needs his eyes on `art/contact-sheet.png` and `art/room-mockup.png`); "every sprite referenced by level data exists" (depends on 020, no level data yet). Up/left/right frames and doing poses are specified but not drawn, which the criteria allow.
  - Checklist for the author: [ ] correct the verdict totals line in `docs/art-style.md` to 6 reuse / 10 adapt / 8 redraw. [ ] Optionally make the side-wall shadow match the doc, or soften the doc wording. Then back to review; Marc's approval stays open.
