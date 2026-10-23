---
id: 053
title: Sleeping on an unmade bed shows a made bed
status: done
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

- 2026-10-23 (reviewer, independent): **approve**.
  - **Criterion 1 (two poses, picked by bedMade at start): pass.** Read poses.ts/game.ts: `variants` with `bedMade max 0`, chosen in `onStart` and stored in `doing.sprite`. Chose two sprites with a reason given (covers drawn over whole bed), which the criterion allows.
  - **Criterion 2 (connected figure, 1x and 4x in the real game): pass.** Own harness (real Game + real PNGs, headless Chrome, esbuild bundle in scratch, outside the repo) at 1x (320x192) and 4x for bedMade 1 and 0; viewed all. Made bed shows the striped made bed with the sleeper, unmade shows the rumpled bed with the sleeper. Also viewed both sprites zoomed 12x: head, shoulders and body are one connected outlined figure on both. Source diff: all 400 sleeper pixels are identical in the two sprites, and the unmade sprite is `bed-unmade` plus those pixels (the 25/26 pixels that differ between the two diffs are where a sleeper pixel equals the bed's own pixel). Edge case: toggling bedMade mid-task keeps the starting pose (rendered 4x, unmade stays unmade). Nit only: a small black fragment of the unmade bed's second pillow outline shows at the top right of the pasted region.
  - **Criterion 3 (docs): pass.** art-style.md poses paragraph now describes the person-only sofa overlays (x 61/45) and the two full-bed sleeping sprites; "the game does not use the poses yet" and the old sofa x 48..63 text are gone. The Player section lists the new sprite.
  - **Criterion 4: pass.** `npm run sprites` (131 sprites, working tree stays clean so the committed PNG matches its source), `npm test` 983 passed, `npm run build` passes.
  - **Beyond criteria:** scope is clean (no PLAN.md or other issues touched; the changed files are the ones the log lists). Missing-art fallback and tests cover both beds, no swap mid-task and the fallback. No reference-photos content. Unmade sleep via the real E key is only reachable while make-bed is on cooldown (author's finding; I confirmed with make-bed present the active task is make-bed). The banner over the head is pre-existing.
  - **Unverified:** feel in a live browser (not exercised by me either).
  - Verdict approve: set status done. PLAN.md table needs updating by the planner.
