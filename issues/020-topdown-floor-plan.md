---
id: 020
title: Top-down floor plan of the apartment
status: todo
owner: marc + agent
depends_on: [019]
---

## Goal
Re-plan the real apartment as top-down tile maps. The side view forced the sofa and the table, desk, shelf and bed into one squeezed lane. A top-down plan can keep the real arrangement: which wall things are on, how rooms connect. Sizes are game-scaled in the Pokemon way (the character is one tile, furniture is two or three), not real-scaled.

## View orientation (Marc, 2026-10-23)
The main room is seen from the sofa side, looking toward the table, desk, bookshelf and bed wall: the sofa is on the near (bottom) wall and the other pieces are along the far (top) wall. Pieces on the far wall are drawn front-on, which is how most of the reused side-view sprites were already drawn; the sofa is seen from behind and above. Agree the same kind of orientation for the kitchen and the bath with Marc, and record which wall each piece is on in `docs/floor-plan.md`. Marc may take more photos (sofa, bed and other pieces) for the furniture art; ask which views would help.

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
