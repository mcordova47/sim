---
id: "139"
title: "A text review walkthrough: one line at a time, like answering decisions"
short: "Text review walkthrough"
status: todo
owner: marc + claude
depends_on: ["137"]
summary: "Walk through the unmarked text-review lines one at a time and mark each keep, soften or rewrite, with context beside it."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Where should the marks live?"
    options:
      - "in docs/text-review.md, edited in place by the tool, in one standard mark format"
      - "in a data file the tool reads, with docs/text-review.md generated from it"
    recommendation: "in docs/text-review.md, edited in place: it is the file you already know, and the tool is a careful editor of it"
    status: answered
    answer: "in docs/text-review.md, edited in place by the tool, in one standard mark format"
    by: marc
    on: 2026-11-15
  - id: d2
    who: marc
    q: "What should the walkthrough look like?"
    options:
      - "a page in the local issues server, one line at a time: the text, where it appears, then Keep, Soften or Rewrite (with your replacement)"
      - "a terminal command that steps through the lines, answering by key"
      - "both"
    recommendation: "the page in the local server first, the same flow as answering decisions; a terminal version later if wanted"
    status: open
  - id: d3
    who: marc
    q: "What happens after a mark?"
    options:
      - "the mark is only recorded in the doc; an agent applies the marked lines to the game's text in a batch (tests guard the text rules)"
      - "the tool also edits the line in the game's source"
    recommendation: "marks only: an agent applies them in a batch, so a wording change never goes into the code unreviewed"
    status: open
  - id: d4
    who: marc
    q: "Which lines come first?"
    options:
      - "everything unmarked, in the document's order"
      - "the newest sections first (gallery, sync, inventory, photos), then the older ones"
      - "only lines the game shows often (tasks and dialogs) first"
    recommendation: "the newest sections first, since they are the freshest in your mind and the oldest were written before the text rules settled"
    status: open
---

## Goal
Marc (2026-11-15), after answering the stale decisions on the page and finding it pleasant: the text review (`docs/text-review.md`, about 400 lines, issue 037 and the many sections added since) would be nice the same way, walked through one thing at a time instead of a long document to mark.

## How it works today
- `docs/text-review.md` lists every player-visible string by section (tasks as a table with a mark column, dialogs, typing text, ad copy, flashcards, the touch layer, the sync and transfer pages, the inventory lines, the PHOTOS pages, and more), each as a table row or a bullet. A mark is written by hand: `keep`, `soften` or `rewrite` (with a note or replacement), after a dash or in the mark column. Nothing changes in the game until a line is marked. Only about one line in the file is marked today.
- The local issues server (`npm run issues:serve`, issue 137) already edits issue files from the pages through tested functions with a hash guard and a clean-main-checkout commit rule.

## Ideas to design (design first; the four questions above are recorded as decisions)
- A parser for the doc's several shapes (table rows with a mark column, bullets with a trailing mark, lists under a heading with a note) that yields one item per string: its section and heading, its text, the context sentence of the section (where it appears and the issue it came from), and its current mark.
- A page in the local server, `text.html`: one card at a time, the unmarked lines in the chosen order; the text large (in the game's pixel font if practical, since it is the game's text), the section note under it, three buttons Keep, Soften, Rewrite, a box for the note or replacement, Skip (comes back later), Back; a calm progress line ("a few left in this section", never a count that nags). Each action edits `docs/text-review.md` in place through a tested function (the same guard and commit rule as the decisions).
- Applying the marks to the game's text (the original job of issue 037: drop "the", tone down the jokes) stays a separate step done by an agent in a batch, with the existing tests that guard the text rules.

## Acceptance criteria
- A design agreed with Marc (the four decisions answered), then small build issues filed: the parser and the in-place mark function with tests over the real doc; then the page.

## Progress log
- 2026-11-15 (planner): filed from Marc's request; the four design questions recorded before asking.
