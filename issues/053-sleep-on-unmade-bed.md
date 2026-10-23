---
id: 053
title: Sleeping on an unmade bed shows a made bed
status: todo
owner: agent
depends_on: []
---

## Goal
From the 052 review: `player-sleep-bed` includes the made bed, so sleeping on an unmade bed shows a made bed under the sleeper (it was already like that before 052).

## Acceptance criteria
- Two sleep poses, `player-sleep-bed` (made) and `player-sleep-bed-unmade`, and the pose picks by the `bedMade` state when the task starts. Or one person-only overlay that sits on whichever bed sprite is showing, if the covers can be drawn without the bed (say which and why).
- Head and body stay one connected figure on both; render both in the real game at 1x and 4x.
- `docs/art-style.md` lines about poses ("draws the furniture too", sofa column x 48..63) updated to the person-only overlays from 052 and this issue.
- `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log
