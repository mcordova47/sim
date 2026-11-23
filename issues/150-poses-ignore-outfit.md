---
id: "150"
title: "The doing poses ignore the outfit you are wearing"
short: "Poses ignore outfit"
status: todo
owner: claude
depends_on: []
summary: "Sitting, typing, eating and sleeping poses are drawn in everyday clothes only, so a worn outfit flips back."
kind: bug
---

## Goal
Marc (2026-11-23), answering decision d3 of issue 148: wearing a different outfit (issue 148 build step B, worn outfits) is fine to ship first, but the visual pop is a bug and gets its own issue. While you sit on the sofa, type at the desk, eat at the table or sleep in the bed, the pose sprites (`player-sit-sofa`, `player-type-desk`, `player-eat-table`, `player-sleep-bed` and the others in `src/game/poses.ts`) are drawn in the everyday clothes only, so a casual, out or pajama outfit flips back to the everyday look for the pose and then again when it ends.

## Notes (planner)
- Only visible once outfits can be worn (issue 148 step B); file the fix so it is not forgotten, build it after that step.
- Cost, from the design note: 12 sprites per outfit per pose set at 16x16 (or a smaller count if a pose set is shared); a cheaper route may be drawing the pose in the outfit's palette (a recolor) or choosing the pose sprite by `outfitPrefix`. Decide with art in hand.
- Sleeping in pajamas after going to bed is a related, separate decision.

## Acceptance criteria
- With each outfit worn, every pose draws that outfit, and nothing flips at the start or end of the pose.
- A test walks the pose list and fails if a pose has no sprite for an outfit.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answer to d3 of issue 148.
