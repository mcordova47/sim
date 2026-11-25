---
id: "170"
title: "An empty pot you can fill"
short: "Empty pot"
status: todo
owner: marc + claude
depends_on: []
summary: "An empty pot as a plant item, and a way to fill it."
kind: build
superseded_by: "179"
decisions:
  - id: d1
    who: marc
    q: "How is the pot filled?"
    options:
      - "the empty pot is a still item in the plant slot; swapping a plant in fills it (simplest)"
      - "a Plant a seed task turns the empty pot into a live plant at its smallest stage"
      - "a plant gift arrives potted into the empty pot if the pot is the one on the shelf"
    recommendation: "the empty pot is a still item in the plant slot; swapping a plant in fills it (simplest)"
    status: answered
    answer: "this sounds fine, but i'll check how it feels"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "There is already an empty pot on top of the bookshelf; is it the same pot?"
    options:
      - "yes: reuse that pot as the item's art and make the slot show it when empty"
      - "no: draw a new empty pot item"
    recommendation: "yes: reuse that pot as the item's art and make the slot show it when empty"
    status: answered
    answer: "i think not relevant anymore?"
    by: marc
    on: 2026-11-24
---

## Goal
Build step F of `docs/decor-expansion-design.md` (section 1). Marc (2026-11-24) notes there is already an empty pot on top of the bookshelf; check the real bookshelf sprite and the plant slot before drawing anything.

## Acceptance criteria
- Find the existing pot in the art and the map and say what it is; the empty pot item per d1/d2 (a still item that hides the care tasks like the dried arrangements), the THINGS entry and note, tests, and its arrival (a gift day after the others, state it).
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (planner): superseded by issue 179: Marc clarified that the bookshelf has three pots (one empty, one dried arrangement, one snake plant) and each pot should hold its own kind of plant; the design is in 179.
