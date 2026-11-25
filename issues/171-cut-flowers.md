---
id: "171"
title: "Cut flowers that wilt and dry"
short: "Cut flowers"
status: todo
owner: marc + claude
depends_on: []
summary: "A bunch of cut flowers that wilt after about three game days and dry into a lasting arrangement; a free task freshens them."
kind: build
decisions:
  - id: d1
    who: marc
    q: "Which flowers and vases first?"
    options:
      - "two bunches: tulips in a glass vase and daisies in a jar"
      - "one bunch to start (tulips)"
      - "something else"
    recommendation: "two bunches: tulips in a glass vase and daisies in a jar"
    status: answered
    answer: "two bunches: tulips in a glass vase and daisies in a jar"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "How does a bunch arrive?"
    options:
      - "as a gift (and later from a random encounter) like the plants; you may receive several over time"
      - "only from random encounters"
    recommendation: "as a gift (and later from a random encounter) like the plants; you may receive several over time"
    status: answered
    answer: "as a gift (and later from a random encounter) like the plants; you may receive several over time"
    by: marc
    on: 2026-11-24
---

## Goal
Build step K of `docs/decor-expansion-design.md` (section 2). Marc answered (d4 of issue 148): fresh flowers wilt at 3 game days and dry at 5 into a lasting dried arrangement (nothing is lost), and a free task freshens them. Needs state-aware `isLive`/`frozenVars` and a `driesAfter` family field, a `fresh-flowers` task with its own gate (not `liveSlot`, per the design note's review), and item-aware task text (issue 149 built the mechanism).

## Acceptance criteria
- A `flowers` family with its sprites (fresh, wilting, dried), `driesAfter`, the free task, the reset rule when a new bunch replaces a dried one, saves, tests (time passing, sleep, swapping, a bunch kept in the inventory does not age), deadpan notes, gift days (state them).
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (planner): the plant pots design (issue 179, approved on its branch, d4 to d10 awaiting Marc) moves cut flowers from the `plant-shelf` slot to the new vase pot slot `pot-vase` with its own per-slot clock instead of `plantDry`, and the 2 px lower bowl means `golden frames unchanged` no longer holds after its stage A. Do not start 171 before Marc answers d4 to d7 of issue 179; then rewrite this issue's goal and criteria for the vase.
