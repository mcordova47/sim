---
id: "131"
title: "Issues as data 3: decisions and the decisions log"
status: review
summary: A decisions log and a "Decisions you made, and why" branch, read from the design docs and from new front matter.
unverified:
  - "The decisions page was only looked at in headless Chrome (phone width through a 390 px frame), not on a real phone or in Safari."
  - "The thread and issue filter dropdowns on the log were built but not clicked in a browser."
owner: claude
depends_on: [130]
---

## Goal
Stage 3 of the design: `decisions` and `docs` fields; the decisions log from parsed `ANSWERED by Marc DATE:` lines in the six design docs plus front matter for new questions; the "Decisions you made, and why" branch of a thread.

Design and Marc's answers (2026-11-15): `docs/issues-as-data-design.md` (issues stay Markdown with front matter; read locally with a generated page; the recommendations on its questions 3 to 6 are taken; staged plan in its section 10). Nothing here may put anything private in a public repo (no share links, no photos' content). The repo's working rules apply: an agent edits only its own issue file and its code; the planner edits PLAN.md and `.claude/skills/` (except where this issue says otherwise).

Do not backfill old decisions beyond what parses from the six docs.

## Acceptance criteria
- Parsing tests over the real docs (25 answers by Marc, 5 planner decisions); the log renders; the usual checks; an independent review.

## Progress log


- 2026-11-15 (claude): Started. Plan: `decisions` and `docs` fields and validator rules; a parser for the `ANSWERED by Marc` and `DECIDED by the planner` lines in the six design docs; a decisions log page; the thread branch.
- 2026-11-15 (claude): Built. Fields `decisions` (id, q, options, recommendation, status, answer, by, who, on, doc) and `docs` are validated (closed status, who and by lists, real dates, unique ids, `q1` style ids reserved for parsed questions, answered and defaulted need answer, by and on, doc paths are repo paths that exist, no web addresses). `parseDocDecisions` reads the six docs (091 encounter music, 109 inventory, 117 photo gallery, 113 photo reel, 111 side project config, 106 track editor on phones; the doc to issue map is `DOC_ISSUES`, and a doc named in an issue's `docs` is read too). Variants handled: question before the marker or after it (the gallery doc), options as bullets (A/B/C) or inline (a)/(b), a recommendation sentence or an option marked recommended, a bare answer letter resolved to its option, planner lines with a note (stored as `defaulted`). Counted from the real docs: 25 answered by Marc (15 on 2026-10-28, 10 on 2026-10-29) and 5 decided by the planner, 30 in all, matching the design note. `docs/real-world.md` has no such lines. New page `decisions.html` (newest first, who and when, recommendation, what was chosen, the options folded, a calm Waiting on you band that reads Nothing is waiting on you when empty, optional thread and who filters when scripts run); the thread branch Decisions you made, and why (shown only when a thread has decisions); a Decisions band on issue pages; an open decision for Marc also shows in What needs you as a decide card; `issues.json` gains `decisions`. Tests: `scripts/issues-decisions.test.mjs` (fixtures and the real docs). Looked at phone (390 px frame, no horizontal scroll after fixing the filter selects) and desktop screenshots. Docs and other issues untouched; PLAN.md not regenerated on the branch.
