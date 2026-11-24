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
    status: answered
    answer: "pothos and monstera only (they have somewhere to go: trailing, bigger leaves); snake and spider plants stay at four"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "How does the trailing pothos draw over the bookshelf, given the plant slot is 16x16 on the shelf's top?"
    options:
      - "a taller overlay sprite for the late stages, drawn over the bookshelf's top cubes (the plant is already an overlay piece), not hiding any task spot"
      - "keep it inside 16x16 and only show a longer trailing vine within the pot"
    recommendation: "a taller overlay for the late stages: that is the point of the idea, and the bookshelf's top cubes are decorative"
    status: answered
    answer: "a taller overlay sprite for the late stages, drawn over the bookshelf's top cubes (the plant is already an overlay piece), not hiding any task spot"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "Plant stages (149, d3): should the swap list or the item note warn that a grown plant starts small again when swapped?"
    options:
      - "no change for now"
      - "add a short line to the swap list"
      - "add it to each plant's note"
    recommendation: "no change for now"
    status: open
---

## Goal
Marc (2026-11-23): after seeing the six new plants (issue 147), some plants should have more growth stages, for example a pothos that eventually flows over the bookshelf.

## Notes (planner)
- Builds on issue 147 (the new plant families `plant-pothos`, `plant-monstera`, `plant-spider`); FAMILIES allows a different number of stages per family, but the slot is 16x16 and an item must equal the slot size, so a taller sprite needs a decision (d2) and probably a small engine change (an overhang drawn over the bookshelf).
- Growth timing is `growthVar` waiting for waterings; a fifth or sixth stage needs its thresholds chosen and tested so the plant does not outgrow the day-33 and day-36 gift pacing in a way that feels like a chore (quiet-collecting rule: no pressure).
- A swapped-in live plant starts small (existing rule), so a fully grown trailing pothos is lost on swap; consider whether the swap list should say so (the inventory notes, issue 109a).

## Acceptance criteria
Decided by Marc (d1 and d2, 2026-11-23): only the pothos and monstera get extra stages (the snake plant and spider plant stay at four); the late stages are a taller overlay sprite drawn over the bookshelf's top cubes, not hiding any task spot.
- **Stages are per family.** Today every live family has four stages (`FAMILIES`: `stages: 4`) and the watering thresholds (`PLANT.wateringsToGrow`) and the `plantStage` variable's maximum are shared. Make the stage count and the thresholds per family (the snake plant and spider plant behave exactly as before, with the same thresholds and saves), and let the pothos and monstera have more (the agent proposes how many and the thresholds, with a short rationale; the pothos reaches the trailing stage only after a good while and nothing is lost or punished by waiting; quiet-collecting rule: no pressure, nothing required).
- **A taller sprite for the late stages.** An item's sprite may be taller than its 16x16 slot for the late stages, drawn as an overlay over the bookshelf's top cubes (check the real sprite of the bookshelf and the map: it covers no task spot, no other prop, and does not hide the bookshelf's cube contents that matter; the plant overlay is already drawn over the shelf's top rows 36 to 51). Say how the rule is expressed in data (for example an item or family field giving the extra height) so a later plant can use it; the size check for the swap still compares the slot's 16x16 footprint.
- **Art.** New sprites for the extra stages, palette only, no text, drawn from the shelf's viewpoint (see docs/art-style.md, plants: the plants keep the top-front view); the pothos's last stage flows over the shelf; the monstera's extra stages are bigger leaves. Look at each stage in the room at 1x and at 8x, and in the wilted state, and say what you saw; the reviewer must too. The art could use the outfit generator's approach if useful, but this is hand-drawn work.
- **Swap behaviour.** A swapped-in live plant starts small (existing rule): a fully grown trailing pothos is lost on swap. Decide whether the swap list or the item's note should say so (the inventory notes are one line, 80 characters), and if a note change is needed add it to docs/text-review.md. Open question for Marc, if it comes up: record it as a `decisions` entry with a recommendation rather than guessing.
- **Saves.** An old save with a stage in the old range loads unchanged; a hand-edited stage above a family's maximum is cut down, never an error. The `plantStage` maximum follows the longest family.
- **Tests.** Per-family stage counts and thresholds; the pothos and monstera reach each new stage and the wilted look at each stage; the snake plant and spider plant are unchanged; the overlay is drawn at the right position and size; the golden frames for a fresh game do not change (nobody has the pothos or monstera at the start).
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; docs/decor.md ('What issue 149 built') and docs/art-style.md updated.

## Progress log
- 2026-11-23 (planner): filed on main with its open decisions (the issue file is born on main).
