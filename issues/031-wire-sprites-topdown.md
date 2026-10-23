---
id: 031
title: Draw the top-down game with sprites
status: review
owner: claude
depends_on: [033]
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

- From the art logs: use the room-specific wall and doorway tiles (`-kitchen`, `-bath`) per room; `floor-kitchen` and `floor-bath`; `painting-wide`, `window` and `wall-front` names come from 033; the hood sits in the wall row below the stove; the sprites carry their own bounds, so place each at its map box top-left (see `scripts/main-room-mockup.mjs` and `scripts/room-mockup-kitchen-bath.mjs`).

## Progress log

- 2026-10-23: Plan: load the sprites in `main.ts`; `parseTileMap` works out each room's floor and wall tiles with `wallKind`/`wallTileName`; `Game` draws floor, walls, pieces (at the top-left of their bounds, sorted by bottom edge with the player), variants and the player from sprites, with the old rectangles as the fallback.
- 2026-10-23: Done, ready for review.
  - Level data: `parseTileMap` takes `floor` and `wallPieces` options and gives the `Level` a `floor` (sprite and tiles) and `walls` (tile, kind, wall sprite, doorway sprite for doors). Rooms without them (placeholder level, tests) are drawn as before. `doorwayName` added to `wall-tiles.ts`. `Piece` carries its placeholder `color`. The `BED MADE` / `DISHES n` / `CLEAN` labels are gone from the apartment data.
  - Drawing: `src/render/room-painter.ts` (`RoomPainter`, `drawFloorAndWalls`) wraps the sprite source; `Game` takes `options.sprites`. Floors, then wall tiles (a door's wall tile, then its doorway over it), then pieces/variants/player sorted by bottom edge of their bounds (stable; the player wins ties). Bounds are the sprite size for every piece and variant (checked with a script, no mismatches), so overhang rows sit inside the bounds and the sort uses the footprint's bottom edge. The `#` tiles with no wall kind (corners, bath block, filler) are not drawn; the background is ink when sprites are on.
  - Player: `src/render/player-sprite.ts` (`playerFrame`, `PLAYER_SPRITES`): idle by facing, `player-walk-<dir>-1/2` while a step is under way, foot alternating each step (`Player.stepsTaken`, new). Mirrors right for left only if the left file is missing.
  - Missing sprite: the old coloured rectangle (floor checker, dusk wall, piece colour, variant colour) and one `console.warn` per name, ever. Without a sprite source nothing is logged.
  - Test: `src/render/sprite-names.test.ts` checks every sprite named by floors, walls, doorways, pieces, variants and the player exists in `public/sprites` (the last open criterion of 025). `src/game/game-sprites.test.ts` covers draw order, variants per frame, walk frames, flip, doorway over wall, and the missing-sprite fallback and log-once. `src/render/player-sprite.test.ts` covers the frame choice.
  - Verification per criterion:
    - Tiles and pieces, overhang, draw order: rendered real frames of main (bed made and unmade), kitchen (dishes 0 and 3), bath, and the player behind/in front, with a fake raster canvas that decodes the real PNGs from `public/sprites` (harness kept outside the repo) and looked at the images. Walls match `docs/floor-plan.md`, no grey bands, hood under the stove, fridge in the corner, doors show doorways. Unit tests pin the draw order.
    - Variants: bed made/unmade and dishes 3/0 frames looked at; test flips `dishes` and checks the sprite changes each frame.
    - Player: unit and Game tests for idle, walk-1/2 alternating, and flip; walk frame seen in a rendered frame. Not viewed animating.
    - Missing sprite: rendered the kitchen with stove, fridge, floor, wall-back, a doorway and the dishes removed and looked at it (rectangles in place); test shows one warning per name over several frames.
    - Doors and labels: existing door and task tests still pass; prompts and HUD are untouched and appear in the rendered frames.
    - `npm test` (549 pass) and `npm run build` pass.
  - Not checked: how it looks and feels in a real browser (the fake canvas does not do image smoothing or scaling); the walk animation moving; the sprite loading path (`Sprites.load` against the dev server) was not exercised.
  - Out of scope, left alone: the doing-pose sprites (`player-sit-sofa` etc.) are not drawn (activity work); `scripts/*mockup*.mjs` still use their own wall logic.
