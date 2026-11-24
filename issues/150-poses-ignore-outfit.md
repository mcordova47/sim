---
id: "150"
title: "The doing poses ignore the outfit you are wearing"
short: "Poses ignore outfit"
status: done
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
- 2026-11-24 (claude, review): independent review, verdict approve.
  - Criterion 1 (every pose draws the worn outfit, nothing flips): pass. My own script over art/src compared all 12 non-everyday outfits x 5 clothed poses to the everyday pose: same size and row widths, every palette key valid, transparency identical, and only pixels that were `h`, `i` or `a` in the everyday pose changed (0 violations); the two sleep sprites contain no `h`/`i` rows. Viewed all five poses at 3x in 13 outfits and at 8x in jacket-scarf, hoodie, striped pajamas and blazer: top recoloured with the outfit's collar, hood band, stripes or scarf, desk, chair, table, bowl, book and guitar untouched. In the real game (dev server, temporary uncommitted `window.__g` line in src/main.ts, reverted; headless Chrome over remote debugging; `?own=outfit-<id>`, worn through the decor slot, real E key press) the chosen pose sprite was the outfit's for sit (doomscroll), eat (drink-coffee) and guitar in peacoat, robe, hoodie, jacket-scarf and striped pajamas, for type (work) in peacoat and hoodie (in robe, scarf and striped my script landed on the journal task at that desk, which has no pose; that is my script, not the change), and `player-sleep-bed` for sleep in every outfit. Screenshots of hoodie typing, peacoat guitar and striped sleeping showed the outfit on the pose and the unchanged covers. Not driven in the browser: read-sofa (the unit tests cover it) and the end of each pose (the same sprite is chosen at start and held to the end, so there is no second switch; checked in code, not by eye).
  - Criterion 2 (a test fails when a pose has no sprite for an outfit): pass. I temporarily added a 13th outfit to OUTFITS with no art and ran src/game/poses.test.ts: two tests failed ("zz-new: player-zz-new-sit-sofa is missing; add the outfit to art/outfits.json and run npm run sprites"); reverted. Gap, not a failure: a new clothed pose whose sprite name does not start with `player` would fall through `outfitPoseSprite` to itself and pass the test silently.
  - Standard checks, all run in the worktree: npm test 4228 pass (3 skipped), golden frames for a fresh game unchanged (no golden file in the diff), npx tsc --noEmit clean, npm run build ok, npm run check:dist ok, npm run issues:check -- --validate (195 valid, 2 unrelated summary-length warnings), npm run sprites leaves git status clean.
  - Scope and conventions: the diff touches only art/outfits.json, generated art/src and public/sprites files, scripts/outfits.mjs and its test, src/game (game, outfits, poses and test), src/render/player-sprite.ts, docs/art-style.md, docs/decor.md and this issue file; no PLAN.md or other issue edits, nothing from reference-photos, no personal details. Pose and outfit data live in art/outfits.json and OUTFITS.
  - Unverified (kept in the front matter): motion feel in a real browser with human hands (I also used scripted keys only); whether the sleep pose, which shows only a face above the covers and so no clothes, is what Marc wants.
  - PLAN.md table needs updating by the planner (150 is still `todo` there).
