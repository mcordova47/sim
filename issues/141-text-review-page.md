---
id: "141"
title: "Text review walkthrough 2: the page in the local server"
short: "Text review 2: the page"
status: review
owner: claude
depends_on: ["140"]
summary: "One line at a time, with Keep, Soften and Rewrite, served by the local issues server."
kind: build
unverified:
  - "How the cards feel to Marc over a long session (pixel font at 24px for short strings, plain text for long ones) is unseen; only screenshots were looked at."
  - "Decision d1 (duplicates) is implemented as 'mark once, applies to every copy' behind DUPLICATE_POLICY; the duplicate rule also covers identical lines repeated inside the seven ads, not only the dialog tree, because duplicateOf is by identical text."
  - "Touch use on a real phone was not tried; the phone layout was checked at 390 px in headless Chrome only."
decisions:
  - id: d1
    who: marc
    q: "The dialog tree appears twice in the text review (under Dialogs and under contemplate), so 19 lines are duplicates. Mark each once?"
    options:
      - "mark each once: the walkthrough shows it once and the mark applies to both copies"
      - "mark both copies separately"
    recommendation: "mark each once, so you are never asked the same line twice"
    status: open
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
- 2026-11-15 (claude): plan: scripts/text-review-page.mjs (card model, the duplicate switch, markup, page script), a guarded POST api/text/mark and GET api/text/card in the server, the page and its nav link only in served builds (static output untouched), io gets an alsoIds option so one mark can cover a duplicate copy in one write and one commit, tests, a real run on a copy in headless Chrome, a short contributing.md section.

- 2026-11-15 (claude): built and checked. Files: scripts/text-review-page.mjs (card model, DUPLICATE_POLICY switch, markup, styles, page script), scripts/text-review-page.test.mjs, scripts/issues-serve.mjs (GET api/text/card, POST api/text/mark with the token, Host/Origin, JSON, main, hash, dirty-doc guards), scripts/issues-site.mjs (served builds only: text.html, text.js, styles, a hidden-until-ping nav link), scripts/text-review-io.mjs (alsoIds and placeholders options so a duplicate's copies are marked in one write and one commit; previousAll in the result), docs/contributing.md (new section), docs/text-review.md (the how-to sentence now says how to start the page).
  - Static build: built both old (main) and new issues-site.mjs over the same checkout: all 207 files byte-identical.
  - Duplicates: 19 items carry duplicateOf (by identical text, so the repeated ad lines count too, not only the dialog tree); under the default 'once' policy 279 cards are shown. Label split: the two Sofa scene child lines show their label apart and the rewrite box is prefilled without it.
  - Real flow, headless Chrome on a copy (temp git repo on main, origin removed): Keep by button, Soften by S with a note, Rewrite by R, Skip by right arrow, Back by left arrow, Clear the mark (byte-for-byte restored with previous.placeholder), a duplicate mark landing on both copies in one commit, a stale page, an uncommitted doc and a wrong token all refused in plain words with nothing written, the empty state, no horizontal scroll at 390 and 1200 px, light and dark. Screenshots in the session scratchpad.
  - Checks: npm test 3844 pass (the earlier 9 failures from 134 d1 are gone on this main), npx tsc --noEmit, npm run build, npm run check:dist, issues:check --validate pass.

- 2026-11-15 (claude, independent review): verdict CHANGES NEEDED (one small correctness gap; everything else passed). Status left at `review`; decision d1 untouched. I ran my own checks on a copy (temp git repo on main, origin removed) with a small CDP driver against `node scripts/issues-serve.mjs --no-open` in headless Chrome.
  - Passed in the browser: Keep (button and K), Soften (S, with and without a note), Rewrite (R, with `"`, `<b>&amp;</b>`, backslash, `|`, backtick, `**`, accents, CJK, emoji; the doc gets the text verbatim, one commit each); Skip (right arrow: a skipped line comes back after the others, and the empty state "Nothing is waiting for a mark." appears when all are marked); Back (left arrow; disabled on the first card; works from the empty state); Clear the mark after Soften, Back, Rewrite, Back (byte-for-byte equal to the doc before, for a bare-dash line, a line with no dash, a multi-string line, a table row (Tasks) and a duplicated line whose two copies were both restored in one commit); shortcuts do nothing while typing in the box (typing k, r and the arrow keys only edits the text; Escape closes it).
  - Refusals, all calm (amber, plain words, nothing written, no commit, page still usable): stale page (doc changed under it), uncommitted edit to the doc, branch other than main, wrong or missing token, wrong Host (403, plain text), wrong Origin, bad hash, unknown line id, malformed JSON, wrong content type, note over 500 characters, a newline in a rewrite, an empty rewrite, a body over the size limit (413), server stopped (the page says it cannot reach it). A stray untracked file makes the mark land but the commit is skipped and the page says so. A mark on the wrong branch or dirty doc never moves HEAD.
  - Duplicates: default 'once' marks the first copy and every later copy in one commit (19 items carry duplicateOf: the dialog tree and repeated ad lines); flipping DUPLICATE_POLICY to 'separately' shows both copies as separate cards and marks them separately.
  - Display: the Sofa scene label ("Fixed phone-view line (...)") shows apart from the string, the rewrite box is prefilled without it; a Tasks table row card shows the name large with its cells beneath; a 231-character string and a 480-character note wrap with no overflow; 390 and 1200 px, light and dark: no horizontal scroll on every card kind I tried; refusals use the amber need colours, never red; the progress line has only three phrasings and no counts or urgency words.
  - Static pages: built main's issues-site.mjs and the branch's over the same root: all 207 files byte-identical, no text.html link or text styles in the static output; the served build has the link (hidden until the ping answers; visible on the home and decisions pages served, absent when opened as static files).
  - Checks in the worktree: npm test 3859 pass, npx tsc --noEmit, npm run build, npm run check:dist, issues:check --validate all pass; the worktree stays clean.
  - Docs read against behaviour: accurate. One small omission: contributing.md says a string is in the pixel font "when it can draw every character"; it also needs to be 110 characters or fewer (long strings use plain text).
  - FINDING (needs a change): under the default 'once' policy a mark on the first copy silently overwrites whatever the other copy already says. I hand-marked the contemplate copy `rewrite: my careful hand rewrite`, then pressed Keep on the shown Dialogs copy: both lines became `keep` in one commit and the hand rewrite is gone from the file (only git history has it). The reverse also bites: if only the first copy is marked by hand and the later copy is not, the page never shows it ("Nothing is waiting for a mark.") while the doc still has an unmarked line. The doc has no marks today, so nothing is lost yet, but d1 is open and hand marks are allowed.
  - Checklist for the author:
    - [ ] Under 'once', if a later copy already carries a different mark (or the first copy is marked and a copy is not), do not overwrite or hide it: either show the copy as its own card in that case, or refuse with a calm message naming the other copy, or carry the first copy's mark onto an unmarked copy. Add a test for each case.
    - [ ] (minor) contributing.md: mention the 110-character limit for the pixel font.
  - Not verified (unchanged from the author, still open): how the cards feel to Marc over a long session; touch use on a real phone (390 px was emulated in headless Chrome only).
- 2026-11-15 (claude, after review): fixed the review finding. Under 'once', a mark on the first copy now covers only the copies that carry the same mark as it (in step); a copy that was hand-marked differently, or left unmarked when the first copy is marked, is never overwritten and is shown as a card of its own. Tests for both cases added. docs/contributing.md now says the pixel font is used for short strings it can draw. [x] both checklist items done. Status back to review for a second look.
