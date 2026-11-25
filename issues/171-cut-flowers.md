---
id: "171"
title: "Cut flowers that wilt and dry"
short: "Cut flowers"
status: todo
owner: marc + claude
depends_on: ["182"]
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
Stage C of `docs/plant-pots-design.md` (issue 179, section 4), replacing the earlier plan that put cut flowers in the plant pot: cut flowers go in the VASE pot (`pot-vase`, issue 182), and wilt and dry in place there (Marc's d1 of 171 and d7 of 179: 'for now that's fine'; his future idea, drying as an active choice, is in docs/ideas.md and would replace this later). Marc's earlier answers: two bunches first (tulips in a glass vase, daisies in a jar), arriving as gifts and later from random encounters, several over time. Cut flowers wilt after about three game days and dry at about five into a lasting dried arrangement (nothing is lost), and a free task freshens them (not gated by `liveSlot`: it needs its own gate, as the design note says).

## Acceptance criteria
- A `flowers` family with its sprites (fresh, wilting, dried: 6 sprites for the two bunches; the dried look may reuse the existing dried arrangements' style), `driesAfter`, a per-slot clock on the vase (variables `vaseStage` and `vaseAge`, not the plant pot's `plantDry`; the clock only runs while the bunch is displayed: a bunch in the inventory does not age), `Decor.become` (the item changes look in place, as the design says; d7 of 179 chose in place), state-aware `isLive`/`frozenVars`, the free task 'Freshen flowers' (no 'the'; item-aware text) offered while the flowers are wilting or dried, the reset rule when a new bunch replaces a dried one, saves and the sync merge (decor and state fields copied by hand in three places of `sync/merge.ts`), tests (time passing, sleep, swapping, the inventory not aging, an old save).
- The two bunches as items for the vase (check issue 182's `plantKind`s), deadpan notes, `from: A PACKAGE`; they join the item pool and the ladder (issue 183; a difficulty tier suggested) and have no gift days.
- Look at all art and the result in the running game yourself (dev server with `?own=` ids; see docs/decor.md) at 1x and 8x on desktop and phone size and say what you saw; the reviewer must too; give Marc exact commands with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean; golden frames for a fresh game unchanged; new strings into docs/text-review.md; docs/decor.md 'What issue 171 built'; a `changelog:` line (at most 140 characters) stays.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24 (planner): the plant pots design (issue 179, approved on its branch, d4 to d10 awaiting Marc) moves cut flowers from the `plant-shelf` slot to the new vase pot slot `pot-vase` with its own per-slot clock instead of `plantDry`, and the 2 px lower bowl means `golden frames unchanged` no longer holds after its stage A. Do not start 171 before Marc answers d4 to d7 of issue 179; then rewrite this issue's goal and criteria for the vase.
- 2026-11-25 (planner): rewritten for the vase pot (issue 182 is merged) after the plant pots design (179); not started.
