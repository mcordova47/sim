---
id: 052
title: Fix the sleeping and sofa-sitting poses
status: todo
owner: agent
depends_on: []
---

## Goal
From Marc's playtest of the pose build (2026-10-23): "head is detached from body when sleeping" (`player-sleep-bed`) and "sitting on sofa doesn't look quite right" (`player-sit-sofa`; his screenshot shows the pose drawn as its own small sofa strip with a fabric stripe below it, not matching the redrawn `sofa-td`, with the figure sitting in the middle of the sofa).

## Acceptance criteria
- **Sleep:** the head and body are one connected figure under the duvet on `bed-made`'s footprint; check against the pillow position and the covers so the head rests on the pillow and the body lies under the cover, not a floating head. Render it over the bed at 1x and 4x.
- **Sofa:** the sitting pose must match the redrawn `sofa-td` (seen from behind: the back rail near the camera, cushions farther away). Prefer drawing the person only (head and shoulders above the back rail, over the cushion), as a transparent overlay of the right size, with no furniture of its own, so the real sofa sprite shows through and cannot go out of step with it. The same rule for the other poses that draw their own furniture strip (`player-type-desk`, `player-read-sofa`, `player-eat-table`): if they also repeat furniture that no longer matches the redrawn pieces, fix them the same way or list them in the log for a follow-up. Position the figure over the left or right cushion (say which), and make the pose's placement in `src/game/poses.ts` agree.
- Render each fixed pose in the real game (headless Chrome or the room painter) and look at it at 1x; `npm run sprites`, `npm test` and `npm run build` pass.

## Notes
- Reference photos in `/Users/marccordova/Dev/repos/mcordova47/life/reference-photos/` (absolute path, never copied). The character brief is `docs/character-brief.md`.

## Progress log
