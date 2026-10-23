---
id: 028
title: Top-down art: main room
status: done
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

- 2026-10-23: Started in worktree `../life-worktrees/028-art-main-room`. Plan: look at reference photos, draw the pieces as `.sprite` files by script-assisted generation where patterns repeat, extend `scripts/room-mockup.mjs` with a main-room mockup built from the level data, view the contact sheet and mockup, then verify and review.
- 2026-10-23: Drawn, ready for review.
  - Sprites (in `art/src/`, sizes checked against the list): `table` 64x32, `desk` 64x32, `desk-chair` 16x16, `bookshelf` 16x64, `nightstand` 48x16, `bed-made` and `bed-unmade` 80x96, `radiator` 16x64, `painting` 32x16, `window-blinds` 16x32, `sofa-td` 96x32, `guitar` 16x32, `lamp-table` 16x16, `record-stand` 16x16, `front-door` 32x16.
  - **Extra names I had to add** (the list gave one name for two sizes, or the map uses a piece the list leaves out): `painting-wide` 48x16 (the 3x1 over the nightstand; `painting` is the 2x1), `window` 16x32 (the upper east window has no blinds; `apartment.ts` gives both `w` and `W` the `window-blinds` sprite), `wall-front` 16x16 (the near, south wall seen from above; the tileset had no tile for it). For 031: point `u` at `painting-wide` and `w` at `window`, and use `wall-front` for the south wall. Corner and solid-filler tiles are not drawn; the map's `#` filler needs a decision in 031 (the mockup uses `wall-front`).
  - Redrawn: `sofa-td` (from behind: seat cushions above, wooden back rail and fabric panel facing the player, wooden arms; red and teal pattern from the photo) and `bed-made` (cream striped duvet, white and striped pillows, buttons, turned-down sheet). `bed-unmade`: same footprint, crooked pillows, sheet thrown back in a triangle, diagonal wrinkles, so it differs at a glance at 1x. `guitar` adapts the side-view sprite (neck trimmed to 32 rows).
  - Deleted side-view `bed` and `sofa` (replaced; nothing in `src` or `scripts` names them). The other side-view sprites stay for 029, 030 and sprites the main room does not list (`sofa-arm`, `mic-stand`, `gallery-wall`).
  - Tooling: new `scripts/main-room-mockup.mjs` reads `MAIN_MAP` and the sprite names from `src/game/apartment.ts` and composes the whole room (bed made and unmade) at 4x. Added `art/main-room-mockup*.png` to `.gitignore`.
  - **To view:** `npm run sprites -- --sheet=table,desk,bookshelf,nightstand,bed-,radiator,window,painting,sofa-td,guitar,lamp-table,record-stand,front-door,wall-front` then open `art/contact-sheet.png`; `node scripts/main-room-mockup.mjs` then open `art/main-room-mockup.png` and `art/main-room-mockup-unmade.png`.
  - Checked: `npm run sprites` (51 sprites, palette-only enforced), `npm test` (375 pass), `npm run build`; looked at the contact sheet and both mockups.
  - Not checked / limits: the mockup puts every piece at its map box top-left, which is what 031 should do but is my reading of it. Pieces are small-scale impressions, not photo matches. Sprites contain no text or identifying detail (paintings are abstract colour blocks, not the real artworks). A top-down photo of the sofa back and the bed would improve those two; the radiator, windows and nightstand were drawn from the map and photo glimpses.
- 2026-10-23: **Review (independent): APPROVE.**
  - Sprites exist with exact names and sizes: pass. Own script checked every name in the issue plus the three extras (`painting-wide`, `window`, `wall-front`): `.sprite` size line, row count, row length and the rendered PNG header all match the tile sizes. `npm run sprites` rendered 51 sprites, palette-only enforced by the pipeline; every row uses only palette keys.
  - Side-view reuse and deletion: pass. `bed` and `sofa` deleted (sprite and png); grep of `src`, `scripts`, `docs`, `art`, tests finds no reference to them. Remaining side-view sprites kept for 029/030 as logged.
  - Contact sheet and mockups: pass. Regenerated with the commands in the log and viewed `art/contact-sheet.png`, `art/main-room-mockup.png`, `art/main-room-mockup-unmade.png`. The mockup script reads `MAIN_MAP` and sprite names from `src/game/apartment.ts`, ran clean with no "missing sprite" lines, and the placement matches the map (paintings over table, desk and nightstand; radiator and blinds window on the east wall; sofa at the near wall; door at the bottom).
  - Bed made vs unmade: pass. Made is a symmetrical striped duvet with two pillows and buttons; unmade has crooked pillows, a diagonal thrown-back sheet and wrinkles. Clearly different at 1x footprint (80x96) and in the 4x mockup.
  - Photos and identifying content: pass. Nothing under `reference-photos/` is in the diff; the diff outside `art/src`, `public/sprites` is only `.gitignore`, the issue file and `scripts/main-room-mockup.mjs`. Viewed sprites: paintings are abstract colour blocks, screens are bars, record stand and shelf have no readable text.
  - `npm test` (375 pass) and `npm run build`: pass.
  - Scope: no PLAN.md or other issue edits, game code not touched (wiring left to 031).
  - **Unverified (not judged here):** how the art feels to Marc, and how closely each piece matches the real furniture. The reference photos were not compared against the sprites.
  - Notes for 031 (not failures): `apartment.ts` still names `painting` for `u` and `window-blinds` for `w`; 031 must switch them to `painting-wide` and `window` as the author logged. The `#` filler renders as `wall-front` blocks in the mockup (heavy grey bands along the south edge); needs a decision. The east windows are narrow slivers at 1x.
