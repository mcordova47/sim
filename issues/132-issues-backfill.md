---
id: "132"
title: "Issues as data 4: an agent backfill of summaries and threads"
status: review
owner: claude
depends_on: [130]
summary: "One-line summaries and thread groups for the issues the home and thread pages show as cards"
unverified:
  - "Whether the summaries read well to Marc; he has not sampled them yet."
thread: "128"
---

## Goal
Stage 5 of the design: fill about 70 `summary` lines and the non-id thread groups, so the home has real headlines.

Design and Marc's answers (2026-11-15): `docs/issues-as-data-design.md` (issues stay Markdown with front matter; read locally with a generated page; the recommendations on its questions 3 to 6 are taken; staged plan in its section 10). Nothing here may put anything private in a public repo (no share links, no photos' content). The repo's working rules apply: an agent edits only its own issue file and its code; the planner edits PLAN.md and `.claude/skills/` (except where this issue says otherwise).

Agents propose; Marc reads a sample. Closed `area` vocabulary chosen in the design. No private content.

## Acceptance criteria
- Every open and recently done issue has a one-line summary within the limit; the validator has no warnings for them; a sample was read by Marc; the usual checks; an independent review.

## Progress log

2026-11-15 (agent): Wrote `summary` for 87 issues: every thread root and member shown on the home or a thread page, every not-done issue and the ones worked in the last days (progress-log dates run from 2026-10-22; nearly everything closed within two weeks of today, so "recent" is effectively all families touched lately). Drafted by three sub-agents by range, then read as one list and adjusted (091a, 094, 117b, 132). All are 120 characters or fewer. Existing 20 summaries were left alone. Wrote `thread` on 41 issues, naming the root only: 048 (086, 088, 094), 049 (090, 092, 093), 026 (082, 083, 089, 121), 095 (102 to 104), 043 (079, 080), 062 (073), 066 (070), 096 (098 to 101), 111 (124, 125), 116 (119, 120), 122 (123), 128 (129 to 132), 114 (108), 040 (060, 061), 063 (105), 075 (077). 113a to 113e already belong to 113 by id. Edited only `summary` and `thread`. Stale-looking statuses noticed besides the planner's list: 009 is `blocked` though 009a to 009d are done; the validator now also warns that 111, 116 and 128 are done with open members (124, 120, 132), expected until those close. Not checked: that the summaries read well on a real phone; the summaries lean on each issue's Goal and log, not on the code.
