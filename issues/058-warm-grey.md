---
id: 058
title: Add warm greys to the palette; re-tint the plaster and kitchen walls
status: todo
owner: agent
depends_on: []
---

## Goal
Marc approved adding warm greys to the shared palette (2026-10-23) so the main room's plaster and the kitchen's drywall match the photos (a pale, warm, slightly brown or yellow off-white). Today the walls use the cool grey-blue `mist`, so the plaster reads a bit like terrazzo and the kitchen reads cool.

## Acceptance criteria
- Add two warm greys (a light and a mid; pick values from `wall-texture.jpeg` and the kitchen photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/`, absolute paths, never copied into the repo) to `art/palette.json` with one-character keys, a name and a Materials-table entry in `docs/art-style.md`. Check the palette size limit in `scripts/sprite-lib.mjs`, `src/render/colors.ts` and the tests that count colors; update them together. A third color only if two do not cover the plaster's highlight and shadow.
- Existing sprites are not changed except the ones below: the generated PNGs of all other sprites must stay byte-identical (`git diff --stat` of `public/sprites` shows only the re-tinted walls and any file you list).
- Re-tint: main-room plaster (`wall-back`, `wall-front`, `wall-side-left`, `wall-side-right`), kitchen drywall (`wall-back-kitchen`, `wall-front-kitchen`, `wall-side-*-kitchen`) with the new warm greys; keep the plaster's stippling and the kitchen's smoothness, the thick side-wall structure (ink edge, 3 px lit top, 8 px face, 3 px floor shadow) and the baseboards. Check they still read next to the furniture and wood floor, in all three rooms, at 1x and 4x and at `?hour=23` (the night tint must not make the warm greys muddy).
- The raw-color-literal test and the lighting tint colors (009d, palette-only with alpha) still pass; if the tint should use a warm key at dusk, note it but do not change it.
- `npm run sprites`, `npm test` and `npm run build` pass; render all three rooms and look at them.

## Progress log
