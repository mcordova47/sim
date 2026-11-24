---
id: "150"
title: "The doing poses ignore the outfit you are wearing"
short: "Poses ignore outfit"
status: review
owner: claude
depends_on: []
summary: "Sitting, typing, eating and sleeping poses are drawn in everyday clothes only, so a worn outfit flips back."
kind: fix
changelog: "Outfits now show while sitting, typing, eating or playing guitar, so nothing flips back to the everyday look."
unverified:
  - "How the poses feel in motion in a real browser with a hand on the keyboard; the author drove the dev server with scripted key presses and looked at screenshots only."
  - "The sleep pose is unchanged and shows no clothes (only the face above the covers); Marc has not confirmed that is what he wants."
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
- 2026-11-24 (claude): started. Plan: read how each pose is drawn, then dress them from the outfit data like the walk sprites.
- 2026-11-24 (claude): investigation. The poses are partial pictures, not scenes, except the bed: `player-sit-sofa` 16x32 (head and shoulders only, over the sofa), `player-read-sofa` 32x32 (the same plus a book), `player-type-desk` 16x32 (desk edge, chair and person), `player-eat-table` 16x32 (table edge, stool, bowl and person), `player-guitar` 32x48 (the figure from the front with the guitar), and `player-sleep-bed` and `-unmade` 80x96 (the whole bed). The clothes are always the everyday top: `h` with highlight `i` (and arm pixels `a`); no legs show in any pose. The sleep pictures contain no `h` or `i` at all: the sleeper is under the covers with only the face out, so there is nothing to dress. So a recolour of the top by region is enough; no hand-drawn rows were needed.
- 2026-11-24 (claude): built. `scripts/outfits.mjs` gets `generatePoses`: the pose's `h`/`i` pixels are repainted with the outfit's own torso rule for the facing (`up` for sofa, desk and table; `down` for the guitar), plus long sleeves, using the same rules as the walk sprites; `poseOverlays` is there for hand-drawn rows but unused. `art/outfits.json` lists the five poses and gets a `poseOnly` list for the three hand-drawn outfits (casual, out, pajamas), with a new `check` rule for the flannel. 60 generated files (5 poses x 12 outfits). In the game, `outfitPoseSprite` picks the sprite when the task starts (falls back to the everyday pose if missing); the sleep pose is `clothed: false`. Found by looking in the browser: the loader (`POSE_SPRITES`) did not list the outfit poses so they silently fell back; fixed and tested.
- 2026-11-24 (claude): looked at all five poses at 8x in 11 outfits (casual, out, pajamas, peacoat, robe, jacket and scarf, hoodie, striped, blazer, everyday): peacoat shows slate with its collar, the flannel keeps its check, the hoodie its hood band, the stripes run vertically, the robe is white with an orange belt, the blazer has its paper collar, the scarf is a red band from behind and a hanging tail from the front on the guitar. In the dev server (scripted keys, headless Chrome, `?own=<item>`, worn via the decor slot, then the sit, type, eat and guitar tasks) the pose sprite chosen was the outfit's each time for peacoat, robe, hoodie, jacket and scarf, and striped pajamas, and the screenshots showed the outfit on the pose. Sleeping was run only in tests.
- 2026-11-24 (claude): checks: `npm test` (4228 pass, fresh-game golden frames unchanged, no re-record), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean. Docs: `docs/art-style.md` (Generated outfits, poses) and `docs/decor.md` (What issue 150 built). Sleeping in pajamas by changing clothes automatically was not built (later idea in `docs/ideas.md`).
