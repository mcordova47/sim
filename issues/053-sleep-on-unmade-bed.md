---
id: 053
title: Sleeping on an unmade bed shows a made bed
status: review
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

- 2026-10-23 (agent): started. Plan: two full-bed sleeping sprites (the covers are drawn over the whole bed, so one overlay cannot sit on both), picked by `bedMade` when the task starts.
- 2026-10-23 (agent): done, set to review.
  - **Chose two sprites** (option 1): `player-sleep-bed` (made, unchanged) and new `player-sleep-bed-unmade` = `bed-unmade` with the same sleeper pasted over it (the figure region was taken from `player-sleep-bed` by flood-filling outside the sleeper's outline, then viewed). Not an overlay: the sleeper's covers and the bed's rumpled duvet would have to be redrawn per bed anyway.
  - **Code:** `PoseDef.variants` (sprite plus `when` checks) in `poses.ts`; `game.ts` picks the sprite when the task starts (stored in `doing.sprite`) so a state change mid-task does not swap it; `POSE_SPRITES` includes variant sprites so they load. If the unmade art is missing the plain player is drawn (and logged once), as for any pose.
  - **Tests** (poses.test.ts): made bed uses the made sprite, unmade uses the unmade one, no swap mid-task, fallback when art is missing.
  - **Docs:** `docs/art-style.md` poses paragraph rewritten for the person-only sofa overlays (right cushion, x 61/45) and the two sleeping sprites; removed "the game does not use the poses yet".
  - **Verified:** rendered in the real game (Game with the real sprites in headless Chrome, a temporary harness, deleted) with bedMade 1 and 0, at 1x and 4x, world only and also with the HUD; head and body are one connected figure on both. `npm run sprites`, `npm test` (983) and `npm run build` pass.
  - **Found (outside scope):** on an unmade bed, E starts "make the bed" first (it is the first task offered), so sleeping on an unmade bed is only reachable while make-bed is on cooldown, until the task picker (039) exists. I tested the unmade pose by removing make-bed from the room. Also the "GO TO SLEEP" banner covers the sleeper's head while it plays (unchanged, noted in 052).
  - **Not checked:** feel in a live browser.
  - Files: art/src/player-sleep-bed-unmade.sprite, public/sprites/player-sleep-bed-unmade.png, src/game/poses.ts, src/game/game.ts, src/render/player-sprite.ts, src/game/poses.test.ts, docs/art-style.md, this file.
