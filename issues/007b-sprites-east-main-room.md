---
id: 007b
title: "Furniture sprites: Main room, east: dining table, records and sofa"
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
| `table` | 48x32 | piece (one-way) | Dining table |
| `record-stand` | 16x48 | piece | Record player stand |
| `sofa-arm` | 16x32 | piece | Sofa armrest |
| `sofa` | 32x16 | piece | Sofa |
| `gallery-wall` | 48x48 | decor | Framed art wall |
| `guitar` | 16x48 | decor | Wall guitar |

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

- 2026-10-22: Plan: draw the six sprites from the photos (dark red-brown trestle table with teal microwave and coffee gear, mission-style sofa arm, red/teal patterned sofa, record stand with turntable, mixed-frame gallery wall, spruce acoustic guitar).
- 2026-10-22: Done, set to review.
  - Files: `art/src/{table,record-stand,sofa-arm,sofa,gallery-wall,guitar}.sprite` and matching PNGs in `public/sprites/`. Sizes exactly as in the table.
  - Checks: `npm run sprites` passes (no validation errors); viewed `art/contact-sheet.png` at 4x. Other batches are not merged yet, so I could not compare against their sprites.
  - Table: items sit in the top 16px above the slab, trestle legs and stretcher leave the space under it open. Sofa starts at row 1 (row 0 transparent), feet on the bottom edge.
  - Colours: used only the Materials table; sofa upholstery uses `b`/`g` on cream `a` (pattern accent, no new key). Gallery frames use `5`, `9`, `a`, `d`, `6` and `7` for silver, wood, gold and white frames.
  - Not checked: how the sprites look in the running game (the level is not drawn with sprites until issue 016); Marc's approval of the look. The record-stand turntable is small and dark at 1x.
