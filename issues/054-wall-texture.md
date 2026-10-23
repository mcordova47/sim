---
id: 054
title: Wall texture from the new photo
status: todo
owner: marc + agent
depends_on: []
---

## Goal
Marc added `wall-texture.jpeg` (2026-10-23): a close-up of the real wall, a pale off-white, heavily textured plaster (a stippled, raised, uneven stucco-like surface, slightly warm grey). The current wall tiles (`wall-back`, `wall-side-*`, `wall-front`, and their kitchen and bath variants) may read as brick or plain; find out which walls in the real apartment look like this and redraw those tiles.

## Acceptance criteria
- Marc's answer (2026-10-23): **the main room walls are this plaster** (the texture photo is of them; replace the brick look); **the kitchen walls are drywall** (smooth painted wall with a faint orange-peel or roller texture at most; read the kitchen photos for the paint color); **the bathroom walls are white tiles** (a small square tile grid with grout lines, glossy highlight). Draw the main room, kitchen and bath wall sets separately (`wall-back`, `wall-front`, `wall-side-*` per room); the kitchen and bath variants already exist (`-kitchen`, `-bath`), the main room's are the base names.
- Redraw the main room's plaster wall tiles as a tileable 16x16 texture from the photo: a few palette colors, an irregular pattern with no visible repeat seams when tiled, and enough contrast to read at 1x without becoming noisy behind the furniture. Keep the baseboard, shadow and top-slice rules from `docs/art-style.md`.
- Corner and doorway tiles still join correctly (`wall-tiles.ts` rules); render all three rooms and look at them at 1x.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
