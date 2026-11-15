---
id: 128
title: Issues as data: a schema and progressive-disclosure views (research and design only)
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-11-15): the issues live in this repo, so we get to define what an issue looks like. That means issues could be **data** with a well-defined schema, which makes presentations and visualisations nearly free. The problem it answers: in some projects it is hard to see everything that is going on and every decision that is waiting. The way Marc understands things best is **headlines first, then progressively drilling down**, with what needs him and other helpful tags clearly shown. The flashcards app's agent built such a briefing for him on the fly as a hand-written page (a private artifact) and he found it very helpful; the goal is to design an issue system that makes that pattern, progressive knowledge sharing, almost free instead of something an agent has to compose each time.

**This issue is research and design only: implement nothing** (no scripts, no schema enforcement, no migration, no changes to existing issues).

## The pattern to reproduce (from that briefing; a private page, so the structure is described here, not linked)
- **Home screen:** a snapshot stamp ("if it disagrees with GitHub, GitHub is right"), a short "The short version" (about six bullets), **What needs you** (a few cards, each with a pill such as Do or Later, a one-line why, and a link that jumps to the detail), **In flight** (a couple of running items), and **The threads**: one card per subject with a title, one line, and a status pill (Shipped, Settled, Merged, In progress, Reference).
- **A thread screen:** a title, a status line, an "Open everything" button, and a **tree of one-line branches** (native `details` elements) that open one at a time, so only one subject is on screen. Typical branches per thread: *What it looks like now*, *What shipped*, *Decisions you made, and why*, *A bug I caused*, *Still open* (with "not verified" items), *The numbers* (a small table with a plain note on confidence).
- Previous/next links between threads, a tab strip to jump between them, a glossary page for the project's own words, issue and PR numbers linking to the source of truth, and honest caveats ("checked" versus "suspected", "I did not measure").

## What exists today
- 164 issue files, each with the same five front-matter keys (`id`, `title`, `status`, `owner`, `depends_on`) and the same top-level sections (`Goal`, `Acceptance criteria`, `Progress log`; many others vary). Status values: `todo`, `in-progress`, `blocked`, `review`, `done`. Owners: `claude`, `agent`, `marc`, and combinations.
- `PLAN.md` holds a hand-maintained table of every issue (the same data again, edited by sed in each merge; the issue file's own status is only current on its branch until merged, so the two drift).
- Decisions are asked and answered one at a time in conversation and then recorded as prose in a design doc or the issue ("ANSWERED by Marc 2026-10-29: (a)"), with recommendations. There is no machine-readable "needs Marc" and no list of open questions.
- Groupings exist only by naming (117a to 117g, 111a to 111f) and by `depends_on`.

## What to design and research (deliver `docs/issues-as-data-design.md`; ask Marc one question at a time at the end)
1. **Prior art** (practical, cited briefly): GitHub issue forms and project fields, Linear, Backstage-style descriptors, ADR/MADR for decisions, Obsidian Dataview or Bases over front matter, mdBook or static-site front matter, JSON Schema or Zod validation of front matter, Org-mode or Taskwarrior, "docs as data" in general; what each gets right for progressive disclosure and "what needs me".
2. **A schema** that stays human-writable Markdown with front matter: candidate fields such as a one-line `summary` (the headline), `needs` (who, and what kind: decide, do, try, review, wait), tags and area, `thread`/`parent` (so 117a to 117g group under one subject), structured **decisions** (question, options, recommendation, status, the answer, who and when: this is what the "decisions you made, and why" and "What needs you" views are made of), `unverified` items, links, dates. Which fields are required, which derive from existing data, and which agents fill in. Could the **heading structure of the body** be the drill-down tree (headings as depth) so no new body format is needed?
3. **Views**, as mockups at phone and desktop width (ASCII is fine): the home screen, a thread, a "needs you" inbox, a decisions log, a dependency or timeline view, and `PLAN.md`'s table as a *generated* view (ending the hand edits and the branch-versus-main status drift). What is generated at build time (a static page, no server, works on GitHub, locally, and offline on a machine without Claude) versus on the fly.
4. **Workflow fit:** how `work-issue`, `review-issue` and `merge-issue` (the skills in `.claude/skills/`) would keep the fields up to date, how a Claude-less machine edits an issue safely, and how CI validates the schema so it cannot rot.
5. **Migration** of the existing 164 issues (tolerant at first; agent backfill of summaries and decisions; what is worth backfilling and what should stay as it is) and a **staged plan** where each stage is useful alone.
6. **Risks and the project's tone:** the zen-garden rule (a "needs you" view must be calm: no counts that nag, no urgency language, not a to-do wall), the weight of the schema, two sources of truth, privacy (the repo is public: nothing private in issues or generated pages; the private briefing's share link is not to be committed), and whether this is worth its cost.
7. Worked examples: three real issues (a small one, a staged feature with decisions such as 117, and a research-style one) rewritten in the proposed schema, and the mockup of the home screen filled with the repo's real current state.

## Acceptance criteria
- A design agreed with Marc (the design note answers items 1 to 7 and ends with a few real questions, each with a recommendation), then build issues filed. Nothing implemented in this issue.

## Progress log
- 2026-11-15 (claude): research and design note written, `docs/issues-as-data-design.md` (prior art, schema, views, generator, workflow, migration, five stages, questions for Marc); nothing implemented. Not yet reviewed.
