---
id: "140"
title: "Text review walkthrough 1: the parser and the in-place mark function"
short: "Text review 1: parser and marks"
status: todo
owner: claude
depends_on: ["139"]
summary: "A parser turns text-review.md into one item per string, and a tested function writes a mark back in place."
kind: build
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

