---
id: 007d
title: "Furniture sprites: Kitchen, east half, and the bathroom"
status: review
owner: agent
depends_on: [005, 006]
---

## Goal
Draw the sprites for one batch of the apartment so each piece looks like Marc's real one. This is one of four parallel batches (007a to 007d) that together make up issue 007. Other agents are drawing the other batches at the same time, so stay inside your own sprites.

## Your sprites
Filenames and sizes come from `src/game/room.ts` (the `sprite` field on each piece and decor entry). Size is width x height in pixels (tiles x 16). Use exactly these names and sizes.

| Sprite | Size | Kind | What |
|---|---|---|---|
| `boxes` | 16x80 | piece | Box stack |
| `fridge` | 32x96 | piece | Fridge |
| `spice-rack` | 16x64 | piece (one-way) | Side rack |
| `vanity` | 32x48 | piece | Vanity sink |
| `toilet` | 32x32 | piece | Toilet |
| `tub` | 48x32 | piece | Tub and curtain |
| `shower-curtain` | 48x96 | decor | Shower curtain |

Descriptions of each piece (real size, colours, notable details) are in the `note` field in `src/game/room.ts` and in `docs/floor-plan.md`.

## Photo handling
The sprites should look like Marc's real pieces, so work from the photos in `reference-photos/` (gitignored; read them from the main checkout by absolute path, since worktrees don't have them) together with `docs/floor-plan.md` and `src/game/room.ts`. Never copy or commit the photos, and don't write anything into the repo that identifies the address. The photos stay until all of issue 007 is done; Marc deletes them afterwards.

## Acceptance criteria
- One sprite per row above, at exactly that size and name, in `art/src/<name>.sprite`, with the rendered PNG in `public/sprites/`.
- Follows `docs/art-style.md`: palette only, 1px ink outline, light from the top-left, and the **Materials** table so wood, steel, white and the rest match the other batches. If you need a colour the table doesn't cover, use the nearest palette key and note it in the progress log.
- Each sprite is recognisable as Marc's actual piece (colour, shape, one or two notable details), readable at 1x.
- The player walks and jumps in front of these sprites. Pieces marked one-way (the walkable surface is only the top 16px) must leave the space under the top slab open or transparent between the legs, because the player walks underneath.
- A sprite's base sits on the bottom edge of its box (furniture stands on the floor) and nothing important touches the box edge except where it meets a neighbouring piece.
- `npm run sprites` passes with no validation errors. Look at the contact sheet it generates (`art/contact-sheet.png`) at 4x before reporting done, and again next to the sprites in `public/sprites/` from any other batches already merged.
- Do not commit `art/contact-sheet.png`: it is generated and gitignored. Do not edit `docs/art-style.md`, `art/palette.json`, `room.ts` or other batches' sprites.

## Notes
- Marc gives final approval on the look of the full set once all four batches are in, so keep drawings simple and consistent rather than elaborate.
- Scale: the player is about 14px tall at 1 tile = 16px, so the player is tiny next to a 96px fridge. That is intended.

## Progress log

- 2026-10-22: Plan: draw the 7 sprites from the reference photos (fridge, boxes, bath), palette and Materials table only.
- 2026-10-22: Drew all 7 sprites in `art/src/` (boxes, fridge, spice-rack, vanity, toilet, tub, shower-curtain) with PNGs in `public/sprites/`. Sizes match the table. Checks: `npm run sprites` passes; contact sheet viewed at 4x; `npm run build` passes. Not checked: how they look in the game scene (016 draws the level), or next to other batches (none merged yet).
  - Details: fridge is steel with humidifier and clutter on top and handles on the left; boxes are two grey bins with pantry food over two cardboard boxes; spice-rack is a white wire rack with a top slab holding tea boxes, thin lower shelves, mostly transparent underneath; vanity is a wood cabinet with a white top and basin; toilet is front-on; tub is a white apron with feet; curtain is linen with a black rod and rings.
  - Colours: used `a` (cream) for linen on the shower curtain (not in the Materials table), and `4`/`2` (dusk, night) for the grey storage bins. No other off-table colours.
  - Notes: the toilet and tub top edges are flat so the player lands on the tank and the tub rim. The toilet's solid box is 32 wide but the tank is 22 wide, so the player stands on a slightly narrower visual than the collision. The fridge-top clutter sits inside the sprite's top 12px, so the collision top lines up with the clutter top, not the fridge body.

### Review 2026-10-22 (independent reviewer): CHANGES NEEDED
Own checks: decoded each PNG in `public/sprites/` with a separate script (not `npm run sprites`) and compared against the `.sprite` source, the palette hexes and the sizes. `npm run build` and `npm test` (29 tests) pass. Branch touches only the 7 sources, 7 PNGs and this issue file; no photos or address text in the repo.

- Sprite per row, exact size and name, source plus PNG: **pass** (all 7 are the right size, PNG matches source pixel for pixel).
- Palette only, no semi-transparent pixels: **pass** (0 off-palette, 0 semi-alpha). Materials table: **pass**; the two off-table colours (`a` linen, `4`/`2` bins) are logged.
- 1px ink outline: **pass** for boxes, fridge, toilet, tub. Non-ink pixels on the silhouette: vanity faucet (6 px, mist), shower curtain rod rings (68 px, `4`/`5` on the rod), spice-rack wire frame (93 px, `6`/`5`); these read as intended detail, flagged for Marc's eye only.
- Light from top-left: **pass** on viewing my own 5x sheet (highlights on top and left).
- Recognisable and readable at 1x: **pass on shape and colour from the sheet**; **can't verify** against the reference photos (not compared by this review). Marc approves the look.
- One-way spice-rack leaves space under the slab: **pass**. Rows 16 to 47 are only 1px legs and thin shelves, so the space is open.
- Base sits on the bottom edge: **FAIL for spice-rack**. Rows 0 to 1 and rows 48 to 63 are fully transparent, so the lowest opaque pixel is row 47 and the bottom row has 0 opaque pixels. The rack floats 16px above the box bottom, and the top 2px are empty so the collision top is 2px above the tea boxes. The other six pass (bottom row opaque: boxes 16, fridge 32, vanity 32, toilet 14, tub 12 feet, curtain 48).
- Nothing important touches the box edge: **pass with notes**. Only tops touch (fridge clutter, boxes, tub and toilet flat tops, curtain rod rings).
- `npm run sprites` passes, contact sheet viewed: **pass** (author's claim; I rendered my own 5x sheet instead). Next to other batches: **unverified** (none merged). In the game scene: **unverified** (016 draws the level).
- Do not commit contact sheet or edit style guide, palette, room.ts or other sprites: **pass**.

Checklist for the author:
- [x] `spice-rack`: redraw so the base reaches row 63 (legs or wire frame to the bottom edge, still open under the top slab), or, if a floating wall-hung rack is the intent, say so in the log and have Marc confirm. Also remove the 2 empty top rows (or start the tea boxes at row 0) so the collision top matches what the player visually stands on.

Unverified, for Marc: game scene look, look next to other batches, likeness to the photos. Toilet: the 32px collision box is wider than the 22px tank (author already noted).

- 2026-10-22 (round 2): Redrew `spice-rack`: tea boxes now start at row 0, legs run to row 63 with a bottom wire shelf on the bottom edge, still open under the top slab. Rerun `npm run sprites`: passes. Only `spice-rack` changed.
