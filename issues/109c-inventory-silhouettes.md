---
id: 109c
title: Inventory stage 3: seen-but-not-taken silhouettes
status: todo
owner: claude
depends_on: [109b]
---

## Goal
Stage 109c: optional saved `seen` list (tolerant parse, capped, never lists an owned item), ad encounters call `markSeen` for an item shown and not added, a dark flat `???` cell with the line `YOU HAVE SEEN ONE OF THESE.` No hint how to get it, no count.

Design and Marc's answers: `docs/inventory-design.md` (answers 2026-10-28: silhouettes only for ignored ads, `???` and no hint or count; no placing from the page, it names the object in the room; opens from the pause screen only, button and `I`; deadpan lines written with the build and one added per new gift; sprite drawn 2x beside the text).

## Acceptance criteria
- Tests: never shows an owned item as a silhouette, hand-edited saves, sync merge of `seen` if the decor save is synced, no count anywhere. `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

