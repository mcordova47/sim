---
id: 109c
title: Inventory stage 3: seen-but-not-taken silhouettes
status: review
owner: claude
depends_on: [109b]
---

## Goal
Stage 109c: optional saved `seen` list (tolerant parse, capped, never lists an owned item), ad encounters call `markSeen` for an item shown and not added, a dark flat `???` cell with the line `YOU HAVE SEEN ONE OF THESE.` No hint how to get it, no count.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: never shows an owned item as a silhouette, hand-edited saves, sync merge of `seen` if the decor save is synced, no count anywhere. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

- 2026-10-29 (built, ready for review; branch issue/109c-inventory-silhouettes): saved optional `seen` in the decor save (`DecorSave.seen`, left out when empty so old saves and golden text are unchanged; `parseDecor` tolerant: short strings, no repeats, never an owned id, capped at `DECOR.maxSeen` = 100; no version bump). `Decor.markSeen` (refuses owned, unknown, TEST items, repeats), `own()` removes the id from seen so the silhouette becomes the item, `reset()` clears it, `entries()` appends silhouette entries (`silhouette: true`, empty from/where) after what you own. The ad encounter calls `markSeen` when the card has been up and nothing was added (Ignore, Hide ad whether or not it worked, Escape after the card shows, a closed result line); not for Add to cart, not for an item you own or have in the cart, not when you leave during the entrance. THINGS page: a flat dark cell shape (new optional `SpriteDrawer.drawFlat`, cached `source-in` cut-out; a plain dark box without one) and an entry that says only `???` and `YOU HAVE SEEN ONE OF THESE.` with the flat sprite at 2x. Sync: the decor save is synced (`merge.ts`); `seen` merges as a UNION of both sides minus anything either side owns (it is a grow-only log like `owned`, and "I have seen one" is true on every device; taking the winner's whole list would lose a silhouette seen on the other device), sorted, capped, left out when empty; normalising also drops owned ids. The random-doc generator now makes seen lists (some overlapping owned) so the existing merge property tests cover it. Reset (progress reset) clears it. Text in docs/text-review.md; docs/decor.md save shape updated. Tests: src/game/seen-silhouettes.test.ts (16: never an owned silhouette incl. 100 random mixes, hand-edited saves, cap, sync union/commutative/idempotent over 300 random merges, encounter flows for each choice, save and reload, reset) and src/game/achievements/inventory-silhouette.test.ts (6: text, fit at both view sizes, no name or count words). `npx tsc --noEmit`, `npm test` (159 files, 3573 pass) and `npm run build` pass; golden frames unchanged (no golden file touched). Looked at: rendered the THINGS page in headless Chrome at 1x pixel size (320x192, scaled 4x for the screenshot) with three silhouettes (a wide painting, a plain painting, a dried-flowers plant): a dark shape per cell (the paintings are solid rectangles because their art is a full rectangle; the plant has a real outline), the picked one shows ??? and the line with the flat 2x shape. The 224-wide narrow layout is only covered by the layout tests: the pause screen shows the full picture, so a real window did not produce it. Not checked: how it feels in play; the ink-on-slate shape contrast on a real phone screen.
