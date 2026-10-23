---
id: 020
title: Top-down floor plan of the apartment
status: review
owner: marc + agent
depends_on: [019]
---

## Goal
Re-plan the real apartment as top-down tile maps. The side view forced the sofa and the table, desk, shelf and bed into one squeezed lane. A top-down plan can keep the real arrangement: which wall things are on, how rooms connect. Sizes are game-scaled in the Pokemon way (the character is one tile, furniture is two or three), not real-scaled.

## Acceptance criteria
- A decision with Marc, recorded in `docs/floor-plan.md`: rooms as separate screens joined by doorways (the Pokemon way, preferred) or one connected scrolling map; the tiles-per-foot or other scale used and why; how big each room is in tiles.
- Maps for the main room, kitchen and bath: floor, walls, doorways, furniture footprints in tiles (which wall each piece is on and which way it faces), and a spawn point. Preserve the real arrangement; use the inventory in the earlier floor plan (git tag `side-view-prototype`, `docs/floor-plan.md`) and the photos in `reference-photos/` (read from the main checkout by absolute path; never commit them).
- Interaction spots: for each task, the tile to stand on and the object tile to face. Spots for "working from different places" (couch, desk, bed) are first-class: the same task may be offered at more than one spot.
- Doorways: walking through one moves the player to the next room, with the spawn tile and facing set; test that every doorway pairs up both ways.
- Data in the format from 019, with the conversion in one place and unit tested. A walkable-path test (BFS over the tile map) proves every interaction spot is reachable from the spawn, through doors, and that no furniture blocks a doorway.
- Placeholder art (rectangles or the existing sprites where they still make sense) until the art issues land; the data refers to sprite names from the art spec (025).
- Task text only uses characters the font has, checked by a test over the real data.
- Marc reviews and signs off the layout, as with the first floor plan.

## Things the 019 review found that this issue must handle
- **L-shaped objects.** `parseTileMap` makes one task zone from the rectangle around an object's tiles, so for an L-shaped counter or sofa the empty notch tile is usable too (facing the notch from the floor starts the task). Fix it: a zone should be exactly the tiles of the object (a list of tiles, or per-tile zones), and the real plan has L-shaped pieces. Add a test.
- **Doorways need the game to switch rooms.** `Game` takes one level for its life and builds its `Grid` once. Add a way to move the player to another level (load a level, set the spawn tile and facing), keeping score, combo, popups, events and layers, and test it.
- **Tile-map hardening, since this issue leans on it:** a legend entry for `#`, `.` or `@` is silently ignored (reject it); a bad `color` name silently falls back (reject it); CRLF input gives a confusing error (accept or explain it); a spawn on a wall or a size that is not a whole number of tiles is not validated; a very large single object can overflow the stack in `boundingRect`.

## Photo handling
Same rules as before: photos stay in `reference-photos/` (gitignored); the repo gets text and sprites only, and nothing that identifies an address.

