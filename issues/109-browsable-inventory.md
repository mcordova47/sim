---
id: 109
title: A browsable inventory, like a pokedex
status: done
owner: marc + claude
depends_on: [073]
summary: "A browsable inventory in the pause screen shows what you own, without counts or pressure"
needs:
  - who: marc
    kind: review
    why: "143 (your 17 text rewrites applied to the game) is approved on branch issue/143-apply-text-rewrites: say merge, or what is off."
    since: 2026-11-16
decisions:
  - id: d1
    who: marc
    q: "Your longer item notes need more room, so the THINGS grid now shows three rows (15 things a page) instead of four (20). Keep three rows?"
    options:
      - "keep three rows; no note is shortened"
      - "go back to four rows, and shorten the notes that overflow"
    recommendation: "keep three rows: nothing of yours is shortened, and it only costs one more page"
    status: open
---

## Goal
Marc (2026-10-28): a browsable inventory, like a pokedex: a place to look through everything you own (and perhaps quiet silhouettes of what you do not). Fits the collecting-as-zen-garden rule: no pressure, no completion percentage nagging, no scarcity.

## What to do (design first)
- Ask Marc, one question at a time: where it lives (pause screen?), what each entry shows (sprite, name, a deadpan line, where it came from), whether unowned items show as silhouettes, whether items can be placed from there (today swap lives in the decor flow, issue 062/073), and how it works by touch.
- Then write the design in `docs/decor.md` and split into small issues.

## Acceptance criteria
- A short design agreed with Marc, then build issues filed.

## Progress log

- 2026-10-28 (claude): design written in `docs/inventory-design.md` (pause-screen THINGS page, read-only first, optional silhouettes for seen items, four staged issues, five open questions). Status unchanged.
- 2026-10-28 (planner): Marc answered all five questions; build issues 109a, 109b, 109c filed (109d, put up from here, dropped by his answer).
