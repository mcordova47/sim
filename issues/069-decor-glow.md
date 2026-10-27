---
id: 069
title: Decor items decide whether they give light; the stool is a real item
status: done
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
- 2026-10-26 (claude, reviewer): Review. Verdict: approve.
  - Criterion 1 (glow property): pass. `DecorItem.glow` in `decor-data.ts`; `feature.ts` draws from `decor.itemIn(slot).glow` (so a preview counts), then sprite glows (desk). `lamp-table` carries {40, 0.2}, the old numbers; ring order unchanged. Only other `lamp-table` use is the slot piece `L` in `apartment.ts` (slot `lamp-sofa`), so no glow is lost.
  - Criterion 2 (stool, stool-lamp, docs): pass. Stool has no glow, `lamp-test-stool-lamp` glows (24, 0.2), both tagged test; `docs/decor.md` notes stage 4. Sprite is 16x16, palette only. Judged by its 1x render only (reads as a stool with a lit lamp; blobby at 1x, fine for TEST art).
  - Criterion 3 (tests): pass. `npm test`: 82 files, 1829 tests pass, golden main-room frames unchanged with no re-record. Tests cover default, stool, stool-lamp at night and by day, save/load, preview and clearing it.
  - Criterion 4 (render and build): pass. `npm run sprites`, `npm test`, `npm run build` all pass, tree clean afterwards. My own render (Chrome headless, vite on 5198, `?hour=23`, 1x, seeded `life.progress.v1` with `decor.placed`): default lamp = big glow by the sofa; stool = no lamp glow (desk glow only, room darker there); stool-lamp = smaller glow; placed id not owned or unknown (`bogus-id`) falls back to the default lamp with its normal glow.
  - Not verified: the swap list used by hand (keyboard flow in a real browser) and 2x or other scales. The in-game preview glow is tested only in unit tests.
  - Scope: only decor-data, config, time-of-day feature and test, the sprite and its png, `docs/decor.md` and this issue. No other issues or PLAN.md touched. No privacy problems.
  - PLAN.md table needs updating by the planner.
