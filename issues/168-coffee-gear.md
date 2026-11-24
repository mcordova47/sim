---
id: "168"
title: "Coffee gear: more ways to make coffee"
short: "Coffee gear"
status: todo
owner: marc + claude
depends_on: []
summary: "A coffee slot on the table and one on the stove, more apparatus, and task names that follow the apparatus."
kind: build
decisions:
  - id: d1
    who: marc
    q: "What should the aeropress-like device be called (a fake generic or brand name, not the real one)?"
    options:
      - "AIR PRESS"
      - "PNEUMATIC PRESS"
      - "a fake brand name such as PUSHPRESSO"
      - "something else"
    recommendation: "AIR PRESS"
    status: open
  - id: d2
    who: marc
    q: "Which apparatus in the first batch? (the pour-over cone is the default on the table today)"
    options:
      - "table: french press, drip machine, pod machine; stove: percolator, moka pot, briki (a small long-handled pot); the espresso machine, siphon and air press in a second batch"
      - "table and stove with every apparatus at once"
      - "only three: french press, moka pot, drip machine"
    recommendation: "table: french press, drip machine, pod machine; stove: percolator, moka pot, briki; the espresso machine, siphon and air press in a second batch"
    status: open
  - id: d3
    who: marc
    q: "Does the make-coffee duration follow the apparatus (a drip machine quicker than a siphon)?"
    options:
      - "no: only the task name and prompt follow it; pay, energy, mood and duration stay equal (Marc's answer to Q5)"
      - "yes: duration follows too, pay stays equal"
    recommendation: "no: only the task name and prompt follow it; pay, energy, mood and duration stay equal"
    status: open
  - id: d4
    who: marc
    q: "How do they arrive?"
    options:
      - "gifts from day 85 on (three days apart) and in the random-encounter pool when issue 163 lands"
      - "only through the random-encounter pool"
      - "both, at once"
    recommendation: "gifts from day 85 on (three days apart) and in the random-encounter pool when issue 163 lands"
    status: open
---

## Goal
Build steps G and G2 of `docs/decor-expansion-design.md` (section 6), with Marc's answers: d5 of issue 148 (the apparatus changes the task name and prompt, not the pay or the held-mug picture) and d13 (two coffee stations: a table slot and a stove slot; each apparatus fits one; the task is offered where its apparatus sits; the stove slot starts empty). Names are generic nouns or fake brands, never real ones (d12; the aeropress-like device is d1 here).

## Acceptance criteria
- Slot `coffee-table` (kind `coffee`, abs (62, 18, 16x16), a prop on `T` at local (46, 2), default today's dripper so a fresh game looks the same): redraw the `table` and `table-plate` sprites without the dripper and draw the dripper as the default item; check the mug prop and the plate variant still read; and slot `coffee-stove` on a stove burner (kitchen; check the real kitchen sprites for the stove and where it is drawn from; empty by default; kind `coffee`).
- Task text follows the apparatus (the same `taskName` and `itemWord` mechanism issue 149 built for plants, extended to the make-coffee task and its prompt), the make-coffee task is offered at the station that holds an apparatus (and may be offered at both if both hold one), pay and effects stay equal; the mug, dishes and the drink-coffee task work as today.
- The first batch of apparatus from d2 as items with art (palette only, no text), deadpan notes, gift days from d4 (state them); an espresso machine that is wider than its slot may need a narrow stylized look: say so when drawn.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
