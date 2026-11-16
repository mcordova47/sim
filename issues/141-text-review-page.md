---
id: "141"
title: "Text review walkthrough 2: the page in the local server"
short: "Text review 2: the page"
status: todo
owner: claude
depends_on: ["140"]
summary: "One line at a time, with Keep, Soften and Rewrite, served by the local issues server."
kind: build
---

## Goal
Text review walkthrough 2: the page in the local server.

Design and Marc's answers (2026-11-15): issue 139 (`issues/139-text-review-walkthrough.md`): the marks live in `docs/text-review.md` and are edited in place by the tool in one standard mark format; the walkthrough is a page in the local issues server, one line at a time (the text, where it appears, then Keep, Soften or Rewrite with a replacement), newest sections first; a mark is only recorded: an agent applies marked lines to the game's text later, in a batch. The local server and its guards are issue 137 (`scripts/issues-serve.mjs`, `scripts/issues-edit-io.mjs`). The repo is public: nothing private; never push.

## What to build
- `text.html` in the pages served by `npm run issues:serve` (reuse the server, token, hash and clean-checkout guards from issue 137 and the edit I/O from issue 140): one card at a time for the unmarked lines in the chosen order (newest sections first). The text is shown large, in the game's pixel font if it reads well (the generated pages already embed it), with the section heading and its context paragraph beneath ("where it appears, the issue it came from"); buttons **Keep**, **Soften** and **Rewrite** (Soften and Rewrite open a box for the note or the replacement text), **Skip** (comes back later in the session), **Back** (the previous item, so a mark can be changed or cleared); keyboard shortcuts (K, S, R, arrows); a calm progress line ("a few left in this section"; never a count that nags, no urgency words, no red); an empty state when everything is marked ("Nothing is waiting for a mark.").
- Linked from the home and decisions pages' navigation when served; shown only when the server answers (the static build is unchanged and byte-identical).
- Each action calls the tested mark function through the guarded endpoint and commits on main when the checkout is clean (as the decision answers do). The page updates in place.
- Phone and desktop layouts (390 px and 1200 px, light and dark, no horizontal scroll); tests for the endpoint and the markup; a real run in headless Chrome on a COPY of the repo (temp git repo on main), never the real one.

## Acceptance criteria
- Marking, skipping, going back and clearing work on a copy in headless Chrome; every refusal is calm; the static pages are unchanged without the server; the usual checks pass; an independent review that exercises the flow on a copy.

## Progress log

