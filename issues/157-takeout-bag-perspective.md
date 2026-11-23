---
id: "157"
title: "Takeout bag drawn from the right viewpoint for the south wall"
short: "Bag viewpoint"
status: done
owner: claude
depends_on: ["155"]
summary: "Redraw bag candidates A and D as seen against the south wall, not from the front."
kind: build
unverified:
  - "Not played in a browser: the bag was checked on a floor tile composite (8x and 1x), not on the real door tile in a running game."
  - "Reviewer did not run the game: how the bag looks on the real door tile in a running browser (scale, floor and door context, the TAKEOUT label) is unchecked."
needs:
  - who: marc
    kind: review
    why: "Look at the new takeout bag (A2) in the options page and the game and say if it reads as a bag."
    since: 2026-11-23
---

## Goal
Marc (2026-11-23): the takeout bag options A (tall paper bag with a twine handle) and D (carton with a wire handle) look good, but they are drawn from the wrong perspective for something standing against the south wall. The door tile is at the south wall and the main room is drawn from the sofa side, so things against that wall are seen from behind and above (see docs/art-style.md on the sofa, the guitar and the south-wall pieces, and how the package box on the same tile is drawn). Redraw A and D from the right viewpoint, and put the better of the two in the game in place of the current bag.

## Acceptance criteria
- Read docs/art-style.md first and say in the log what the viewpoint rule for the south wall is and how the package box follows it.
- Two redrawn candidates (A and D), compared on the door tile next to the package box and the old bag, at 8x and 1x; choose the one that reads clearly as a bag and not a box; say what you saw.
- The chosen bag replaces `takeout-bag`; `npm run sprites` rebuilds the PNG; tests and golden frames updated only as needed; standard checks pass.
- If it is a close call, add a decision to this file with a recommendation rather than guessing.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's feedback on the art options (issue 155). Waits for 155 to be merged (the candidates live in art/options).
- 2026-11-23 (claude): started. Plan: read the art rule, redraw A and D from behind and above, compare on a door-tile composite beside the package box and the old bag at 8x and 1x, replace `takeout-bag`.
- 2026-11-23 (claude): done. Rule (docs/art-style.md, Perspective): pieces against a south wall are drawn near top-down, as if seen from behind and above: the top fills most of the sprite and the front is a thin slice or nothing. `delivery-box` follows it: a flat lid with tape down the middle and a blank label, with only a thin dark band on the north edge. The sofa and guitar likewise show mostly top. My first try (an open mouth seen from above) read as a monitor (A) and a face/robot (D), so I closed the tops. Result at 8x and 1x: A2 (pinched white paper fold on top, twine handle loop standing up, thin cream front slice with a tan side) reads as a bag even at 1x because of the handle bump on the silhouette; D2 (closed carton top, wire arch, ear clips) reads as a pot or bucket, not a takeout bag. The old bag and the box read as two boxes. Chose A2, not a close call. Files: art/src/takeout-bag.sprite, public/sprites/takeout-bag.png (npm run sprites), art/options/bag/bag-a-south-wall.sprite and bag-d-south-wall.sprite and options.json (browse with `npm run tools -- options`), docs/art-style.md (takeout-bag line). Checks: npm run build ok; npm test 173 files pass (golden frames unchanged: the door tile is not in them). The bag is seen only while a takeout meal waits (state var takeoutBag). Not checked: running game.
- 2026-11-23 (reviewer, independent): **Review: approve** (with one judgement call below).
  - Art rule: docs/art-style.md, Perspective: south-wall pieces are near top-down, as if seen from behind and above, top filling most of the sprite and the front a thin slice or nothing; `delivery-box` is a model (lid with tape, thin dark north band). The author's summary of the rule is accurate.
  - **Sprite validity (my own checks):** parsed all five with scripts/sprite-lib.mjs: no errors, all 16x16, 0 semi-transparent pixels, palette keys all valid. `art/src/takeout-bag.sprite` is identical to `bag-a-south-wall.sprite` apart from the comment line. `npm run sprites` regenerates `public/sprites/takeout-bag.png` with no diff (the committed PNG matches the source). No text, print or logo in any of the three bags.
  - **What I saw** (floor-wood tile under each, order new bag, A2, D2, delivery-box, old bag; 8x, 4x and 1x composites in the scratchpad): the new bag (and A2, same pixels) is a cream/white closed paper bag: a twine handle loop standing up, a white pinched fold with taupe crinkle marks, then a cream slice with a tan right side and a rounded ink bottom. It is clearly a bag at 1x too, because the handle bump breaks the silhouette; it does not look like a box and is clearly different from the package box next to it (the box has a flat lid with tape and a label, square corners, a dark north band). D2 is a grey-lid carton with a wire arch and reads as a pot or a bucket, not a takeout bag, so choosing A2 over D2 is right and not a close call. The old 154 bag read as a second box (square, flat).
  - **Judgement call (not blocking): is it drawn from behind and above?** Partly. The top (handle plus pinched fold) is about 9 rows and the cream front slice is 3 rows, so the "top fills most of the sprite, front a thin slice" rule is met by proportion, and it follows the box's size and outline. But the standing-up handle and the rounded bottom edge are front-view cues, so it reads a little like a bag seen slightly from the front. I think that is the right trade at 16x16 (a bag seen purely from above has no silhouette that says bag, and the author's first try, an open mouth from above, read as a monitor and a face). Marc is the judge; his own look is still the open `needs` entry.
  - **Criteria:** (1) viewpoint rule and box stated in the log: pass. (2) A and D redrawn, compared on a floor tile beside the box and old bag at 8x and 1x, chosen with a reason: pass (I viewed the PNGs myself). (3) chosen bag replaces `takeout-bag`, PNG rebuilt, tests and goldens: pass (`npm run build` ok; `npm test` 173 files, 3954 passed, 3 skipped; no golden frames changed, none show the door tile). (4) close call decision: not needed, A2 over D2 is clear; I raised the viewpoint judgement call above for Marc instead.
  - **Wiring:** unchanged from 154 and still correct: `apartment.ts` variants `takeout-bag` when `takeoutBag >= 1`, then `delivery-box` when `parcel >= 1`; `state-vars.ts` declares `takeoutBag` (0..1, "no task sets it"); `game.ts syncParcel` sets it only when the meal waits and no package does. Covered by takeout.test.ts and deliveries.test.ts (both pass). The diff touches no code, so no regression risk beyond the PNG.
  - **Scope:** changed files are art/src/takeout-bag.sprite, the PNG, two option sprites, options.json, one line of docs/art-style.md and this issue file. Nothing else, PLAN.md untouched. Minor nit: the comment in `bag-a-south-wall.sprite` says "two staples" but the sprite has taupe crinkle marks and the style doc says no staples; harmless. No reference-photos content or personal details.
  - **Not verified:** the running browser game (scale and look on the real door tile, with the TAKEOUT label).
  - `npm run issues:check -- --validate` passes. The PLAN.md table needs updating (planner).
