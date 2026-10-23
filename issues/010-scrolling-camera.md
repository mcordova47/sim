---
id: 010
title: Scrolling camera
status: review
owner: claude
depends_on: [005]
---

## Goal
The real apartment (35 tiles wide in the 005 draft) is wider than the 20-tile viewport. Add a camera that follows the player so the whole room is playable. Decided with Marc: scrolling camera, not smaller tiles or a compressed room.

## Acceptance criteria
- World size is data (taken from the room), separate from the viewport size in `config.ts`.
- A camera follows the player horizontally, clamped so it never shows outside the room. Smoothed (a little lag or deadzone), and snapped to whole pixels when drawn so art doesn't shimmer.
- The vertical axis stays fixed if the room fits the viewport height; otherwise follows too.
- Render code draws world objects (solids, zones, player, later sprites) through the camera. HUD stays in screen space.
- Interpolation (`alpha`) is applied to the camera as well as the player so scrolling is smooth.
- Works with the placeholder room made wider than the viewport as well as the real room.
- Camera tuning (follow speed, deadzone) lives in `config.ts`.

## Notes
- This must land before the furniture sprites (007) so sprite sizes and the viewport are settled.
- Keep world-to-screen conversion in one place so 004's HUD and later particle effects use it too.

## Progress log
- 2026-10-22: Done, ready for review. Branch `issue/010-scrolling-camera`, worktree `../life-worktrees/010-scrolling-camera`.
  - Added `src/render/camera.ts` (`Camera`), a `CAMERA` block in `config.ts` (`followSpeed` 6 per second, `deadzoneX` 24, `deadzoneY` 16), `src/render/camera.test.ts` (9 tests), and 4 more tests in `game.test.ts` (camera scrolling, player kept on screen, draw order). `Game` owns a `Camera`, snaps it to the player at the start and updates it after the player each step. `Popups.draw` takes the camera origin so popups stay at their world position.
  - Criteria:
    - World size is data: the camera takes `Level.size` (added in 011) and the view size from `VIEW`.
    - Follows horizontally, clamped, smoothed, whole-pixel: it only moves once the player leaves a dead zone around the centre of the view, eases toward the target (exponential smoothing, so the feel doesn't depend on the step size; a test compares 1/60 and 1/30 steps), is clamped to `[0, world - view]`, and every draw uses one rounded camera offset.
    - Vertical: fixed at the top when the world fits (the apartment is exactly the view height); follows with the same logic when the world is taller (tested with a 400 px tall world).
    - World drawn through the camera, HUD not: `Game.render` does `save`, `translate(-cam)`, `drawWorld`, `restore`. World UI (prompt, progress bar) is laid out in screen space with the player's screen position, so it stays on screen and clear of the HUD; popups are converted from world to screen positions. The HUD draws last, with no transform. A test with a recording fake canvas checks this order.
    - Interpolation: the camera keeps its previous position and `position(alpha)` interpolates it like the player; a test checks it is monotonic and whole-pixel.
    - Placeholder wide room and the real room: tests use a 640 px wide flat level and the apartment level.
    - Tuning in `config.ts`: yes.
  - Checks: `npm run build` passes; `npm test` 54 pass (41 existing plus 13 new). I also rasterised the real apartment through a small fake canvas and looked at the frame at the spawn (camera x=93): HUD, the `[E] DOOMSCROLL` prompt over the player and the furniture silhouettes all render in the right places.
  - A test of mine failed first because it expected scrolling after only 1 s of walking; the player was still inside the dead zone, so that was a wrong test and not a camera bug (fixed the test).
  - **Not checked in a browser:** how the follow speed and dead zone feel. These are one-line tweaks in `CAMERA`.
  - Notes for the planner: the interim state from 011 is gone, since the whole 560 px apartment is now playable. The popup clamp in issue 014 now works in screen space (popup x is clamped after the world to screen conversion), so 014 should check popups near the screen edges again with the camera moving.
