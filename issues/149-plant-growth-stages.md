---
id: "149"
title: "More growth stages for some plants (a pothos that trails over the bookshelf)"
short: "More plant stages"
status: todo
owner: marc + claude
depends_on: ["147"]
summary: "Some plants get more stages; the pothos eventually trails down over the bookshelf."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which plants get extra stages beyond the four they have now (sprout, small, full, flowering)?"
    options:
      - "pothos and monstera only (they have somewhere to go: trailing, bigger leaves); snake and spider plants stay at four"
      - "every live plant gets a fifth stage, shaped to the plant"
      - "only the pothos, as the first experiment"
    recommendation: "pothos and monstera only: the others look finished at four, and a stage costs a sprite per plant"
    status: open
  - id: d2
    who: marc
    q: "How does the trailing pothos draw over the bookshelf, given the plant slot is 16x16 on the shelf's top?"
    options:
      - "a taller overlay sprite for the late stages, drawn over the bookshelf's top cubes (the plant is already an overlay piece), not hiding any task spot"
      - "keep it inside 16x16 and only show a longer trailing vine within the pot"
    recommendation: "a taller overlay for the late stages: that is the point of the idea, and the bookshelf's top cubes are decorative"
    status: open
---

## Goal
Marc (2026-11-23): after seeing the six new plants (issue 147), some plants should have more growth stages, for example a pothos that eventually flows over the bookshelf.

## Notes (planner)
- Builds on issue 147 (the new plant families `plant-pothos`, `plant-monstera`, `plant-spider`); FAMILIES allows a different number of stages per family, but the slot is 16x16 and an item must equal the slot size, so a taller sprite needs a decision (d2) and probably a small engine change (an overhang drawn over the bookshelf).
- Growth timing is `growthVar` waiting for waterings; a fifth or sixth stage needs its thresholds chosen and tested so the plant does not outgrow the day-33 and day-36 gift pacing in a way that feels like a chore (quiet-collecting rule: no pressure).
- A swapped-in live plant starts small (existing rule), so a fully grown trailing pothos is lost on swap; consider whether the swap list should say so (the inventory notes, issue 109a).

## Acceptance criteria
To be written once d1 and d2 are answered.

## Progress log
- 2026-11-23 (planner): filed on main with its open decisions (the issue file is born on main).
