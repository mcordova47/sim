---
id: "157"
title: "Takeout bag drawn from the right viewpoint for the south wall"
short: "Bag viewpoint"
status: review
owner: claude
depends_on: ["155"]
summary: "Redraw bag candidates A and D as seen against the south wall, not from the front."
kind: build
unverified:
  - "Not played in a browser: the bag was checked on a floor tile composite (8x and 1x), not on the real door tile in a running game."
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
