---
id: "154"
title: "Takeout arrives in a bag, not a package box"
short: "Takeout bag"
status: todo
owner: claude
depends_on: ["153"]
summary: "The takeout meal waiting at the door is drawn as a bag, not the package box."
kind: build
needs: [{who: marc, kind: try, why: "Look at the takeout bag at the front door (order takeout at the nightstand, wait about 2 game hours); then say 'merge 154'", since: 2026-11-23}]
---

## Goal
Marc (2026-11-23), after trying issue 153: the takeout waiting by the front door should look different from a package, more like a bag. Today a meal in the delivery pipe is drawn with the same `delivery-box` sprite at the same tile (col 10, row 8). Draw a takeout bag there while the thing waiting is a meal (and the box while it is a package; if both wait at once, decide and say which is drawn).

## Acceptance criteria
- A new 16x16 text sprite in `art/src` (palette only, no readable text; a paper or plastic bag with a folded top, no brand); `npm run sprites` rebuilds the PNG, committed.
- The door tile draws the bag for a meal and the box for a package; the solid and the E-to-open behaviour are unchanged; the opened-box line and tests still hold.
- Golden frames for a fresh game and the existing box frames do not change; add a frame or test for the bag.
- Look at the art yourself at 8x and in the room; say what you saw.
- Standard checks pass; docs/decor.md (delivery mechanism) and docs/art-style.md updated.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's request after merging 153.
