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
- 2026-10-23: **Review** (independent, fresh agent). Verdict: **approve the code; status left at `review` because Marc's sign-off on the layout (a criterion) is not given and cannot be checked here.** Once Marc signs off the layout, this is done. No code changes are needed.
  - **Ran:** `npx tsc --noEmit`, `npm run build`, `npm test` (172 pass). Plus my own 47 checks in a scratch dir outside the repo (not committed), importing the branch source: all pass except the two minor findings below.
  - **Criteria:**
    - Decision recorded in `docs/floor-plan.md` (screens, 1 tile = 1 ft, room sizes): **pass** (read; test checks sizes 17x8, 11x8, 4x7).
    - Maps for main, kitchen, bath (walls, doorways, footprints, wall, spawn): **pass on structure** (read all three maps against the doc table: positions match). Whether the arrangement matches the real apartment: **can't verify** (Marc's call; I did not compare against the photos).
    - Interaction spots, `work` at desk, sofa and bed: **pass**. `taskSpots` gives spots; my own BFS (separate from `reachablePlaces`) walked all three rooms through the doors, reached every open floor tile, and every task id in `TASKS` has a reachable spot.
    - Doorways pair both ways: **pass**. `doorProblems` is empty; each door has exactly one open neighbour; I walked main to kitchen and back by key presses and by one huge `dt` frame; arrival tile and facing are right; holding the same key carries on, holding the opposite key returns once with no event loop; `step` is emitted before `room`; a held interact press does not start a task in the new room.
    - Conversion in one place, unit tested, BFS test, no furniture blocks a doorway: **pass**.
    - Placeholder art and sprite names: **pass** for names (kebab-case, checked). Existence of the sprite files: **can't verify** (025 not on this branch; the author said so too).
    - Task text uses only font characters: **pass** (test over real data uses the font's glyph set; I also checked the strings are printable ASCII).
    - Marc's sign-off: **can't verify / not given**.
  - **Findings of the 019 review:**
    - L-shaped objects: **pass**. Zones are exactly the tiles. On the real data the kitchen counter is exactly 5 tiles, the sofa's notch row has no zones, and facing the counter's empty corner from the floor gives no task (driven through `Game`).
    - Room switching: **pass**. `loadLevel` keeps score, cooldowns, events and layers; it rebuilds the grid, items, player, camera and clears `nearby`. A switch mid-step cancels the step with no `step` event and no slide. A switch mid-task leaves the task running (locked in the new room) and it finishes and scores. A bad arrival tile throws before any state changes. An unknown door target throws a clear error.
    - Hardening: **pass with one gap**. `# . @` and multi-character keys rejected; unknown task id, colour and CRLF handled; bad rows and a non-array give errors; spawn and size validated (`validateLevel`, also run by `Game`); a 400x400 object parses (no stack overflow).
  - **Grid rewrite:** **pass**. 3000 random layouts (aligned, 1px, 0.001px and free-float positions, negative and past-the-edge, oversized) match the old brute force for every tile. One degenerate difference: a zero-width or zero-height solid used to block the tile it sat in; the new code ignores it. Not reachable from tile maps.
  - **Camera:** **pass**. Every room is centred sideways and bottom-aligned, fits in the view, stays put while the player walks, and snaps cleanly on a room change (no interpolation slide). Worlds larger than the view, exactly the view, wider-but-shorter, and odd sizes still clamp and follow.
  - **Minor findings (not blocking):**
    - Colour check uses `def.color in COLOR`, so `toString`, `constructor` and `hasOwnProperty` pass as colours (it would then draw with a function as fill). Use an own-property check.
    - A legend entry with `door` and `tasks` silently drops the tasks.
    - `loadLevel(level, 1.5, 2, ...)` is accepted (`isBlocked` reads `undefined` for a fractional index). Internal only.
    - The main room and kitchen are 160px tall, so the 38px HUD box overlaps their top wall row by 6px at the far left (wall only, nothing usable). The bath leaves 48px. Check by eye in a browser.
    - `docs/floor-plan.md` says the gallery wall is "above the sofa"; it is in the near (south) wall, behind it. Wording only.
  - **Scope, conventions, privacy:** only the 020 issue file changed under `issues/`, `PLAN.md` untouched; changes are within the issue's scope (README layout line and docs included). No photos or address-like text in the diff. Tuning and rules are in data.
  - **Merge note for the planner:** the branch is based on an older main. `git merge-tree` against current main (with 021 and 018 merged) conflicts in `game.ts`, `grid.ts`, `interactable.ts`, `interaction.ts`, `level.ts`, `tilemap.ts` and others, and the branch deletes `placeholder-level.ts`, which 021 edited. Main's `Grid` has `setSolids`, which this branch's `Grid` rewrite does not have. The author should rebase or merge main and re-run tests before the merge, or the planner should resolve it. After that, re-check that 021's state (walkable changes, rebuilt grid) works with `loadLevel`.
  - **Unverified:** how walking through a door feels in a browser (instant switch, no fade); the HUD overlap above; Marc's sign-off; sprite files named in the data.
- 2026-10-23: Marc sent a hand-drawn sketch of the real layout (not to scale). Rebuilt the three maps from it: the main room has the table, desk with chair, a 1x4 bookshelf divider, a 5x6 bed with the nightstand, radiator and windows on the east wall, one lane around the bed, the sofa on a south wall that steps down toward the (decorative) front door, and a two-tile passage to the kitchen in the west wall between the table and sofa. The kitchen is an L (11 wide bar with sink, counter and stove against its south wall, a 4x4 leg with the fridge); the bath (7x4) is under the bar and opens into the leg. Also fixed the review's minor findings: colour check uses `Object.hasOwn`, a door that offers tasks is rejected, `loadLevel` rejects fractional tiles, and the doc no longer calls the gallery wall "above the sofa" (the gallery wall is dropped; the sketch has the south wall behind the sofa). Kept: all the code from the first round.
  - Checks: `npx tsc --noEmit`, `npm run build`, `npm test` (173) pass. The same walk-through test now covers the two-tile passage and the L kitchen: every door, arrival tile and task spot is reachable from the start. I rendered all three rooms and compared them with the sketch.
  - Not checked: Marc's sign-off on the new layout; door feel in a browser; sprite file existence (025 is not on this branch).
  - Merge note (from the first review): this branch is based on an older `main`; merging will conflict with 021 and 018 (`Grid.setSolids`, `game.ts`, `level.ts`, `interactable.ts`...). I did not merge or rebase; that is for the planner.

