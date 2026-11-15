---
id: "130"
title: "Issues as data 2: summaries, needs, threads and the generated pages"
status: todo
owner: claude
depends_on: [129]
short: "Issues as data 2: summaries, needs, threads and the pages"
---

## Goal
Stage 2 of the design: the optional fields `summary`, `thread`, `needs`, `unverified`, `kind`, `superseded_by`; the generated static pages (home, thread, "what needs you", an issue as a heading tree, a decisions log if time allows) and `issues.json`, read locally from `dist-issues/` (not committed).

Design and Marc's answers (2026-11-15): `docs/issues-as-data-design.md` (issues stay Markdown with front matter; read locally with a generated page; the recommendations on its questions 3 to 6 are taken; staged plan in its section 10). Nothing here may put anything private in a public repo (no share links, no photos' content). The repo's working rules apply: an agent edits only its own issue file and its code; the planner edits PLAN.md and `.claude/skills/` (except where this issue says otherwise).

Build the generator's second half as in sections 4 to 6 of the design: calm tone (no counts that nag, no urgency language, empty `needs` is the calm state), phone and desktop layouts as mocked, native `details` elements with an Open everything button, the closed sets of pills and kinds, and zero client-side dependencies. The planner updates the three issue skills and `docs/contributing.md` together with this stage (stage 4 of the design).

## Acceptance criteria
- The pages render from the real repo with no errors; the validator covers the new fields; a fixture test per field and per view; `npm run issues:site` (or similar) builds `dist-issues/`; reviewed on both layouts by rendering and looking; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log

