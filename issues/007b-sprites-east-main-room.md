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
- 2026-10-22: Review (independent reviewer): **changes needed**.
  - Checked: `npm run build`, `npm test` (29 pass) and `npm run sprites` all pass; re-rendering leaves `git status` clean (PNGs match sources). Own script (outside the repo) decoded every PNG and compared it to its `.sprite`: sizes exactly 48x32, 16x48, 16x32, 32x16, 48x48, 16x48; every pixel is a palette key with one hex per key; alpha only 0 or 255; each PNG matches its source pixel for pixel. Only the six sprites, this issue file changed (no edits to other issues, PLAN.md, art-style, palette or room.ts). No photos or address in the repo. Compared by eye against the reference photos: dark red-brown table with teal microwave and coffee gear, red/teal sofa with mission arm, spruce guitar and mixed frames all read as the real pieces.
  - Criteria: sizes/names/PNGs **pass**; palette only **pass**; recognisable and readable at 1x **pass**; materials table **pass** (dark wood 8/9/7, light wood 9, red/teal accents; no new colours); light from top-left **pass** (visual check); base on bottom edge **pass**; `npm run sprites` **pass**; no contact sheet or other batches' files committed **pass**.
  - **Fail: 1px ink outline around the outside of every object.** An automated check for non-ink pixels that touch transparent pixels found:
    - `table`: the stretcher has no bottom outline (row 25, x 7 to 38, `7` over transparent). Also a stray `5` pixel pair at x45, y7 to 8 outside the outline.
    - `sofa-arm`: the bottom rail has no outline (row 30, x 4 to 11 are `8` over transparent).
    - `guitar`: the neck rows 7 to 21 is 2px wide `7`/`8`/`5` with no ink outline (head and body are outlined).
    - `record-stand`: cables (x7 to 8, y14 to 21) and the record sleeves (rows 29 to 33, `b` and `4`) have no outline.
  - **Fail (partial): nothing important touches the box edge.** `guitar` head and the small hook shape at x12 to 14 touch the top row (y0, 7px); `gallery-wall` frames touch the top row (9px) and right column (15px) with no neighbour there. (`table`, `record-stand`, `sofa-arm` and `sofa` touch edges only where they meet neighbours.)
  - **Judgement, please decide:** `table` under-space is open between the trestle legs except a full-width stretcher at rows 23 to 25, right at the height of a 14px player standing on the floor, so the player visually walks through it. If intended, say so in the log; otherwise lower or thin it. Also the collision surface is the top of the box (`room.ts`: the one-way slab is one tile at the top), so art tops below row 0 make the player float over it: `record-stand` top is at row 3 (3px), `sofa` at row 1 (1px), `table` slab at row 10 (the clutter above it is what the player stands on). `sofa-arm` is flush at row 0. Make the flush-vs-gap choice consistent or note why.
  - Checklist for the author:
    - [ ] Add the missing ink outlines: table stretcher bottom, sofa-arm bottom rail, guitar neck, record-stand cables and records; remove or outline the stray `5` pixels on the table (x45, y7 to 8).
    - [ ] Keep the guitar head/hook and gallery-wall frames off the top and right edges of the box (or justify in the log).
    - [ ] Decide on the table stretcher and the 1 to 3px tops on record-stand and sofa, and note the decision.
    - [ ] Re-run `npm run sprites` and view the sheet again.
  - **Unverified** (cannot be checked here): how the sprites look in the running game (the level is not drawn with sprites until 016); Marc's approval of the overall look; comparison with other batches (none merged).
- 2026-10-22: Round 2, addressing the review checklist (all ticked).
  - [x] Outlines added: table stretcher and jar, sofa-arm bottom rail, guitar neck (4px incl. outline), record-stand cables (ink lines) and record sleeves, guitar tuning pegs and body top/bottom. Own check (non-ink pixel next to transparent, 4-neighbour) now reports 0 for all six sprites.
  - [x] Box edges: guitar head starts at row 1 and the hook is removed; gallery-wall frames moved off the top row and right column.
  - [x] Table stretcher moved down to rows 28 to 31, so a 14px player standing on the floor clears it (top of player at row 18, slab bottom at row 15).
  - [x] Flush tops: record-stand turntable now starts at row 0 and the sofa outline at row 0, matching the sofa-arm. The table's standable surface is the top of the clutter at the box top; the slab is at row 10 by design (items sit on it within the one-way top tile).
  - `npm run sprites` passes; contact sheet viewed at 4x. Still not checked: in-game look, Marc's approval, comparison with other batches.
