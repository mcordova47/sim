---
id: 008
title: Player character sprite
status: done
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

- 2026-10-22: **Review: changes needed.**
  - Checks run (own script, scratchpad `chk.py`/`big.py`, plus a 12x zoom strip of all 8 frames): all 8 `.sprite` files are exactly 16x16 with 16 rows of 16 chars; all PNGs are 16x16 RGBA; `npm run sprites` is idempotent (no diff in PNGs after re-render); `npm run build` and `npm test` (29) pass. Every frame has the identical bounding box cols 3-12, rows 2-15, so the body stays in the same place across frames and matches the 10x14 hitbox in `src/game/config.ts`. Head rows 2-7 are identical in all frames, and the figure is horizontally symmetric in its footprint (cols 3-12), so flipping within the 16px cell needs no offset. Palette use is only `1 3 7 a h i`, all in the style guide and matching its material roles; no semi-transparent pixels; filenames are kebab-case and match the guide's `<name>-<n>` pattern. All frames read as one character at zoom. No out-of-scope files changed; no reference-photo or personal data.
  - Criterion 1 (frames for idle, walk x4, jump, fall, task): **fail on walk, rest pass.** idle, jump, fall and task are present and visually distinct. But the four walk frames are not a real 4-frame cycle: `player-walk-3` is pixel-identical to `player-idle`; `player-walk-1` differs from idle by 1 pixel (one shoe pixel) and from walk-3 by 1 pixel; walk-1 and walk-2 differ by 3 pixels. Only walk-2 (gap between legs) and walk-4 (shoe widened on the left) are visibly different poses. Played as 1-2-3-4 this reads as stand, step, stand, step, and the arms and torso never move, so it will not look like walking.
  - Criterion 2 (facing by flipping in code): **pass for art** (drawn facing right, body symmetric in the cell, anchor documented). The code that does the flip does not exist yet (issue 016), so the flipping itself is **can't verify**.
  - Criterion 3 (document what's missing for external art): **pass** (the log notes the art is small and simple, and the replacement constraints: filenames, 16x16, same body position).
  - Unverified: how the animation feels in a browser (not wired in; issue 016). Walk timing and the jump/fall arm poses are also not judged in motion.
  - Changes needed:
    - [ ] Redraw walk-1..walk-4 so they form a distinct cycle: no frame identical to idle or to another walk frame, with a visible contact/passing pose on each side (for example, alternate which leg forward, plus a 1px body bob or arm swing). Keep the body at cols 3-12, rows 2-15 and palette-only colours, then re-run `npm run sprites`.
    - [ ] Optional: make jump arms read as "up" more clearly (currently only 2px beside the torso, similar to fall).

- 2026-10-22: Round 2, addressing review (changes needed).
  - [x] Redrew walk-1..4 as a real cycle: walk-1 and walk-3 are opposite wide-stride contact poses with opposite arm swing; walk-2 and walk-4 are different passing poses. Verified in the generator that no two frames are pixel-identical (walk-3 is no longer idle).
  - [x] Fall now has arms out to the sides at hip height, distinct from jump (arms up at shoulder height).
  - Contact sheet re-viewed. Build passes. Still unverified: motion feel in a browser (issue 016).

- 2026-10-22: **Review round 2: approve.**
  - Own checks (scratchpad `r2.py`, stdlib-only PNG decoder, plus a 12x zoom strip of all 8 frames, viewed): all 8 `.sprite` files are 16 rows of 16 chars; all PNGs are 16x16 RGBA; PNG transparency matches the source `.` cells exactly; alpha is only 0 or 255; the bounding box is cols 3-12, rows 2-15 on every frame (matches the 10x14 hitbox); PNG colours are only the six palette hexes for keys `1 3 7 a h i`. `npm run sprites` leaves a clean tree; `npm run build` and `npm test` (29) pass.
  - Pairwise distinctness (pixel differences between `.sprite` files, all 28 pairs): no pair is identical. Smallest gaps are idle vs walk-2 / walk-4 (4 px) and walk-2 vs walk-4 (4 px, the arm swap); walk-1 vs walk-3 is 16 px, and the stride poses differ from the rest by 22-28 px. Prior-round failure (walk-3 == idle) is fixed.
  - Criterion 1 (idle, walk x4, jump, fall, task): **pass.** At zoom, walk-1 and walk-3 are opposite wide-stride contact poses with opposite arm swing, walk-2 and walk-4 are passing poses; cycle reads as stride, pass, opposite stride, pass. Fall (arms out low) is now distinct from jump (arms at shoulder height); task has hands together in front.
  - Criterion 2 (flip in code): art side **pass** (drawn facing right, footprint cols 3-12 symmetric in the cell, anchor documented). The flip code does not exist yet (issue 016), so the code side is **can't verify**.
  - Criterion 3 (document missing quality for external art): **pass** (progress log gives the limits and the filename/size/body-position constraints for replacement).
  - Unverified: animation feel in a browser (wiring is issue 016); walk frame timing.
  - Non-blocking notes: walk-2 and walk-4 are near-identical (4 px, arms only), so the passing poses give little variation; jump arms read as "arms at sides, slightly out" rather than clearly "up". Both are polish for Marc or an external-art pass.
  - Scope: only art/src player sprites, rendered PNGs and this issue file changed; no PLAN.md or other issues touched; no reference-photo or personal data. The planner should update the PLAN.md table to done.
