---
id: "145"
title: "Show the task flavor lines in the game"
short: "Show task flavor lines"
status: done
owner: marc + claude
depends_on: ["144"]
summary: "Every task has a flavor line (the jokes in the text review) that the game never draws; decide where to show them."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Task flavor lines (the jokes you rewrote in the text review) are never drawn anywhere in the game: the completion popup shows only points. Where should they appear?"
    options:
      - "on completion, as a line under the points in the award popup (wraps to about two lines)"
      - "while you choose, under the task's name in the task menu or prompt"
      - "as a one-line dialog box after the task ends"
      - "nowhere: keep them as notes and remove them from the text review"
    recommendation: "on completion, under the points in the award popup: it is when the joke lands, and the popup already pays attention to the task"
    status: answered
    answer: "nowhere, for now: the approved and rewritten flavor lines go into docs/ideas.md, the rest are removed (issue 146)"
    by: marc
    on: 2026-11-21
  - id: d2
    who: marc
    q: "The text review's Tasks table still lists a task called Flip the record with a flavor line, but the game's task is Choose a record. What should happen to that row?"
    options:
      - "rename the doc row to match the task (Choose a record)"
      - "drop the row from the text review"
      - "rename the task in the game to Flip the record"
    recommendation: "rename the doc row to match the task as built; the flavor line you wrote is now attached to it"
    status: defaulted
    answer: "rename the doc row to match the task as built"
    by: planner
    on: 2026-11-21
  - id: d3
    who: marc
    q: "Decor design (148, Q1): do the art-free engine work first (empty-slot option, worn outfits, takeout) before drawing anything?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d4
    who: marc
    q: "Decor design (148, Q2): desk right corner for the first trinket, desk left corner kept for clutter (042), a wall shelf above the bookshelf later?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d5
    who: marc
    q: "Decor design (148, Q3): worn outfits first, changed at the nightstand, poses stay in everyday clothes for now?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d6
    who: marc
    q: "Decor design (148, Q4): cut flowers wilt at 3 game days and dry at 5 into a lasting arrangement, and a free task freshens them?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d7
    who: marc
    q: "Decor design (148, Q5): the coffee apparatus changes the task name and prompt, not the pay or the held-mug picture?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d8
    who: marc
    q: "Decor design (148, Q6): takeout ordered at the nightstand phone, eaten at the table for 40 points, +15 energy, +5 mood, no dishes, a container to recycle, no cold timer?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d9
    who: marc
    q: "Decor design (148, Q7): one rug size (64x32) at cols 3-6, rows 3-4, changed at the sofa?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d10
    who: marc
    q: "Decor design (148, Q8): instruments display only for now (a mini keyboard); playable ones later, kalimba first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d11
    who: marc
    q: "Decor design (148, Q9): the worry doll is plain WORRY DOLL in the list, the Spanish name only in its note once the accent is seen in the list?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d12
    who: marc
    q: "Decor design (148, Q10): a second plant slot (window sill) holds still items only at first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d13
    who: marc
    q: "Decor design (148, Q11): replacement furniture only as gifts, one piece at a time, record stand first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d14
    who: marc
    q: "Decor design (148, Q12): generic noun names for items (finger skateboard, pod machine, plunger-style press), no brands?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
needs: [{who: marc, kind: decide, why: "Say 'merge 147' when ready (six new plants; reviewed; branch issue/147-more-plants); art worth a look in the room first", since: 2026-11-23}, {who: marc, kind: decide, why: "Answer the 12 questions at the end of docs/decor-expansion-design.md (issue 148, on its branch until merged); each has a recommended default", since: 2026-11-23}, {who: marc, kind: decide, why: "Say 'merge 148' when ready (decor design note; approved on the third review; branch issue/148-decor-expansion-design)", since: 2026-11-23}]
---

## Goal
Found while applying the second batch of text review rewrites (issue 144): `Interactable.flavor` (every task's one-line joke) is carried in the data and checked by tests for font coverage, but it is never drawn: the completion popup shows only points and multipliers, and no menu or prompt shows it. Marc has now rewritten eleven of these lines. Decide where they show (the first decision), then build it.

## What the agent found
- The longest flavor lines are 77 characters (recycle-boxes, 461 px at 1x), take-trash 75 and shower 70; the screen is 320 px wide (224 on the narrow view), so showing a flavor needs a wrap layout (about two lines at 320, three at 224).
- The text review's Tasks table also lists "Flip the record" (the second decision).

## Acceptance criteria
- Decisions answered; then a small build issue (the drawing, tests, both views) filed and done; the text review table matches the game.

## Progress log
- 2026-11-20 (planner): filed from the 144 hand-back; both questions recorded as open decisions before asking.
- 2026-11-21 (planner): Marc: not now. The flavor lines he approved or rewrote go into docs/ideas.md and the rest are removed from the game's data (issue 146); d2 (the stale Flip the record row) is settled as part of that work. Closed.
