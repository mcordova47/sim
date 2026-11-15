---
id: "132"
title: "Issues as data 4: an agent backfill of summaries and threads"
status: done
owner: claude
depends_on: [130]
summary: "One-line summaries and thread groups for the issues the home and thread pages show as cards"
unverified:
  - "Whether the summaries read well to Marc; he has not sampled them yet."
  - "The home and thread pages on a real phone; headless screenshots were clipped by the window width."
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

2026-11-15 (reviewer, fresh agent): **Review. Verdict: approve.**
- Scope: `git diff main...HEAD` touches only `issues/*.md`. In the 88 other issue files, every added line is `summary:` or `thread:` and nothing is removed (checked with a grep over `-U0`); no PLAN.md, code or doc changes.
- Summaries: 107 of 169 issues now have one; none over 120 characters, none with a URL or share link, no duplicates, none equal to its title (my script, outside the repo). Read about 70 against their title, Goal and log; spot-checked claims against the files (113b cap 60 and dedupe, 117f eight seconds, 091b jingle for success only, 113a 22 colours, 117e six pictures, 094 segments, 114b arrow-key melody, 109c ??? cell). No over-claims found. Tone is calm and deadpan throughout. Minor, not blocking: 109c says "with no hint" though the cell carries a line ("YOU HAVE SEEN ONE OF THESE"); 114a says "levels one to five" while its log says six levels (level 6 is 114b); the name Marc appears in four summaries (091d, 111f, 113e, 117g), fine for this repo but you may prefer "the owner"; 111e "meant to" reads slightly hedged.
- Threads: 16 roots, all exist, none is itself a member, no chains or cycles, root only. Choices are sensible and conservative; the least obvious are 108 under 114 (guitar timbre, which 114a depends on) and 121 under 026 (flaky flashcards test). Acceptable.
- `npm run issues:check -- --validate`: 169 valid, no errors, no length or missing-summary warnings; the only warnings are done-with-open-member (026, 106, 111, 116, 117, 128) and 095 needs, none from this work. `npm test` 3739 pass; `npx tsc --noEmit` clean; `npm run build` and `npm run check:dist` pass.
- Pages: `npm run issues:site` builds; viewed home, thread-048, thread-111 (and made thread-096) at 390px with headless Chrome. Headlines show on thread cards and thread pages. The screenshots are clipped on the right, which looks like headless Chrome's minimum window width rather than a page defect; not confirmed on a real phone.
- Criteria: every open and recent issue has a summary within the limit: pass. Validator warning-free for them: pass. Marc read a sample: can't verify (recorded as unverified). Usual checks: pass. Independent review: this entry.
