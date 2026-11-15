---
id: "131"
title: "Issues as data 3: decisions and the decisions log"
status: todo
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

