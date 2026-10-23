---
id: 058
title: Add warm greys to the palette; re-tint the plaster and kitchen walls
status: done
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

- 2026-10-23: Plan: add two warm greys, re-tint the eight main-room and kitchen wall sprites.
- 2026-10-23: Done. Sampled `wall-texture.jpeg` (warm grey-beige, face about mid-light) and chose `l` putty #cdc7b9 (face) and `m` taupe #a29b8c (shade, dents, wall-front base band, side-wall floor shadow). Re-tinted by swapping key 5 to `l` and 4 to `m` in wall-back, wall-front, wall-side-left, wall-side-right and their `-kitchen` versions (stipple, structure and baseboards unchanged; `6` highlights and `1` ink kept). Bath walls untouched. No palette size limit exists in `sprite-lib.mjs`, `colors.ts` or the tests (nothing counts colors); only `docs/art-style.md` was updated (heading now 22 colors, two palette rows, a Materials row). `public/sprites` diff is exactly the eight wall PNGs. Rendered all three rooms headless at 1x, 4x and `?hour=23`: the warm walls read next to wood floor and furniture; at night they go neutral grey, not muddy. Side note: the dusk-blue floor shadow became taupe, so wall bases are slightly lighter than before; fine to me. Lighting tint not changed; a warm key (`m`/`l`) could be used for the dusk tint later. Could not check: how it feels in a live browser.
- 2026-10-23: Review (independent, approve).
  - Criterion 1 (palette): pass. `l` putty #cdc7b9 and `m` taupe #a29b8c; 22 keys, all unique one-char, unique names and hex; `docs/art-style.md` heading, two palette rows and a Materials row updated. No size limit or color-count test exists (grep and `npm test` agree). Hue matches `wall-texture.jpeg` (warm light grey).
  - Criterion 2 (byte-identity): pass. Compared every `public/sprites/*.png` against main: only the eight wall PNGs differ. Re-ran `npm run sprites`: working tree stays clean (committed PNGs are reproducible). Only changed non-wall files: palette.json, art-style.md, this issue.
  - Criterion 3 (re-tint): pass. Mechanical check: main's eight wall `.sprite` bodies with 5->l and 4->m equal the branch bodies exactly (so stipple, 6 highlights, ink edge, 3/8/3 structure and baseboards are untouched); no 4/5 left in them; bath walls untouched. Headless Chrome renders of main, kitchen, bath at hour 12 and 23, plus a 3x-scaled zoom of main: walls read warm next to the wood floor and furniture; kitchen stays smooth; at hour 23 they go neutral grey, not muddy. Bath unchanged.
  - Criterion 4 (tint/tests): pass. Lighting tint untouched; `npm test` 1033 passed (49 files), including the raw-color-literal test. Note only: a warm key could be used for the dusk tint later.
  - Criterion 5 (build): pass. `npm run sprites`, `npm test`, `npm run build` all succeed.
  - Observations, not failures: wall base bands/side-wall floor shadows are now taupe, a little lighter than the old dusk blue. Kitchen walls and plaster now share the same colors, so kitchen drywall differs from plaster only by stipple.
  - Unverified: how it feels in a live browser (headless screenshots only).
  - Verdict: approve. PLAN.md table needs updating by the planner.
