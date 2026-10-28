---
id: 099
title: Redraw the south-wall pieces near top-down (lamps, fridge, delivery box, record stand)
status: done
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

- 2026-10-28: Started. Plan: redraw the eight sprites as near-top-down pieces (thin north face strip along the top, the top surface below, light top-left, full ink outline), same names, sizes and footprints.
- 2026-10-28: Done, ready for review. Viewed before and after at 8x and in the main room and kitchen mockups. No map, decor data or code changes (footprints, 16x16 slot sizes, glow offsets and the candle flicker are untouched; the glows are engine values, not in the sprites).
  - `lamp-table`, `lamp-warm`, `lamp-candle`, `stool-lamp`: one set. The three table lamps share one small dark-wood side table seen from above (a thin dark north face, then an oak top with a light top-left edge). Table: a linen drum shade is a ring with a lit butter inside and a bulb glint. Warm: a conical shade from above, brick trim ring, butter lit side and tangerine far side, butter tip. Candle: a green votive ring round cream wax with a butter and tangerine flame. Stool lamp: the round walnut seat from above with a small linen drum shade on it. All fully outlined in ink.
  - `fridge` (32x32): the doors are now a thin strip along the top (seam, two handles, a round badge), then the steel top with a humidifier (teal tank), a wicker basket and a folded black tote, steel shading on the right and bottom. Outlined.
  - `delivery-box`: now has an ink outline; a thin dark north face along the top, then the lid with tape down the middle and a blank flat label (no print).
  - `record-stand`: a strip with a row of record spines along the top, then most of the sprite is the black top with a turntable (platter with a brick label, tonearm), two feet.
  - `phone-charger`: ink outline added round the cable and plug.
  - Golden frames: `npm test` passed before and after re-recording, because the golden logs drawing calls by sprite name and position, not pixels; `UPDATE_GOLDEN=1` rewrote nothing, so the golden JSON is unchanged. `npm run sprites` re-run leaves nothing uncommitted.
  - Checks: `npm test` (2706 pass), `npx tsc --noEmit`, `npm run build`.
  - Not checked: how it looks in the browser (desktop, narrow view, at night with the lamps on).
- 2026-10-28: Review (independent). Verdict: approve (visual criteria pass; browser check is Marc's and unverified).
  - Checks I wrote and ran: every sprite parses, palette only; sizes and names identical to main for all eight (16x16 x7, fridge 32x32); only `art/src/*.sprite`, `public/sprites/*.png` and this file changed (no map, decor data or code diff, so glow offsets, slots, footprints and flicker are untouched). Outline coverage (edge pixels that are ink): lamp-table, lamp-warm, lamp-candle, stool-lamp, fridge, delivery-box, phone-charger all 100% (before: 71, 66, 64, 95, 100, 0, 54%); record-stand 79% (before 82%). No readable text anywhere (label is blank). `npm run sprites` leaves nothing uncommitted; `npx tsc --noEmit`, `npm test` (2706 pass) and `npm run build` pass.
  - Viewed before and after at 8x and in the main room and kitchen mockups. Lamps: one set on one small side table seen from above, shades are discs or rings with a lit centre, light top-left; clearly top-down, outlined. Fridge: door strip with seam and handles along the top, steel top with items below, outlined, matches the counter's strip-then-top layout. Delivery box: now outlined, dark north strip, lid with tape and blank label. Record stand: row of spines along the top, turntable top below. Charger: outlined.
  - Minor, not blocking: record-stand has no ink line along the bottom of its body between the two feet (79% coverage, still above the 75% bar); the delivery box now fills a bit more of its 16x16 (bbox 1,2 to 14,14, was 1,4 to 15,13). The delivery box is not in either mockup, so I only judged it at 8x.
  - Unverified (Marc to check): the browser at desktop size, the narrow view, and at night with the lamps on (glow and candle flicker against the new sprites). Goldens: the golden logs sprite names and positions, so it did not change; I did not re-verify pixel output in a browser.
