---
id: 010
title: Scrolling camera
status: todo
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
