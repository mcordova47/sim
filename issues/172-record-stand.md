---
id: "172"
title: "A new record stand"
short: "Record stand"
status: todo
owner: marc + claude
depends_on: []
summary: "The first replacement furniture: a different record stand, as a delivery."
kind: build
decisions:
  - id: d1
    who: marc
    q: "What should the new record stand look like?"
    options:
      - "a wooden crate on legs, and a wire rack"
      - "a low wooden cabinet"
      - "something else"
    recommendation: "a wooden crate on legs, and a wire rack"
    status: answered
    answer: "try some out and depending on how it looks i'll either go with it or look up some inspo"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "How does it arrive?"
    options:
      - "as a delivery like other decor (later from a random encounter); the old stand goes to the inventory"
      - "only through the random-encounter pool"
    recommendation: "as a delivery like other decor (later from a random encounter); the old stand goes to the inventory"
    status: answered
    answer: "as a delivery like other decor (later from a random encounter); the old stand goes to the inventory"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "Which record stand? Open the options page (group Record stand): A crate, B wire rack, C low cabinet, D lid cabinet."
    options:
      - "A (a crate of records, no turntable drawn)"
      - "C (a low wooden cabinet with a turntable on top)"
      - "none of these: I will look up inspo"
    recommendation: "C (a low wooden cabinet with a turntable on top)"
    status: answered
    answer: "keep them all: ship every candidate (A, B, C, D, E, E2, F) as an item, so there are always more things to get"
    by: marc
    on: 2026-11-25
needs: [{who: marc, kind: try, why: "Try the six record stands facing north: cd ~/Dev/repos/mcordova47/sim-worktrees/172-record-stand && npm run dev, add ?own=furniture-record-stand-crate,furniture-record-stand-wire,furniture-record-stand-cabinet,furniture-record-stand-lidded,furniture-record-stand-suitcase-pink,furniture-record-stand-suitcase-teal, Change record stand at the stand; the gramophone was dropped (nothing read as one); then say 'merge 172'", since: 2026-11-25}]
---

## Goal
Build the first piece of replacement furniture from `docs/decor-expansion-design.md` (section 8): the record stand (16x16 at abs (144, 112)), chosen first because it has no pose and no prop (Marc agreed: furniture only through the delivery pipe, one piece at a time, record stand first). A replacement is a new sprite of the same size on the same map piece, which keeps its sprite name and object name so tasks and poses find it; a `furniture` slot for the piece (kind `furniture`) and the swap task.

## Acceptance criteria
- Check the `record-play` task, the record stand's particle emitter in `config.ts` (found by sprite name), the task spots and solids; the slot `furniture-record-stand` (default the current stand), the new item or items, the THINGS cell (a sofa-sized thing cropping is not an issue here), gift days (state them), tests.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
