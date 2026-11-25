---
id: "172"
title: "A new record stand"
short: "Record stand"
status: review
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
    status: open
unverified:
  - "How the candidates feel next to the rest of the room in a browser: judged from composited PNG crops of the room at 6x and 10x, not from the options page in a browser."
  - "The swap list in the running game with a replacement stand (only the test placeholder, in unit tests): no real stand exists yet."
needs: [{who: marc, kind: decide, why: "Pick a record stand from the options page (d3), or say you want something else", since: 2026-11-25}]
---

## Goal
Build the first piece of replacement furniture from `docs/decor-expansion-design.md` (section 8): the record stand (16x16 at abs (144, 112)), chosen first because it has no pose and no prop (Marc agreed: furniture only through the delivery pipe, one piece at a time, record stand first). A replacement is a new sprite of the same size on the same map piece, which keeps its sprite name and object name so tasks and poses find it; a `furniture` slot for the piece (kind `furniture`) and the swap task.

## Acceptance criteria
- Check the `record-play` task, the record stand's particle emitter in `config.ts` (found by sprite name), the task spots and solids; the slot `furniture-record-stand` (default the current stand), the new item or items, the THINGS cell (a sofa-sized thing cropping is not an issue here), gift days (state them), tests.
- Look at all art yourself in the room at 1x and 8x and say what you saw (the reviewer must too); tell Marc how to see it with absolute `~/...` paths.
- Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git status clean; golden frames for a fresh game unchanged; new strings go into docs/text-review.md; docs/decor.md gets a short 'What issue NNN built' section.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-25 (claude): started in the worktree on branch issue/172-record-stand. Plan: stage 1 builds the `furniture-record-stand` slot and swap (the stand keeps its sprite and object name, the starting stand is an owned item, a non-obtainable test placeholder exercises the swap); stage 2 adds an options-page group with four candidates over the real room. Per d1 no candidate ships as an item until Marc picks.
- 2026-11-25 (claude): stage 1, the slot and the swap. `furniture-record-stand` (kind `furniture`, 16x16 at abs (144, 112), object `record stand`, default `furniture-record-stand-old` = the current stand, an owned starting item); the legend piece `R` has `slot` and keeps its name and sprite name. Checked: `record-play` is still on the piece and has its task spot (a test), the notes emitter in `PARTICLES.ambientEmitters` finds the piece by sprite name `record-stand` (a test; the sprite name does not change on a swap), the solids are the level's and untouched. The swap task is `swap-furniture-record-stand`, prompt "Change record stand" (`SWAP_PROMPT_SLOT`), offered only when an owned stand is in the inventory (so not today); the old stand goes to the inventory (tested). Placeholder: `furniture-test-stand` (TEST RECORD STAND, test tag, stool sprite, never owned); no candidate ships. Gift days: none (a replacement arrives as a delivery after Marc picks, d2). THINGS shows nine starting things now (tests updated). Files: `src/game/decor-data.ts`, `apartment.ts`, `tasks.ts`, `decor-record-stand-172.test.ts`, three existing tests' counts, `docs/decor.md`, `docs/text-review.md`.
- 2026-11-25 (claude): stage 2, the options page. `npm run tools -- options`, group "Record stand": the stand now plus four candidates (sprites in `art/options/record-stand/`), each drawn over the real room at 1x with an 8x crop (`scripts/options.mjs`, `scripts/room-compose.mjs` got a `swap` option). What I saw, at 10x and in the room: A crate reads clearly as a crate of records (no turntable); B reads as a metal shelf unit with a turntable on top and records below (wire quality weak at this size); C reads clearly as a low cabinet with a round turntable and knobs; D reads as a lidded cabinet but is the darkest and lowest contrast. A first draft of B and C with a grey plinth read as a small TV and was redrawn. Open decision d3 added (recommendation C). Checks: `npx tsc --noEmit`, `npm test` (4173 pass, golden frames for a fresh game unchanged), `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` (git status clean).
