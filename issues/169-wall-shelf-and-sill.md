---
id: "169"
title: "A wall shelf and a window sill for small things"
short: "Shelf and sill"
status: todo
owner: marc + claude
depends_on: ["185"]
summary: "Three shelf slots on the wall above the bookshelf and a still-only window sill slot."
kind: build
decisions:
  - id: d1
    who: marc
    q: "Does the wall shelf appear in a fresh game?"
    options:
      - "yes: it is a piece of furniture in the room from the start, empty until you own trinkets"
      - "no: it appears when you own your first trinket"
    recommendation: "yes: it is a piece of furniture in the room from the start, empty until you own trinkets"
    status: answered
    answer: "let me see what it looks like and i'll decide"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "What goes on the window sill?"
    options:
      - "still items only (dried arrangements, an empty pot, trinkets), no live plants yet (Marc's answer to Q10 of issue 148)"
      - "anything that fits, live plants included (a much larger change)"
    recommendation: "still items only (dried arrangements, an empty pot, trinkets), no live plants yet"
    status: answered
    answer: "still items only (dried arrangements, an empty pot, trinkets), no live plants yet (Marc's answer to Q10 of issue 148)"
    by: marc
    on: 2026-11-24
---

## Goal
Build steps I and J of `docs/decor-expansion-design.md` (sections 3 and 9): a wall shelf drawn on the wall strip above the cube bookshelf with three slots (`trinket-shelf-1..3`, abs (160, 0), (176, 0), (192, 0), 16x16) and the lower window sill as a still-only second plant slot (`sill-window`, abs (288, 112, 16x16)), both taking trinkets and small instruments, with the rule that a live plant fits only a slot that has plant variables. Depends on issue 167 (the trinket kind and items).

## Acceptance criteria
- The shelf piece (sprite, a legend entry, standing place and a swap task per the design note; check the map, task spots and the stand tile at row 1, col 11 or 12), the three slots, the sill slot and its piece name (the lower window needs its own name; the blinds still work from col 17), the `fits` rule (P8), tests, and the empty-slot behaviour from issue 151.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-25 (planner): trinkets are merged (issue 167) and the Examine card is being built (issue 185); the shelf slots are trinket places, so each gets a Display trinket task and an Examine task like the desk's (design: docs/trinket-display-design.md stage D; Marc's d9 of issue 173: still not sure about the wall shelf, he wants to see how it looks: put the shelf's look on the options page first and ask). The window sill is stage F, optional (d7 of issue 173: later and optional, needs two new window sprites). Not started.
