---
id: 107
title: The guitar: try it mirrored so it reads as standing on a stand
status: todo
owner: claude
depends_on: [100]
---

## Goal
Marc (2026-10-28): the guitar has been hard to draw as hanging on the wall, so maybe the guitar could just be **reflected across its x axis**, so it looks like it is **on a stand**. Today the 1x1 `guitar` (and `guitar-nylon`) are drawn diagonal: neck up and to the west to a headstock, body low and to the east. Marc's words are ambiguous (a left-right mirror, or a vertical flip); the planner's reading is a **left-right mirror**: the neck leans up and to the east, away from the west wall, as a guitar leaning back on a stand does.

## What to do
- Draw both readings at 8x (the left-right mirror, and the vertical flip as a contrast, which most likely looks wrong) and the current one, look at them in the room (the guitar sits at the sofa's west end, `G` on the main map, with the `guitar` task and the `held-guitar-*` and `player-guitar` poses) and pick the one that reads as standing on a stand; if the plain mirror looks off, adjust by hand (a small tripod or stand foot under the body is allowed within the 16x16 tile, palette only). Mirror `guitar-nylon` too (the gift variant) and keep both consistent with the new south-wall near top-down style (issue 099: strip along the top, light from the top-left, full ink outline: a mirrored sprite flips the light direction, so redo the shading to keep the light from the top-left).
- Check the player poses still match where the guitar is (the player plays facing the guitar), the swap list names, and the unused `guitar-tall` and `guitar-nylon-tall` (issue 101 deletes them; leave them).
- Do not change maps, tasks or code unless the pose needs it.

## Acceptance criteria
- The guitar and the nylon guitar read as standing on a stand; before and after images are viewed and described in the log; sizes and names unchanged; `npm run sprites` clean; goldens re-recorded deliberately with a note; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc looks at it.

## Progress log