## Progress log
- 2026-10-23: Started. Marc decided: rooms are **separate screens** joined by doorways, **1 tile = 1 ft**, furniture to scale. Marc's corrections to my first layout sketch: the main room is mirrored left to right (kitchen door at the west end, bed at the east end), the kitchen is turned 180 degrees, and the bath is turned 90 degrees clockwise and sits south of the kitchen. Plan: per-tile task zones (fixes the L-shape bug), a way for `Game` to switch levels, tile-map hardening, three room maps in `src/game/apartment.ts` with doors, a walkable-path test across rooms, and `docs/floor-plan.md` rewritten for the top-down plan.
- 2026-10-23: Ready for review. Branch `issue/020-topdown-floor-plan`, worktree `../life-worktrees/020-topdown-floor-plan`.
  - **Added:** `src/game/apartment.ts` (three room maps, legends, doors), `src/game/plan-checks.ts` (`taskSpots`, `reachablePlaces` across doors, `doorProblems`), `src/game/level.ts` now holds `Level` plus `Door`, `Piece` and `validateLevel`; tests `apartment.test.ts`, `level.test.ts`, more in `tilemap.test.ts`, `game.test.ts` ("Game rooms", "L-shaped objects"), `camera.test.ts`, `grid.test.ts`. `docs/floor-plan.md` rewritten.
  - **Changed:** `Interactable.zone` is now `zones: Rect[]`, one per tile of the object (fixes the L-shape bug). `parseTileMap(rows, legend, { tasks, id, facing })`: a legend entry offers task ids from `TASKS` (several per object; the same id on several objects is how "work from the desk, sofa or bed" is done). Doors and wall objects (window) are legend entries. `Game(level, rooms)` plus `loadLevel(level, col, row, facing)`; stepping on a door tile loads the room and emits a new `room` event; `Player.placeAt`, `InteractionSystem.setItems`, `Camera.setWorld`. `Camera` now centres a room smaller than the view sideways and sits it at the bottom (HUD strip above); before, it pinned it top-left. `Grid` is built by marking the tiles of each solid (it was tiles x solids). `main.ts` starts in the apartment.
  - **Hardening done:** legend `#` `.` `@` or multi-character keys rejected; unknown colour rejected; unknown task id rejected; CRLF accepted; non-text rows give a clear error; `validateLevel` checks size is whole tiles, spawn on the tile grid and on open floor, doors on open tiles (it also runs in `Game` and `loadLevel`); no more `Math.min(...)` spread, a 300x300 single object works.
  - **Removed:** `placeholder-level.ts` and its test (the apartment tests replace them).
  - **Criteria:**
    - Decision recorded in `docs/floor-plan.md`: screens, 1 tile = 1 ft, room sizes. Done, from Marc's answers.
    - Maps for main, kitchen, bath with walls, doorways, furniture footprints, which wall, spawn: done. Arrangement read from the photos and Marc's corrections (mirror, 180, 90 clockwise, south). **Not yet signed off by Marc.**
    - Interaction spots: derived by `taskSpots`; `work` has spots at desk, sofa and bed. Per-task examples in the doc. Test: every task has a reachable spot.
    - Doorways pair both ways: `doorProblems` test, with two negative tests (a broken arrival, furniture on the arrival tile). Game-level test walks through and back.
    - Walkable-path test: `reachablePlaces` BFS over all three rooms through doors; checks every door, every arrival tile and every task spot.
    - Data format from 019 with the conversion in one place and unit tested: `parseTileMap`.
    - Placeholder art with sprite names from the art guide: `sprite` per piece, kebab-case checked. Only `bed-made` and `sofa-td` exist in the art guide's samples; the rest are names for the furniture batches. I did not check that the files exist: this branch does not contain issue 025's sprites (025 merged to main after this branch started).
    - Task text only uses font characters: test over the real data (all rooms).
  - **Checks:** `npx tsc --noEmit`, `npm run build` and `npm test` pass (172 tests). I rendered all three rooms through a recording canvas into PNGs and looked at them (main and kitchen: furniture where intended, L-shaped sofa and counter, doors in the right walls). The bath PNG I did not view.
  - **Not checked:** how it feels to walk through a door in a browser (instant switch, no fade); whether the HUD overlaps anything at the real screen size; Marc's sign-off on the layout (the bookshelf as a divider, the 7x5 bed, window position, what is left out are listed in "Choices to review" in the doc).
  - **Notes for the planner:** 021 will conflict in `game.ts`, `interaction.ts` and `level.ts` (apartment state and walkable changes also need the grid rebuilt: `loadLevel` rebuilds it now, but nothing rebuilds it mid-room). 023/022 may touch `game.ts` too. The check that every sprite in the data exists (025's last criterion) is still open: after merging 025 and this, add it. Popups float in world coordinates and are kept across rooms, so one can briefly appear in the wrong place after a quick door. `README.md` layout line updated.
