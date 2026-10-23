---
id: 007c
title: "Furniture sprites: Kitchen, west half: entry step, bin, stove and counter"
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
| `tote` | 16x16 | piece | Tote bag and shoes |
| `bin` | 16x32 | piece | Trash bin |
| `stove` | 48x48 | piece | Stove |
| `counter` | 32x48 | piece | Counter and sink |
| `window-curtain` | 32x64 | decor | Curtained window |
| `hood` | 48x32 | decor | Range hood and cabinet |

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

- 2026-10-22: Started. Plan: draw the six sprites from the kitchen photos, validate with `npm run sprites`, check the contact sheet.
- 2026-10-22: Done, ready for review. Drew `tote`, `bin`, `stove`, `counter`, `window-curtain`, `hood` (art/src/*.sprite + public/sprites/*.png). Palette only, ink outline, top-left light, Materials table followed (steel 5/6/4 on the stove, black plastic 3/4/2 for bin, tote and granite, light wood 9/a/8 for cabinets). Palette notes: granite top uses black-plastic tones (3/4/2); the dish towel uses `a` (cream), the paper cup `a`, the bin bag `5/6/4`; none needed a new colour. Counter top slab is at row 6 with the dish pile and faucet rising above it; stove and bin tops sit near the top edge so the player stands on the visible surface. Checked: `npm run sprites` (no errors), contact sheet viewed at 4x, `npm run build` passes. Not checked: how they look in-game next to other batches (none merged) or in a browser.
