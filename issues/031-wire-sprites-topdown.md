---
id: 031
title: Draw the top-down game with sprites
status: todo
owner: claude
depends_on: [028, 029, 030]
---

## Goal
Replace the colored rectangles and labels with the sprites: floors and walls, furniture drawn by its piece bounds, state variants, and the player in four directions.

## Acceptance criteria
- Level tiles draw from the tileset; pieces draw their `sprite` at `Level.pieces` bounds, with overhang rows over the tile behind. Draw order is by the bottom edge of the footprint (the player stands behind a piece below them and in front of one above).
- Variants (`bed-made`/`bed-unmade`, `dishes-0..3`) draw from the state each frame.
- The player draws from `player-<state>-<dir>[-n]`: idle, and a two-frame walk synced to the step, flipping right for left if left is not drawn.
- A missing sprite falls back to the old colored rectangle and logs once, not every frame.
- A test checks every sprite named in level data exists in `public/sprites` (the last open criterion of issue 025).
- Doors, and anything in the dev build that was a label, still work. `npm test` and `npm run build` pass; Marc plays it.

## Notes
- Placeholder labels for state variants (`BED MADE`, `DISHES 3+`) go away once the sprites show the state.

## Progress log
