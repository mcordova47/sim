---
id: "134"
title: "Tidy the stale statuses (009, 048, 062, 065, 066, 072, 097)"
short: "Tidy stale statuses"
status: todo
owner: marc + claude
depends_on: []
summary: "Seven old issues show as live threads although most of their work is merged; each needs a status that tells the truth."
kind: chore
decisions:
  - id: d1
    who: marc
    q: "009 (sound, particles, achievements, time of day): its four parts 009a to 009d are all merged. What status should the umbrella have?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "done: everything it described shipped; it has been `blocked` since the game changed direction"
    status: answered
    answer: "done"
    by: marc
    on: 2026-11-15
  - id: d2
    who: marc
    q: "048 (more room for the status panel): the ribbon (086) and the battery (088, 094) shipped, and a second stage was never filed. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "keep open: a stage 2 for the panel and mobile was talked about but is not filed; or move it to ideas"
    status: answered
    answer: "done"
    by: marc
    on: 2026-11-15
  - id: d3
    who: marc
    q: "062 (decor you can swap and buy): the stages are merged and the wishlist lives in docs/decor.md. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "done: the system shipped; the rest is the ideas backlog in docs/decor.md"
    status: open
  - id: d4
    who: marc
    q: "065 (blinds on both windows, dinner plate): reviewed, merged long ago, the file still says `review`. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "done: it is merged and the table already showed it done"
    status: open
  - id: d5
    who: marc
    q: "066 (flattened boxes and collected packages): reviewed, merged, the file still says `review`. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "done: it is merged and the table already showed it done"
    status: open
  - id: d6
    who: marc
    q: "072 (a real pantry of clear bins): reviewed, merged, the file still says `review`. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "done: it is merged and the table already showed it done"
    status: open
  - id: d7
    who: marc
    q: "097 (the codebase walkthrough): the learn book is merged and you are working through it. What status?"
    options:
      - "done"
      - "keep open"
      - "blocked"
    recommendation: "keep open: the walkthrough is ongoing"
    status: open
---

## Goal
The generated pages (issue 130) show issues whose files say `in-progress` or `review` as live threads, and a few of them are not: their work merged long ago and only the status was never closed (the table used to hide this, because it was edited by hand). Decide each status, then the planner edits the files, regenerates the table and closes this issue. No code.

Recorded as data first (Marc, 2026-11-15): each question below is an open decision in the front matter, so it appears in the pages' "What needs you" and the decisions log until it is answered, and can be answered whenever. The planner's recommendations are in each decision.

## Acceptance criteria
- Each decision is answered (or deliberately left open); the planner sets the statuses accordingly, runs `npm run issues`, and the validator has no stale-status warnings for these seven.

## Progress log
- 2026-11-15 (planner): filed with the seven questions recorded before asking any of them, per Marc's rule.
