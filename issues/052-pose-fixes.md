---
id: 052
title: Fix the sleeping and sofa-sitting poses
status: done
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
- Reference photos in `reference-photos/` (absolute path, never copied). The character brief is `docs/character-brief.md`.

## Progress log

- 2026-10-23 (agent): started. Plan: redraw `player-sleep-bed` so head, shoulders and body are one figure; redraw `player-sit-sofa` / `player-read-sofa` as person-only overlays; check the desk and table poses against the current sprites.
- 2026-10-23 (agent): done, set to review.
  - **Sleep:** `player-sleep-bed` is now `bed-made` (unchanged pixels) plus a head on the west pillow (hair, face, closed eyes) and the covers pulled up over shoulders that start right under the chin and taper down to the feet, so it is one connected figure. The duvet stripes carry on over it. Cause of the old bug: the head ended at row 16 and the lump began at row 21 with a different width.
  - **Sofa:** `player-sit-sofa` (16x32) and `player-read-sofa` (32x32) are now person-only overlays: head and shoulders from behind in rows 2..14, the rest transparent, no furniture of their own, so the real `sofa-td` backrest and back rail show through. They are 32 tall (empty lower half) only so the draw order puts them in front of the sofa (a pose sorts by its bottom edge; at 16 tall the sofa covered it, which I saw in the first render).
  - **Placement:** the person sits on the **right-hand** seat cushion (the sofa's cushions are x 7..46 and 49..88 of 96; seam at x 47..48), centred at x 69. `sit-sofa` is `at {x: 61, y: 0}` (abs 93, 80 in the main room); `read-sofa` is `at {x: 45, y: 0}` (the book is on the left half of its sprite, the person on the right half, same spot). `poses.test.ts` expected x updated from 80 to 93.
  - **Other poses checked, no change needed:** `player-type-desk` rows 0..5 match `desk` rows 16..21 at x 32 exactly, and its chair rows 4..14 match `desk-chair` (only the person differs); `player-eat-table` rows 0..3 and 7 match `table` rows 16..19 and 23 at x 24, the only difference is the bowl drawn on the table's front edge (rows 4..6), which is a deliberate addition, not a stale copy. Both still sit right in the real game.
  - **Verified:** rendered each in the real game (headless Chrome, the game's own `drawWorld` with the real sprites, no UI) at 1x and 4x/6x: sleep over `bed-made` (bedMade 1), doomscroll and work-sofa on the sofa, `read-sofa` forced in place of `sit-sofa` (no task uses it yet), desk and table before and after. `npm run sprites`, `npm test` (980 pass) and `npm run build` pass.
  - **Not checked:** how it feels in a live browser (animation, the banner over the bed); the book hand pixel in `player-read-sofa` is a small guess.
  - **Follow-ups (outside scope):** `docs/art-style.md` line 84 and 150 still describe the old poses (column x 48..63, "draws the furniture too"); a planner edit. No task uses `read-sofa` yet.
  - Files: art/src/player-sleep-bed.sprite, art/src/player-sit-sofa.sprite, art/src/player-read-sofa.sprite, public/sprites/ (3 regenerated PNGs), src/game/poses.ts, src/game/poses.test.ts, this file.

- 2026-10-23 (reviewer): **Review: approve.** Independent checks (not the author's renders):
  - `npm run sprites` regenerates PNGs with no diff, `npm test` (47 files, 980 tests) and `npm run build` pass.
  - Rendered in the real game (headless Chrome, a temporary harness calling the game's own `drawWorld` with the real sprites and `POSES` entries, deleted afterwards) at 1x, 2x and 4x, and looked at every image.
  - [pass] **Sleep:** `player-sleep-bed` differs from `bed-made` only in x 7..35, y 6..88 (400 px), all within the west half, no transparent pixels, so the footprint and the east pillow are untouched. Head sits on the west pillow, centred (x 12..28), covers start right under the chin and taper to the feet as one outlined shape, duvet stripes continue over it. No floating head at 1x or 4x. Draws in front of the bed on the tie (pose is pushed after the bed).
  - [pass] **Sofa:** `player-sit-sofa` and `player-read-sofa` are transparent overlays with no furniture of their own (sit: sofa x 62..75, rows 2..14; read: x 49..75). They sit on the **right-hand cushion** (cushion x 49..88, seam 47..48, centre 68.5 vs figure centre 68.5) and `poses.ts` agrees (`at.x` 61 and 45, abs x 93 for sit). Over the redrawn `sofa-td` the back rail and cushions show through; the head does not touch the sofa's top outline (row 0). Nothing else overlaps it (lamp table is at x 128+).
  - [pass] **Other poses:** `player-type-desk` against the current `desk` and `desk-chair`, and `player-eat-table` against the current `table`, render cleanly at 4x, no stale furniture visible; the author's "no change needed" holds.
  - [pass] Scope: only the three sprites and PNGs, `poses.ts`, `poses.test.ts` and this file; no PLAN.md or other issue edits; no reference photos.
  - [can't verify] How it feels in a live browser (animation, banners over the bed). Not checked here either.
  - [can't verify] The small hand pixel on the book in `player-read-sofa`. At 4x the book reads as a book on the left of the figure, flush against the seam; the hand pixel is too small to judge. `read-sofa` is not used by any task yet.
  - Notes (not blocking): (1) the sleep sprite bakes in the made bed, so sleeping on an unmade bed shows a made bed under the sleeper (same as before this issue). (2) `docs/art-style.md` lines 84 and 150 still describe the old poses (planner edit, as the author noted).
