---
id: 069
title: Decor items decide whether they give light; the stool is a real item
status: review
owner: claude
depends_on: []
---

## Goal
From Marc's playtest of the decor swap (2026-10-26): the stool (today a TEST item for the lamp slot, using the stool sprite) still produces the lamp's night glow. He likes the stool as a real thing to swap in, but it should either give no light, or be paired with a small lamp.

## Acceptance criteria
- A `glow` property on decor items (`glow?: { color, radius, strength }` or a simple boolean plus the existing look; reuse what the time-of-day glow already draws, issue 009d) replaces the lamp glow being tied to the slot or to the sprite name `lamp-table`. The default lamp keeps today's glow exactly (the golden frames at night must be identical), any item without `glow` gives no light, and a lamp item you swap in gives its own.
- The stool item (`lamp-test-stool` today) gives no light. Add a second item for the same slot that is the stool with a small lamp on it (a TEST item for now, sprite `stool-lamp`: draw it from the stool sprite plus a small lamp, 16x16, palette only, in the room's style) that does glow, so the pairing can be seen. Both stay marked as test items until stage 4 (the real art pass), where the real stool (also usable as a stool for guitar playing or recording, Marc's earlier idea) and its lamp pairing become real items; note this in `docs/decor.md`.
- Tests: the glow follows the item in the slot (default lamp, stool without light, stool-lamp with light), at night and by day, saved and loaded placements; the golden main-room frames are unchanged for the default room (record nothing new unless a night scenario with a swapped item is added; add one if cheap).
- Render the main room at `?hour=23` with the default lamp, the stool and the stool-lamp (`?own=test` and the swap list) at 1x and look at them. `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-26 (claude): Plan: add `glow` to DecorItem, draw glows from the item in each decor slot, move the lamp's numbers onto the lamp item, add `lamp-test-stool-lamp` and sprite `stool-lamp`.
- 2026-10-26 (claude): Done, set to review.
  - `decor-data.ts`: `DecorItem.glow`; `lamp-table` has `{40, 0.2}`; `lamp-test-stool` (renamed "TEST STOOL") has none; new `lamp-test-stool-lamp` ("TEST STOOL AND LAMP", glow radius 24, alpha 0.2). `config.ts`: removed the `lamp-table` entry from `TIME_OF_DAY.glows` (the desk stays). `time-of-day/feature.ts`: collects glows from `level.appearances` with a slot (`decor.itemIn(slot).glow`) first, then sprite glows, drawn in the same ring order as before. New sprite `art/src/stool-lamp.sprite` (+ `public/sprites/stool-lamp.png`). `docs/decor.md` updated (stage 4 note).
  - Golden main-room frames: unchanged, passes without re-recording. No night scenario with a swapped item added to the golden; unit tests cover it instead.
  - Tests (`time-of-day.test.ts`): default lamp ring radii and count, stool none, stool-lamp its own radii, none by day for all three, saved then loaded placement, preview and clearing it.
  - Rendered headless Chrome against the dev server at `?own=test&hour=23`, 1x, default lamp, stool and stool-lamp placed (via the save): default shows the lamp glow as before, the stool shows only the desk's glow, the stool-lamp shows a smaller glow. The stool-lamp sprite reads as a stool with a lit shade; it is TEST art, small at 1x.
  - Not checked: the swap list by hand in a browser (covered by existing swap tests).
