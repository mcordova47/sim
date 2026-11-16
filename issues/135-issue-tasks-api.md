---
id: "135"
title: "An API for common issue tasks: answering a decision, and answering from the pages"
short: "Issue tasks API (answer from the pages)"
status: done
owner: marc + claude
depends_on: ["131"]
summary: "A small command, and later a local button on the pages, that edits the issue files correctly when you answer a decision."
kind: design
needs:
  - who: marc
    kind: review
    why: "136 (the edit functions and the command) is approved on branch issue/136-issues-api-command: say merge, or what is off; after merging, try the command once on the real checkout."
    since: 2026-11-15
decisions:
  - id: d1
    who: marc
    q: "How far should the first build go?"
    options:
      - "a command only: `npm run issues -- answer <issue> <decision> \"<answer>\"` (and a few siblings), validated like everything else"
      - "the command, then a local page server with Answer buttons (the same code behind both)"
      - "both at once"
    recommendation: "the command first, then the local server as a second stage once the command has proved itself"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-15
  - id: d2
    who: marc
    q: "When you answer, should it also make the git commit on main?"
    options:
      - "edit the file only and show the commit command to run"
      - "edit the file and commit it on main with your git identity, when the main checkout is clean and on main"
      - "edit and commit, and refuse if any agent has a branch touching that issue"
    recommendation: "edit the file and commit on main when the checkout is clean and on main; otherwise edit only and say why"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-15
  - id: d3
    who: marc
    q: "Which tasks does the API cover first?"
    options:
      - "answer or drop a decision, and defer it (keep it open with a note)"
      - "decisions, plus resolving or adding a `needs` entry"
      - "decisions, needs, and changing an issue's status"
    recommendation: "decisions, plus resolving or adding a `needs` entry; leave status changes (and everything else) to editing by hand for now"
    status: answered
    answer: "as recommended"
    by: marc
    on: 2026-11-15
---

## Goal
Marc (2026-11-15): wdyt about an API for common issue tasks, such as making decisions? It would make sure things are done correctly when he does them (today answering a decision means hand-editing front matter: set `status: answered` and add `answer`, `by` and `on`, then validate and commit), and it could be hooked up to the generated issues pages so that he can answer right there, where all the context is.

## How it works today
- A decision is an entry in an issue's front matter `decisions:` list. To answer it by hand: set `status: answered` (or `dropped`), add `answer: "<what was chosen>"`, `by: marc` and `on: <date>`, then run `npm run issues:check -- --validate`, `npm run issues` (the table), and commit on `main`. The validator rejects an `answered` decision without `answer`, `by` and `on`.
- A `needs` entry is removed when it is resolved.
- The pages (`npm run tools -- issues`) are static files opened from disk: they can read but cannot write.

## Ideas to design (design first)
- **One function behind everything**, in the same module as the validator: `answerDecision(issue, decisionId, answer, { by, on })`, `resolveNeed(...)`, `addNeed(...)`, each editing the front matter in place (keeping key order, comments and quoting; test that nothing else in the file changes), then re-validating before it writes, and refusing on any error with a plain message. The CLI and the page server are thin callers.
- **A local server** (`npm run issues:serve`, bound to 127.0.0.1 only): serves the generated pages and accepts a small POST for those same functions; the pages show **Answer** buttons (choose an option, or write one) only when served this way, so the static build and a machine without the server are unchanged. Safeguards: a per-run token against other tabs and sites writing, refuse if the issue file changed on disk since the page was built (compare a hash), refuse if the main checkout is not on `main` or the file has uncommitted edits, no network exposure, nothing private in responses.
- **Workflow fit:** the answer is recorded on `main` (decisions live there under "record before asking"), so no branch is involved; an agent's open question, if it has one on a branch, is the planner's to record on `main` first. A race with the planner's own edits to the same file is the main risk; the hash check and the clean-tree check are the guard.
- **Siblings later:** `ask` (record a new open decision, in the form the planner writes today), `defer`, `need add/resolve`, `status` (maybe).

## Acceptance criteria
- A design agreed with Marc (the three decisions above answered), then small build issues filed: first the command and its edits with tests over fixtures and the real repo; then, if wanted, the local server and the buttons.

## Progress log
- 2026-11-15 (planner): filed from Marc's question; the three design questions are recorded as open decisions before asking, per Marc's rule.
- 2026-11-15 (planner): Marc took the recommendations on d1 (command first, then the local server), d2 (edit and commit on main when the checkout is clean and on main, otherwise edit only and say why) and d3 (decisions plus resolving or adding a `needs` entry). Build issues 136 and 137 filed.
