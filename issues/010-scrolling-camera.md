---
id: 010
title: Scrolling camera
status: done
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

- 2026-10-22: **Review (independent): approve.**
  - `npm run build` passes; `npm test` 54 pass. I also wrote my own checks outside the repo (19 tests, not committed), all passing:
  - World size is data: pass. `Camera` takes `level.size` and `VIEW`; no hard-coded sizes. Narrower-than-view and exactly-view worlds pin to 0, never -0.
  - Horizontal follow, clamp, smoothing, whole pixels: pass. 5 seeds x 8000 frames of random controls on `APARTMENT_LEVEL` (plus holding right/left 20 s, hopping right to the far wall at x=550 and idling): the player body was fully inside the view at alpha 0, 0.5 and 1 on every frame, and the camera stayed in `[0, world - view]` (reaches 240 at the far wall). Dead-zone boundary: no move at exactly `deadzoneX`, moves at +1. Steady state settles with the target at the dead-zone edge. dt = 0 leaves it unchanged, dt = 0.25 stays finite and does not overshoot. Corners via `snapTo` clamp correctly. 1/60 and 1/30 steps agree within 0.01 px.
  - Vertical: pass. Fixed at 0 when the world fits (apartment is exactly the view height); follows when taller (author's test, and my corner checks).
  - World through camera, HUD in screen space: pass. A recording canvas shows one integer `translate` per frame, the HUD and the background drawn with no translate, and the HUD after all world and UI drawing. The player and a solid keep a constant relative offset while the camera is still easing (player stationary, 120 frames x 5 alphas, one distinct offset), so there is no jitter between the player and the furniture. During movement the player is drawn at its own rounded position and the translate equals `-camera.position(alpha)`.
  - World UI: pass. Swept 1287 prompt/progress boxes (player x/y grid at camera offsets 0 to 240): every one on screen and clear of `HUD_BOX`. Popups for every task zone right of x=200, at camera x 100/160/240, are centred on the zone centre minus the camera (clamped to 20..300) and at zone y.
  - Interpolation of the camera: pass. `position(alpha)` interpolates prev to current and rounds (also covered by the author's monotonic test).
  - Placeholder wide room and real room: pass (author's 640 px flat level test, and my runs on the apartment).
  - Tuning in `config.ts`: pass (`CAMERA`).
  - Scope: pass. Only `camera.ts`, `config.ts`, `game.ts`, `popups.ts`, two test files and this issue file changed. No other issues or `PLAN.md` edited. No reference photos or personal details.
  - Not verified: how the follow speed and dead zone feel in a browser (I did not run the dev server and the author did not either). Notes only, not blockers: the "Not checked in a browser" caveat stands; issue 014 should recheck popups near screen edges, as the author said.
  - Tell the planner: `PLAN.md` row 010 should be set to `done` (its table still says `todo`).
