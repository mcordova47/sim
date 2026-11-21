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
needs: [{who: marc, kind: decide, why: "Say 'merge 146' when ready (drops the task flavor lines; reviewed twice; branch issue/146-drop-task-flavor)", since: 2026-11-21}]
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
