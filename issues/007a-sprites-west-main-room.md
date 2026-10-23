---
id: 007a
title: "Furniture sprites: Main room, west: sleeping nook and work corner"
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
| `bed` | 64x32 | piece | Queen bed |
| `bookshelf` | 48x80 | piece | Cube bookshelf |
| `desk` | 48x48 | piece (one-way) | Standing desk |
| `window-blinds` | 32x64 | decor | Blinds window |
| `mic-stand` | 16x112 | decor | Mic and key light stand |

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

- 2026-10-22: Starting. Plan: view reference photos (converted copies kept outside the repo), draw the five sprites as text grids using a throwaway generator script kept outside the repo, render with `npm run sprites`, check the contact sheet.
- 2026-10-22: Done, ready for review.
  - Added `art/src/{bed,bookshelf,desk,window-blinds,mic-stand}.sprite` and rendered PNGs in `public/sprites/`. Sizes exactly 64x32, 48x80, 48x48, 32x64, 16x112.
  - Checked: `npm run sprites` passes; contact sheet viewed at 4x. No other batches are merged yet, so no side-by-side comparison; only the example `couch`/`coffee-mug` were next to them. `npm run build` not affected (no code changed).
  - Desk: top slab is the top 16px; legs only below, transparent between them.
  - Compromises: pieces' tops are the walking surface, so things that sit on top (bookshelf plant and vase, desk monitor, green lamp, chair tucked under the desk) are left out; the desk's riser drawer and the bookshelf's books/records/drawers carry the identity instead. Bed pillows are drawn on its face at the head (left), since the silhouette must stay flat-topped.
  - Materials: no colours outside the table needed. Black stand uses `4`/`3` (black plastic and metal row) with `5` highlights so it reads on the dark background.
  - Not checked: how it looks in the game (016 draws the level).
