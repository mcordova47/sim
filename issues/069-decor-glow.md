---
id: 069
title: Decor items decide whether they give light; the stool is a real item
status: todo
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
