---
id: "157"
title: "Takeout bag drawn from the right viewpoint for the south wall"
short: "Bag viewpoint"
status: todo
owner: claude
depends_on: ["155"]
summary: "Redraw bag candidates A and D as seen against the south wall, not from the front."
kind: build
needs: [{who: marc, kind: try, why: "Look at the redrawn takeout bag (browse: cd ../sim-worktrees/157-bag-viewpoint && npm run tools -- options; or order takeout in the game); then say 'merge 157'", since: 2026-11-23}]
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
