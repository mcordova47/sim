---
id: 099
title: Redraw the south-wall pieces near top-down (lamps, fridge, delivery box, record stand)
status: todo
owner: claude
depends_on: [096]
---

## Goal
Marc's decision (2026-10-28, `docs/asset-review.md`): redraw the south-wall pieces that do not follow his rule so they read near top-down like the sofa, the counter and the stove (look at `stove.sprite` and `counter.sprite` as the models): **the four lamps as one set** (`lamp-table`, `lamp-warm`, `lamp-candle`, `stool-lamp`; the lamp slot sits at the sofa's east end beside the south-wall step), **the fridge**, **the delivery box** (also give it an ink outline, it has none) and **the record stand** (more top). Fold in the outline pass for the lamps and the phone charger (the survey lists the outline coverage). Keep footprints, sizes, the glow positions of the lamps (`decor-data.ts` glow offsets and the flicker), the swap rule (items fit their slot sizes) and the sprite names, so nothing in the maps or the decor data needs to change; if something must move, say so.

## What to do
- Read `docs/asset-review.md` (the rows for these pieces), `docs/art-style.md`, the palette and the sprite pipeline (`npm run sprites`). Draw in `art/src/*.sprite` text grids, palette only, no readable text. Look at each at 8x and in the room (the room mockup scripts) before and after.
- Golden frames are re-recorded deliberately (`UPDATE_GOLDEN=1`, see the README); say in the log what changed and view the main room and kitchen frames.
- Do not touch the chair, plants, view pictures or the sleeping sprites (other issues). The candle's flicker and every gift item keep working.

## Acceptance criteria
- Each listed piece is near top-down, matches the stove and counter in outline weight and light direction, and fits its footprint and slot; before and after images are viewed and the log says what each looks like now.
- `npm run sprites` leaves nothing uncommitted; `npm test`, `npx tsc --noEmit`, `npm run build` pass; goldens re-recorded with a note. Marc looks at it in the browser (desktop, the narrow view and at night with the lamps on); unverified items listed.

## Progress log
