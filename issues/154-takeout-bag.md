---
id: "154"
title: "Takeout arrives in a bag, not a package box"
short: "Takeout bag"
status: review
owner: claude
depends_on: ["153"]
summary: "The takeout meal waiting at the door is drawn as a bag, not the package box."
kind: build
unverified:
  - "The bag was only viewed in a composed strip and at 8x, not in the running game in a browser."
needs:
  - who: marc
    kind: review
    why: "Look at the new takeout bag at the front door and say if it reads as a bag."
    since: 2026-11-23
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
- 2026-11-23 (claude): started in the worktree. Plan: new sprite `takeout-bag`, a derived `takeoutBag` variable, door appearance picks the bag first.
- 2026-11-23 (claude): done. Drew `art/src/takeout-bag.sprite` (first try was tan on the tan floor and hard to tell from the box, so redrew it cream with a white folded top, crease, two staples, a tan right side and a grease spot). Looked at it at 8x next to the box and composed in a floor strip with the door sprite: it reads as a paper bag, the box as a taped box. `takeoutBag` state var (state-vars.ts), synced in `Game.syncParcel`; the door appearance in apartment.ts lists the bag variant first. Rule: meal alone shows the bag; a package waiting (alone or with the meal) shows the box; solid, E and the task are still driven by `parcel`, unchanged. Tests: takeout.test.ts (bag alone, box, both, empty again after opening) and deliveries.test.ts (drawn calls at 160,128). Golden frames unchanged (not re-recorded). Docs updated: decor.md, art-style.md. `npm test` and `npm run build` pass. Not checked: the in-browser look at 1x/scale and the live game (no browser here).
