---
id: "146"
title: "Drop the task flavor lines and park the approved ones"
short: "Drop task flavor lines"
status: in-progress
owner: claude
depends_on: ["145"]
summary: "Remove the never-drawn task flavor lines from the game and docs; park the ones Marc approved in docs/ideas.md."
kind: chore
---

## Goal
Marc decided (issue 145, d1) to drop the task flavor lines for now. The ones he approved or rewrote (a keep mark in docs/text-review.md) go into docs/ideas.md as a parked idea; the rest are removed and not recorded.

## Acceptance criteria
- No task flavor value or `Interactable.flavor` field remains in src/; tests check name and prompt only.
- docs/ideas.md lists exactly the approved lines.
- Docs and learn-book exercises no longer mention flavor and still work.
- docs/text-review.md still parses (35 task rows kept, marks kept).

## Progress log
- 2026-11-21 (claude): filed.
