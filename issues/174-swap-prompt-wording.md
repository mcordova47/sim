---
id: "174"
title: "Shorter swap prompts: drop the 'the'"
short: "Shorter swap prompts"
status: todo
owner: marc + claude
depends_on: ["166", "168"]
summary: "Change the swap task prompts to read 'Change coffee gear', 'Change rug' and so on, and use 'Display trinket' for trinkets."
kind: build
changelog: none
decisions:
  - id: d1
    who: marc
    q: "Drop the word 'the' from every swap prompt?"
    options:
      - "yes: 'Change painting', 'Change plant', 'Change lamp', 'Change rug', 'Change coffee gear' (and so on)"
      - "only the new ones (rug, coffee gear, trinket)"
    recommendation: "yes: 'Change painting', 'Change plant', 'Change lamp', 'Change rug', 'Change coffee gear' (and so on)"
    status: open
  - id: d2
    who: marc
    q: "What should the trinket prompt be?"
    options:
      - "'Display trinket' for adding and for changing"
      - "'Change trinket'"
      - "'Display trinkets'"
    recommendation: "'Display trinket' for adding and for changing"
    status: open
  - id: d3
    who: marc
    q: "Other prompts and task names that contain 'the' ('Water the plant', 'Take out the trash', 'Do the dishes' and so on)?"
    options:
      - "leave them as they are for now"
      - "drop the 'the' from all task names and prompts too"
      - "only where a prompt overflows a narrow phone view"
    recommendation: "leave them as they are for now"
    status: answered
    answer: "drop the 'the' from all task names and prompts too"
    by: marc
    on: 2026-11-24
---

## Goal
Marc (2026-11-24): 'change coffee gear' reads better than 'Change the coffee gear' and takes a bit less space; remove 'the' from various places. For trinkets maybe 'Display trinket', which works for both adding and changing.

## Acceptance criteria
- After issues 166 (rug) and 168 (coffee gear) are merged (they add prompts of their own), change the swap prompts in `SWAP_PROMPT` and wherever else they are built (`src/game/tasks.ts`, `activities/swap-decor.ts`, the text-review strings in docs/text-review.md, docs/tasks.md and the decor docs) to the wording chosen in d1 to d3; the trinket prompt per d2 (note that issue 173 redesigns trinkets, so change whatever is merged then).
- Tests that quote the old prompts are updated, and a test fails if a swap prompt contains ' the '; the narrow phone view's prompt box still fits every prompt (check the longest).
- A `changelog:` line is not needed (`changelog: none`). Standard checks pass.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
