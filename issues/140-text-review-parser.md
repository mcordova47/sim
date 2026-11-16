---
id: "140"
title: "Text review walkthrough 1: the parser and the in-place mark function"
short: "Text review 1: parser and marks"
status: review
owner: claude
depends_on: ["139"]
summary: "A parser turns text-review.md into one item per string, and a tested function writes a mark back in place."
kind: build
unverified:
  - "The pre-existing failures in scripts/issues-edit.test.mjs (8) and issues-site.test.mjs (1) come from main's current issue data (134 d1 is answered now), not from this work; checked by reading, not by running them on main."
  - "No page uses this yet (issue 141), so how the cards read to Marc is unseen."
---

## Goal
Text review walkthrough 1: the parser and the in-place mark function.

Design and Marc's answers (2026-11-15): issue 139 (`issues/139-text-review-walkthrough.md`): the marks live in `docs/text-review.md` and are edited in place by the tool in one standard mark format; the walkthrough is a page in the local issues server, one line at a time (the text, where it appears, then Keep, Soften or Rewrite with a replacement), newest sections first; a mark is only recorded: an agent applies marked lines to the game's text later, in a batch. The local server and its guards are issue 137 (`scripts/issues-serve.mjs`, `scripts/issues-edit-io.mjs`). The repo is public: nothing private; never push.

## What to build
- A parser for `docs/text-review.md` (read the whole file first: tables with a mark column, bullets with a trailing mark after a dash, lists under headings with a context paragraph, the typing text and ad sections, nested `###` headings; the format has grown over several issues) that yields one item per string: a stable id (section path plus the line's position and a short hash of its text, stable across edits to other lines), the section and heading, the text, the section's context paragraph (where it appears and the issue it came from), the line's current mark and note if any, and whether it is a table row or a bullet.
- **One standard mark format** going forward (the design says one): for bullets `- text - keep`, `- text - soften: note`, `- text - rewrite: new text` (check how existing marked lines look and keep them parseable); for table rows the mark column holds `keep`, `soften: note` or `rewrite: new text`. Document the format at the top of `docs/text-review.md` (keep the existing "How to mark" paragraph accurate).
- A tested pure function `markLine(text, itemId, mark, note)` (text in, text out) that edits only that line in place, leaves every other byte of the file alone, refuses on an unknown or changed item (the line's text no longer matches the id's hash), and can also clear a mark (so a mistake can be undone). An I/O layer on the same pattern as `scripts/issues-edit-io.mjs` (hash guard against a stale page, the clean-main-checkout commit rule with Marc's git identity, never pushes) in a separate module.
- Order helper: items in the order the design chose: the newest sections first (the sections of issues 117, 113, 109, 102 to 104 and similar come from the section titles' issue numbers; the older ones after, in document order); a function that returns the next unmarked item after a given one, with Skip meaning 'later' (kept in a per-session skipped list, not in the file).
- Tests over fixtures (every shape, every refusal, the in-place guarantee on a file with odd characters and comments) and over the real doc (parse all items; the count of items equals a hand count from a script of your own; round trip: mark and clear a line leaves the file byte for byte unchanged). Work on COPIES in a temp directory; never edit or commit the real doc from a test.

## Acceptance criteria
- The parser finds every string in the real doc (report the count per section); marking and clearing round-trips byte for byte; refusals are plain; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review with a written entry.

## Progress log
- 2026-11-15 (claude): plan: scripts/text-review.mjs (pure parse, mark, clear, order), scripts/text-review-io.mjs (hash guard, clean-main commit, never pushes), tests on fixtures and on copies of the real doc, and the "How to mark" paragraph.
- 2026-11-15 (claude): built. Files: scripts/text-review.mjs, scripts/text-review-io.mjs, scripts/text-review.test.mjs, docs/text-review.md (only the "How to mark" paragraph, line 5). The issues scripts are untouched (the io module imports hashOf, commitCheck and showDiff from issues-edit-io.mjs).
  - Items: 298 in the real doc (per section: Pause title 2, Side-project 4, PHOTOS 113c 27, Tasks 35, Dialogs 15, contemplate 15, Code 12, Email 12, Mixed 8, seven ads 58, Narrator table 3, every card 9, ad blocker 3, Flashcards progress 10, guest 15, touch 14, transfer 11, sync 11, inventory 21, silhouette 2, gallery 7, LOOK 4). A separate counting script (python, line by line) and the test's own hand counter agree section by section.
  - Shapes: table rows with a last "mark" column (35 task rows, 3 narrator rows); bullets at any depth; dialog lines tagged (prompt)/(label)/(text), including a tagged parent that has children; multi-string lines ("A. - / B. - / C. -", 13 strings in 2 lines) are one item per string. Not items: the "State variable meanings" list (8 lines, internal), one untagged list-heading bullet (the "Sofa scene" line whose three child lines are the strings). Nothing in the doc was unparseable.
  - Mark format: `- text - keep`, `- text - soften: note`, `- text - rewrite: new text`; in tables the mark column holds the same without the dash. A bare trailing dash or an empty cell is "unmarked". Existing marked lines: there are none in the real doc (74 lines carry a bare dash as an empty mark, which stays valid and becomes `- text - keep` when marked). Unknown hand-written table marks parse as kind "unknown" and are never overwritten (only cleared).
  - Clearing: restores the bare dash on multi-string segments and on lines in sections that mostly use it, else removes the mark. Two lines (side-project line 21, PHOTOS line 41) do not match their section's habit, so a caller that wants byte-for-byte undo passes `previous.placeholder` (every mark result returns `previous`); with it, mark then clear of all 298 items is byte for byte.
  - Open points for the planner: the doc has the dialog tree twice (Dialogs and "contemplate"), so 15 lines appear twice (items carry `duplicateOf`); sections 109a and 109c still say "keep, change or cut" in their intro (not changed; "change" and "cut" are not marks).
  - Checks: npm test for text-review 33 tests pass; the rest of the suite has 9 failures that do not touch this work (see unverified); npx tsc --noEmit, npm run build, npm run check:dist, issues:check pass.
