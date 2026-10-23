---
id: 028
title: Top-down art: main room
status: todo
owner: agent
depends_on: [020, 025]
---

## Goal
Draw every top-down piece in the main room, to the rules in `docs/art-style.md` and the sizes the floor plan uses (`src/game/apartment.ts`, `docs/floor-plan.md`). The room is seen from the sofa side: far-wall pieces front-on, the sofa from behind.

## Pieces (name, size in tiles, 16 px each)
- Far wall, front-on: `table` 4x2 (mug and kettle on top), `desk` 4x2 (standing desk, laptop), `desk-chair` 1x1, `bookshelf` 1x4 (cube shelf, stands out from the wall as a divider), `nightstand` 3x1, `bed-made` 5x6 and `bed-unmade` 5x6 (same footprint, redo the duvet pattern from the photos), `radiator` 1x4, `painting` 2x1 and 3x1 (three on the north wall: 2x1 over the table, 2x1 over the desk, 3x1 over the nightstand), `window-blinds` 1x2 (east wall; check the room map for which window has blinds).
- Near wall: `sofa-td` 6x2 (from behind, redraw from photos), `guitar` 1x2, `lamp-table` 1x1, `record-stand` 1x1, `front-door` 2x1.
- Tiles missing from the tileset for this room, if any (floor, rug, wall pieces the map uses). Check what `src/game/apartment.ts` names against `art/src`.

## Acceptance criteria
- Each sprite above exists in `art/src/` with exactly that name and size, passes `npm run sprites`, and uses only palette colors.
- Reuse the side-view sprite where the audit table says reuse or adapt; delete a side-view sprite from `art/src` once its top-down replacement exists and nothing refers to it.
- A contact sheet and a room mockup of the main room (extend `scripts/room-mockup.mjs` or add a script) that Marc can look at. Describe how to view them in the log.
- `bed-made` and `bed-unmade` are clearly different at a glance at 1x.
- The photos in `reference-photos/` are read by absolute path from the main checkout and never copied into the repo, and no sprite contains anything identifying (no addresses, no readable text from mail, books or screens).
- `npm test` and `npm run build` pass.

## Notes
- Marc may add photos (sofa front, back and from above; bed from above; far-wall pieces straight on). Use what is there and list what a better photo would improve.
- Do not wire the sprites into the game; that is issue 031.

## Progress log
