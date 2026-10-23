---
id: 020
title: Top-down floor plan of the apartment
status: todo
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

## Photo handling
Same rules as before: photos stay in `reference-photos/` (gitignored); the repo gets text and sprites only, and nothing that identifies an address.

## Progress log
