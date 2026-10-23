---
id: 016
title: Draw the level and player with sprites
status: todo
owner: claude
depends_on: [007, 008, 010, 011]
---

## Goal
Replace the coloured rectangles with the real art: furniture, decor and the player, drawn from the sprite pipeline.

## Acceptance criteria
- Every piece and decor entry in `room.ts` is drawn with its sprite (`sprites.draw`) at the right position, behind the player; missing sprites still show the labelled fallback rectangle.
- Decor draws behind the furniture and pieces in a sensible order (walls, decor, furniture, player, then UI).
- The player is drawn from the sprite frames from issue 008 (idle, walk, jump, fall, task), flipped in code for facing left, with the frame chosen from the player's state.
- Sprites are drawn through the camera from issue 010 and snapped to whole pixels.
- Sprites are loaded before the first frame (or the game shows the fallback until they arrive) without errors in the console.
- Interactable zones stop being drawn as translucent rectangles (or are behind a debug flag).
- The two example sprites from issue 006 (`couch`, a blue sofa that clashes with the real red and teal one, and `coffee-mug`) are removed from `art/src/` and `public/sprites/` once the real art is wired in, unless a test still uses them.
- Tests cover the draw order and the frame-selection logic without a browser.

## Progress log
