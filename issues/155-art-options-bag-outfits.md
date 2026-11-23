---
id: "155"
title: "Art options to browse: the takeout bag and the outfits"
short: "Bag and outfit art options"
status: todo
owner: marc + claude
depends_on: []
summary: "Candidate art for the takeout bag and the three outfits, to browse and choose from before anything ships."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Art options (155): which takeout bag? (A tall paper bag with a twine handle, B rolled-top bag, C bag with a drink cup, D takeout carton with a wire handle)"
    options:
      - "A"
      - "D"
      - "B or C"
      - "something else or draw another round"
    recommendation: "A"
    status: answered
    answer: "A and D look good, but both are drawn from the wrong perspective for something against the south wall (redo from the right viewpoint; see issue 157)"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "Art options (155): which casual outfit? (A grey hoodie, B tan cardigan over a tee, C striped tee with chinos, D denim jacket over a tee)"
    options:
      - "D"
      - "B"
      - "A or C"
      - "something else or draw another round"
    recommendation: "D"
    status: answered
    answer: "keep the current casual, plus A (grey hoodie), B (cardigan) and D (denim jacket); several outfits per category are allowed"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "Art options (155): which going-out outfit? (A dusk-blue jacket with a red scarf, B light-blue button-up, C plum dress, D camel blazer over a tee, E long taupe coat, F mustard jacket over a tee)"
    options:
      - "A"
      - "C"
      - "F"
      - "something else or draw another round"
    recommendation: "A"
    status: open
  - id: d4
    who: marc
    q: "Art options (155): which pajamas? (A sky-and-white striped set, B blush tee with plum shorts and slippers, C white bathrobe with an orange belt)"
    options:
      - "A"
      - "B"
      - "C"
      - "something else or draw another round"
    recommendation: "A"
    status: open
needs: [{who: marc, kind: try, why: "Browse the options: cd ../sim-worktrees/155-art-options && npm run tools -- options; then answer the four choices (bag, casual, out, pajamas)", since: 2026-11-23}]
---

## Goal
Marc (2026-11-23), after trying issues 152 and 154: the takeout bag still reads a bit like a box, and the outfits are unclear, especially the going-out one (what is it meant to be?). Produce candidate art and a way to browse it, with a plain label saying what each option is meant to be, so Marc can choose. Nothing in the shipped sprites changes in this issue; the chosen options become a follow-up build issue (and update the art in 152 and 154 or replace it).

## Acceptance criteria
- Candidate sprites live outside the shipped sprite folders (for example `art/options/`), so `npm run sprites` and the build are unchanged.
- **Bag:** at least four candidates with clearly different silhouettes (not a rectangle like the box: for example a tall bag with a handle loop, a rolled-top paper bag, a bag with a wider belly and tapered top, a takeout carton with a handle), each 16x16 in the room palette, no text or brand, each labelled with what it is.
- **Outfits:** first, for the existing three (casual, out, pajamas) say plainly what each one is currently drawn as (read the sprites in art/src, issue 045's file and docs/art-style.md; be honest if it is unclear). Then for each of casual, out and pajamas give at least three candidates (the idle-down frame is enough at this stage), clearly different from each other and readable at 16x16, each labelled with what it is meant to be (for example for out: a jacket and scarf, a button-up shirt and dark trousers, a dress, a blazer over a tee). Give the going-out outfit the most options (at least five).
- A browsing page the planner can hand to Marc: all candidates large (8x and 1x), grouped by thing, each with a letter and its label, the current art shown first for comparison, and a way to see them on the room's floor or against the player's other frames. It should be reachable with one command (for example `npm run tools -- options`) and built into an ignored folder; it must also be viewable without Claude.
- The agent looks at every candidate itself and drops the ones that do not read; the reviewer does the same and says what they saw.
- No readable text in sprites, no brands, nothing from reference-photos/.
- Standard checks pass; `npm run sprites` leaves git status clean.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's request.
