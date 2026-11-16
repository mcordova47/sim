---
id: "138"
title: "Close out the in-progress threads"
short: "Close out in-progress threads"
status: todo
owner: marc + claude
depends_on: []
summary: "Nine questions about what is really left on the threads still showing as in progress, so each is closed, parked or started."
kind: chore
decisions:
  - id: d1
    who: marc
    q: "049 (mobile): all four stages shipped (087, 090, 092, 093) but the root still says in-progress. Status?"
    options:
      - "done"
      - "keep open"
    recommendation: "done: nothing is left in it"
    status: answered
    answer: "done"
    by: marc
    on: 2026-11-15
  - id: d2
    who: marc
    q: "091c (encounter music: docs, and gathering the tunable numbers): the numbers already live in ENCOUNTERS.music and you tuned by ear. Have an agent write the docs now (docs only, no sound change)?"
    options:
      - "yes, an agent writes the docs"
      - "drop it"
      - "keep it for later"
    recommendation: "yes: docs only, so it is safe; then close 091"
    status: answered
    answer: "yes, an agent writes the docs"
    by: marc
    on: 2026-11-15
  - id: d3
    who: marc
    q: "106e (phone track editor: long press and drag painting, optional): did the phone editor feel fine without it?"
    options:
      - "drop it into ideas"
      - "keep it as a todo"
      - "build it"
    recommendation: "drop it into ideas.md unless you missed it; the issue said to skip it if stages 1 to 4 felt fine"
    status: answered
    answer: "drop it into ideas"
    by: marc
    on: 2026-11-15
  - id: d4
    who: marc
    q: "114c (guitar: a pause-screen line showing skill, optional; the guitar timing game and the wrong-note sounds stay on hold). What now?"
    options:
      - "drop it into ideas"
      - "keep it as a todo"
      - "build it"
    recommendation: "drop it into ideas.md: it is optional and a skill line risks reading as a stat to chase"
    status: answered
    answer: "drop it into ideas"
    by: marc
    on: 2026-11-15
  - id: d5
    who: marc
    q: "111e (side project: `when` conditions so one drift follows the real room). When?"
    options:
      - "keep it as a todo for later"
      - "build it next"
      - "drop it into ideas"
    recommendation: "keep it as a todo: nothing needs it yet"
    status: answered
    answer: "keep it as a todo for later"
    by: marc
    on: 2026-11-15
  - id: d6
    who: marc
    q: "111f (side project: one real effect). You said this waits for you to pick the effect. Park it as an idea until you have one?"
    options:
      - "park it in ideas"
      - "keep it as a todo"
      - "pick one now"
    recommendation: "park it in ideas.md until you have an effect in mind"
    status: answered
    answer: "park it in ideas"
    by: marc
    on: 2026-11-15
  - id: d7
    who: marc
    q: "127 (Spanish verb drills): the design questions are filed in the issue. Start them now?"
    options:
      - "yes, start the design"
      - "not yet"
    recommendation: "yes if the flashcards app has deployed the drills (you resolved the wait, so I think it has)"
    status: answered
    answer: "not yet"
    by: marc
    on: 2026-11-15
  - id: d8
    who: marc
    q: "117g (photo gallery last pass): it has two parts, the text lines (which the text review walkthrough, issue 139, will cover) and trying the gallery on your phone. Which is done?"
    options:
      - "both are done"
      - "the phone check is done; the text lines are for the walkthrough"
      - "neither yet"
    recommendation: "the phone check is done if you have tried the gallery and the sofa scene on your phone; the text lines go to the walkthrough"
    status: open
  - id: d9
    who: marc
    q: "120 and 124 (pause legend on the narrow view; the side project skipping only a bad line) are the learn-book tasks for modules 11 and 8. Keep them for you?"
    options:
      - "keep them for me (the learning modules)"
      - "give them to an agent"
    recommendation: "keep them for you; they are small and ready"
    status: open
---

## Goal
After tidying the stale statuses (issue 134), these threads still show as in progress on the pages. Some are done in everything but the status, some have one small optional piece, and some need a call from Marc. Recorded as open decisions first (Marc's rule), with the planner's recommendations; the planner then edits the statuses, moves parked items into `docs/ideas.md`, and starts anything that was chosen.

## What is left, per thread (planner's read, 2026-11-15)
- **026 Spanish flashcards:** 127 (the verb drills) is the only open child.
- **049 Mobile:** all four stages shipped; the root's status is stale.
- **091 Encounter music:** 3 of 4 shipped; 091c (docs) is left.
- **097 The walkthrough:** ongoing by design (no children).
- **106 Track editor on phones:** 4 of 5 shipped; 106e is optional polish.
- **111 Side project:** 111e (`when` conditions), 111f (an effect, needs a pick) and 124 (skip a bad line; a learn-book task).
- **114 Guitar skill:** 3 of 4 shipped; 114c is an optional pause line; the timing game and wrong-note sounds are on hold in ideas.
- **116 Simagotchi name:** 120 (the narrow pause legend; a learn-book task).
- **117 Photo gallery:** 117g (text lines and a phone pass).
- **Planned, not started:** 037 (the text pass, after the text review) and 042 (desk clutter, needs art).

## Acceptance criteria
- Each decision is answered (or deliberately left open); the planner applies them: statuses set, parked items moved to ideas, chosen work started; `npm run issues` is current and the validator shows no stale-status warnings for these threads.

## Progress log
- 2026-11-15 (planner): filed from Marc's question about what is left, with the nine questions recorded before asking.
