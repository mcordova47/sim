---
id: "160"
title: "A simple changelog for production releases, from the issues"
short: "Release changelog"
status: todo
owner: marc + claude
depends_on: []
summary: "Draft a high-level changelog of what a production release adds, from the done issues merged since the last release."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Where should the changelog show up?"
    options:
      - "a command that prints a draft (npm run changelog) from what is on main and not yet on production, which you read before deploying and can paste into a GitHub release"
      - "the same command, but a CHANGELOG.md is also committed at each release"
      - "a draft in the deploy workflow's summary or a GitHub release created on deploy"
      - "an in-game 'what's new' page as well (a later idea)"
    recommendation: "a command that prints a draft: nothing committed, nothing to forget, and you can edit before using it"
    status: open
---

## Goal
Marc (2026-11-24): a simple, high-level changelog for production releases, generated from the issue files.

## Notes (planner)
- **The raw material exists.** Each merge to `main` is a commit "Merge NNN: title", and each issue file has `title`, `short`, `summary`, `kind` (design, build, research, fix, umbrella, chore) and a status. The commits on `main` that are not on `production` (`git log production..main`, or `origin/production..main`) are exactly what a release would add.
- **Filtering.** Players care about `build` and `fix` issues; `design`, `research`, `chore` and `umbrella` are mostly process. An optional front matter line (for example `changelog: "Order takeout at the nightstand and eat it at the table."`) would let an issue say its player-facing sentence; without it the `summary` is used; `changelog: none` (or a non-player kind) leaves it out. Everything stays plain data, validated by `npm run issues:check`.
- **Grouping.** Group by kind (New, Fixes), newest first; link each line to its issue number.
- **Public repo.** The changelog is generated from public issue text only; nothing private. Because gifts arrive on later game days, a line can say when new things start arriving in play.
- Not for decor or outfit ids; the sentence is for people.

## Acceptance criteria
To be written once d1 is answered.

## Progress log
- 2026-11-24 (planner): filed on main with its open decision (the issue file is born on main).
