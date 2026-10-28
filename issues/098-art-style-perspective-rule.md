---
id: 098
title: Art style doc: the perspective rule (south wall near top-down, the rest diagonal)
status: review
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
