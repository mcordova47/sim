---
id: 098
title: Art style doc: the perspective rule (south wall near top-down, the rest diagonal)
status: in-progress
owner: claude
depends_on: [096]
---

## Goal
Write Marc's perspective rule into `docs/art-style.md` (decisions in `docs/asset-review.md`, "Marc's answers"): pieces against the **south wall** are drawn nearly top-down; everything else is seen diagonally from the top and front. Exceptions, named: the big flat pieces off the south wall (bed, tub, toilet, bookshelf stay near top-down) and wall fixtures on side walls (radiator, pantry, windows stay face-on); pieces placed on a piece take its class; the stove and the counter are the model pieces. Fix the stale lines the survey found (bed-made called a placeholder, record-stand 16x48, fridge 32x96, and any other it lists) and replace the old 'all furniture is front-on with a top slice' paragraph with the new rule and a short picture of each class (near top-down, diagonal, face-on, flat) with the sprites that show it.

## Acceptance criteria
- `docs/art-style.md` states the rule, the exceptions and the classes; the reuse table matches the real sprites; no sprite or code changes. A reviewer checks every claim against the sprites and the maps.

## Progress log

- 2026-10-28: started. Plan: rewrite the Perspective section of docs/art-style.md with the rule, the way to decide a class, the lamp-slot and on-top rules, the four classes with example sprites, the exceptions; fix stale sizes and notes in the reuse table (bed, bin, counter, desk, fridge, record-stand, sofa, stove, table, toilet, tub, vanity, hood, window) and the 'bed-made placeholder' line.
- 2026-10-28: done. Only docs/art-style.md and this file changed. Claims checked against MAIN_MAP/KITCHEN_MAP/BATH_MAP in src/game/apartment.ts, sprite sizes in art/src, and the sprites viewed at 6x (stove, counter, sofa-td, table, desk, fridge, record-stand, bed-made, bookshelf, radiator, toilet, tub, pantry, vanity, desk-chair). The stove is described per the planner's re-check (near top-down, controls strip, four burners, no oven face). Notes: the reuse table's fridge and record-stand rows say 'Redraw' and point to the south-wall redraws (099); update them when that lands. Not changed: wall-tile text, long Naming paragraphs.

- 2026-10-28: **Review (independent): CHANGES NEEDED (two small factual errors in the new text; everything else checks out).**
  - Scope: diff main...HEAD is only `docs/art-style.md` and this issue file; no sprite, map or code changes; no personal details or reference-photo content.
  - Sizes: a script compared every size in the reuse table and every inline `name (WxH)` claim to `art/src/*.sprite` and `public/sprites/*.png` (same dimensions in both). All match. The only non-matches are the two legacy rows `bed` (64x32, file deleted, row says Redraw) and `sofa` (row gives `sofa-td`'s 96x32), both fine. Tile footprints match the maps: sofa 6x2, desk 4x2, table 4x2, bed 5x6, tub 2x4, bookshelf 1x4, counter and stove 3x2, hood 3x1, fridge 2x2, radiator 1x3, windows and pantry and curtain 1x2.
  - Maps: the sofa (row 7 wall below cols 2-7), record stand R, counter, stove, hood (row 5 wall) and fridge (row 9 wall) all have the `#` wall row directly below them; lamp table L has floor below (the step); the bed, bookshelf, table, desk, nightstand, bin, boxes, pantry do not. Correct as written.
  - Sprites viewed at 6x: sofa-td, counter, stove, table, desk, nightstand, bin, boxes, bed-made, bookshelf, toilet, tub, fridge, record-stand, pantry, hood, vanity. Descriptions match (stove: knob row, small display, four burners 2x2, no oven face).
  - Marc's answers (1 to 5): rule, exceptions, lamp slot as south wall, stove as model piece, toilet and vanity skipped, all reflected. Stale lines named by the survey (bed-made placeholder, record-stand 16x48, fridge 32x96, 'front-on') are fixed; no `32x96`, `16x48` (except the radiator, correctly), `placeholder` or 'all furniture is front-on' left.
  - Criteria: rule, exceptions, classes stated (pass); reuse table matches the sprites (pass); no sprite or code changes (pass); claims checked against sprites and maps (two failures below).
  - [ ] Wrong: "The bath has nothing against its south wall" (Perspective, 'How to tell the class'). In BATH_MAP the tub (rows 3-4, cols 1-2) has the `#` wall row directly below it, so by the doc's own test the tub IS on the bath's south wall. Reword (e.g. the tub runs down the west wall to the south wall; it is an exception, or already near top-down) and fix the Exceptions sentence "the big flat pieces that are not on a south wall", which has the same problem for the tub.
  - [ ] Wrong: "Items that are decoration only and not placed (`stool`, `rug`, `guitar` in profile on its wall hanger)". `guitar` is placed (`G` at col 1, row 5 of MAIN_MAP, with the `guitar` task); only `stool` and `rug` are unplaced. Move the guitar out of that list (it is a face-on/profile piece in the classes, like the mic stand) or say so.
  - Minor, optional: `delivery-box` (placed on the `x` tile, to be redrawn near top-down) is not named in any class; the 'Scale' bullet still says "Until then" about issue 020's floor plan; the legend still defines **Adapt** though no row uses it; the opening Room orientation sentence says far-wall pieces are drawn diagonally, but the bookshelf and bed on that wall are exceptions (it does say 'see Perspective').
  - Build and tests not run (docs-only diff).
