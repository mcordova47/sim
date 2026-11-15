---
id: "130"
title: "Issues as data 2: summaries, needs, threads and the generated pages"
status: review
owner: claude
depends_on: [129]
short: "Issues as data 2: summaries, needs, threads and the pages"
summary: "The generated pages: home, threads, issues and what needs you."
---

## Goal
Stage 2 of the design: the optional fields `summary`, `thread`, `needs`, `unverified`, `kind`, `superseded_by`; the generated static pages (home, thread, "what needs you", an issue as a heading tree, a decisions log if time allows) and `issues.json`, read locally from `dist-issues/` (not committed).

Design and Marc's answers (2026-11-15): `docs/issues-as-data-design.md` (issues stay Markdown with front matter; read locally with a generated page; the recommendations on its questions 3 to 6 are taken; staged plan in its section 10). Nothing here may put anything private in a public repo (no share links, no photos' content). The repo's working rules apply: an agent edits only its own issue file and its code; the planner edits PLAN.md and `.claude/skills/` (except where this issue says otherwise).

Build the generator's second half as in sections 4 to 6 of the design: calm tone (no counts that nag, no urgency language, empty `needs` is the calm state), phone and desktop layouts as mocked, native `details` elements with an Open everything button, the closed sets of pills and kinds, and zero client-side dependencies. The planner updates the three issue skills and `docs/contributing.md` together with this stage (stage 4 of the design).

## Acceptance criteria
- The pages render from the real repo with no errors; the validator covers the new fields; a fixture test per field and per view; `npm run issues:site` (or similar) builds `dist-issues/`; reviewed on both layouts by rendering and looking; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log

- 2026-11-15 (claude): Started in worktree `../sim-worktrees/130-issues-stage-2`. Plan: validator rules and derivations (thread status, pills, needs, unblocks, heading tree) in `scripts/issues.mjs`; a second module `scripts/issues-site.mjs` for `issues.json` and the static pages (home, thread, issue, needs) written to `dist-issues/` by `npm run issues:site`; tests; fill a few `summary`, `thread` and `needs` fields on real issues (no body edits); look at the pages at 390 px and desktop width in headless Chrome. Decisions log is stage 3 and is left out.
- 2026-11-15 (claude): Done, set to review. What changed:
  - `scripts/issues.mjs`: validator rules for `summary` (non-empty; warning over 120 characters; warning when missing on in-progress or review work only, so the old backlog does not nag), `kind` (closed set), `unverified` (list of text), `needs` (who, kind, why, since checked; a `wait` needs `on`; unknown keys warn), a warning for needs left on a done issue; derivations: thread membership (id letter or `thread`), derived pill (Shipped, Planned, Paused, In progress, from members that are not superseded; the root own status ignored when it has members), progress words, unblocks, needs newest first (Marc's separate from everyone else's), body to heading tree, canonical-heading roles and order, progress-log leaves, `issues.json` builder. `area` and `decisions` are not validated (not needed in this stage).
  - `scripts/issues-site.mjs` (new, `npm run issues:site`, optional `-- --branches`): writes `dist-issues/` (home, needs, threads, one thread page per thread with members, one page per issue, `issues.json`, `style.css`, `site.js`). Zero dependencies; the one tiny script only powers Open everything; pages work with no JS. Colours are the game palette with one accent; light and dark by `prefers-color-scheme`; phone-first.
  - Seeded front matter only (no bodies): `summary` on 17 issues, `needs` on 110, 095, 037 and a `wait` on 127, `thread` on 087 (049) and 127 (026).
  - Tests: `scripts/issues-site.test.mjs` (32 tests: each new field, each pill, needs ordering, body parsing, markdown and escaping, recently shipped, the pages from fixtures, and the real repo including no absolute paths or outside links); `scripts/issues.test.mjs` untouched.
  - Checked: `npm test` (163 files pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass. `npm run issues:check -- --table` reports the PLAN.md block stale (the 130 row, expected on a branch; main only).
  - Looked at in headless Chrome through a 390 px and a 1200 px iframe (scrollWidth equals clientWidth, no horizontal scroll, at 390 and 1200, for home, thread, issue and needs pages), dark and light.
  - Choices: "In flight" is only the `--branches` overlay (files alone have stale in-progress and review statuses, which made the band noisy). The `--branches` code ran but nothing differed from the files here, so its positive case is unverified. Decisions log, glossary and PLAN link left out (stage 3). Links in issue bodies to outside pages are shown as text only.
  - Not checked: Safari and Firefox (exclusive `details name` and Open everything), a real phone, the screenshots only in Chrome.

