---
id: 045
title: Draw the doing poses, outfits and held items in the game
status: todo
owner: claude
depends_on: [034]
---

## Goal
034 drew the player's doing poses (`player-sit-sofa`, `player-type-desk`, `player-guitar`, `player-read-sofa`, `player-sleep-bed`, `player-eat-table`), 36 outfit sprites (casual, out, pajamas) and 16 `held-*` overlays (mug, laptop, book, guitar, four facings each). The game draws none of them yet.

## Acceptance criteria
- While a task runs, the player draws as the matching pose at the right place over the furniture (a pose can cover more than one tile; align it to the piece it belongs to, and hide the plain player sprite while it plays). Map each task to a pose in data (`pose` on the task), with a sensible fallback to the plain sprite. `guitar` also swaps the wall guitar for the pose while it plays.
- An `outfit` state, default home, picked by a getting-dressed task later; the plain sprite and the walk frames load from `player-<outfit>-...` when it is not home. A pajamas outfit is used right after sleep until you change (decide with Marc whether that is worth doing now).
- Held items draw over the player while the matching task runs or when carrying one (mug after `coffee`, until `drink-coffee`).
- Missing sprites fall back as in 031 and log once.
- Tests, a rendered frame of each pose in its room, `npm test` and `npm run build`; Marc plays it.

## Progress log
