---
id: 008
title: Player character sprite
status: review
owner: agent
depends_on: [006]
---

## Goal
A player character with enough animation to feel alive.

## Acceptance criteria
- Frames for idle, walk (4 frames), jump, fall and "doing a task".
- Facing left/right handled in code by flipping, not by separate art.
- If hand-drawn quality isn't good enough, document what's missing so Marc can use an external tool, keeping the same frame sizes and filenames.

## Progress log

- 2026-10-22: Starting. Plan: 8 frames of 16x16 (idle, walk 1-4, jump, fall, task), body 10x14 matching the hitbox, drawn facing right.
- 2026-10-22: Done, ready for review.
  - Added `art/src/player-{idle,walk-1,walk-2,walk-3,walk-4,jump,fall,task}.sprite` and rendered PNGs in `public/sprites/`. No code changes (wiring into the game is issue 016).
  - **Draw anchor for 016:** each frame is 16x16 with the 10x14 body at cols 3-12, rows 2-15. Draw at `(player.x - 3, player.y - 2)`. Frames face right; flip horizontally when `facing === -1`, mirroring around the hitbox centre (flip within the 16px cell, since the body is centred in it, so no offset change is needed).
  - Palette use: hair `7`, skin `a`, shirt `h` with `i` highlight, trousers `3`, shoes/outline `1`. Nothing outside the style guide.
  - Checked: `npm run sprites` passes; contact sheet viewed (all 8 frames read as the same character; walk frames differ in leg position; jump has arms up, fall arms out, task has hands together in front). `npm run build` and `npm test` pass.
  - Not checked: how the walk cycle feels in motion in a browser (no wiring yet; frame timing is 016's call). The art is small and simple (hand-placed pixels); Marc may want to replace it with external art. Any replacement must keep the same filenames and 16x16 frame size with the body in the same position.
