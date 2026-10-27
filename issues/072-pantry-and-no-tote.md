---
id: 072
title: A real pantry (a stack of clear bins); remove the tote bag
status: todo
owner: agent
depends_on: []
---

## Goal
From Marc (2026-10-26): the thing right of the boxes in the kitchen is the pantry, which in the real apartment is a stack of clear plastic bins with navy lids and food piled on top; the game draws a single tub. Draw it properly, as its own piece. The black tote bag under it can just be removed. The pantry is also a good candidate for upgrade swaps later (issue 062).

## Acceptance criteria
- **Pantry piece:** a new `pantry` sprite: a stack of two or three clear plastic bins with navy lids (a yellow lid on the lowest one is in the photo), with the pantry food (boxes, jars, cans) piled on the top lid, drawn top-down in the style of the room (see the photo `panty-and-boxes` in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` by absolute path; never copied into the repo; no readable labels or brand names: abstract the food packages). Decide its tile footprint (propose in the log; the kitchen's north-east corner is `#........NXX#` row 1 and `c..........O#` row 2: the pantry can take the two tiles at the right end of row 1 if the boxes move one tile left, or the right column of rows 1 and 2 as a 1x2; whatever keeps the walk lane to the main-room passage clear), make it its own object (not baked into the boxes sprite), and make it a decor slot candidate (id `pantry`, kind `pantry`, default item `pantry`, not swappable yet: only the slot data, in `decor-data.ts`, so stage 4 can add upgrade items).
- **Boxes:** the boxes object loses the tub: `boxes`, `boxes-flat` and `boxes-gone` become the box art only (16x16 or the footprint you chose; keep the three states and the tidy look Marc approved; `boxes-gone` becomes empty floor: the area draws nothing in that state). Keep the tasks (flatten, recycle) working at the boxes' tile.
- **Tote:** remove the tote bag object `O` from `KITCHEN_MAP` (its tile becomes plain floor), delete `art/src/tote.sprite` and `public/sprites/tote.png`, and clean the legend, docs and the mockup script. If the pantry needs the tile, use it.
- Map changes need: reachability of every task and door (the unit tests and your own BFS), the wall-tiles classification, the room-mockup script, `docs/floor-plan.md`, and the kitchen render at 1x and 4x with the boxes in each state. The main-room golden frames are untouched. The decor and delivery tests still pass.
- `npm run sprites`, `npm test` and `npm run build` pass. Marc looks at the kitchen's north-east corner.

## Progress log
