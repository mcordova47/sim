---
id: 082
title: Flashcards: a progress page when no cards are left to review
status: done
owner: claude
depends_on: [026]
---

## Goal
Marc (2026-10-27): when there are no cards left to review, show some version of a progress page instead of a dead end. Part of the flashcards front end (issue 026, `docs/flashcards.md`).

## What we know
- The game never keeps its own copy of the cards or the schedule; the app's compiled core (`core.v1.js`) does the scheduling and the game only reads. `Core` today has `session`, `card`, `grade`, `merge`, `requeue` and optionally `ipa`: nothing that reports progress.
- Tone: deadpan and sincere, no pressure. The flashcards rules already say no streaks or penalties; the quiet-collecting pillar applies (no confetti, no guilt, nothing missable). Never acknowledge the game.

## Design (first step is finding out what is possible)
1. Look at what the core and the progress blob make available without the game reimplementing the scheduler: counts of words seen, learned, due, due soon, the next due time, the deck size. Do **not** parse the blob format by hand unless the core documents it. If the core has nothing for this, say what small function the app would need to add (the app is Marc's, in his other repo) and do the game side against a stub with a stand-in in the practice deck, so it can be built now and wired later. Report the options before building the real wiring.
2. The page itself: when the queue is empty at open (or after the last card), show a screen in the pixel style with a handful of plain facts (for example how many words are known out of the deck, how many cards come due and when), a short deadpan line, and E to leave. Plain bars or counts, no animation beyond what the other screens use. Also reachable at the end of a session.
3. Points: showing the page pays nothing and changes nothing.

## Acceptance criteria
- A short note in `docs/flashcards.md` on what data the page uses and where it comes from; the game still keeps no copy of the cards.
- The page shows when the queue is empty (real backend, practice deck with an empty set, and the stand-in), reads well at 320x192, and never overlaps the frame.
- Offline or unreadable results behave as before; the page never shows made-up numbers.
- Tests for the data-to-lines logic and for the activity flow (E leaves, Escape leaves, no points). `npm test`, `npx tsc --noEmit`, `npm run build` pass; golden frames unchanged.
- Text goes in `docs/text-review.md` for Marc.

## Needed from the app


The page needs counts the core does not report today. `core.v1.js` exports `session`, `card`, `grade`, `ipa`, `merge`, `requeue`, `empty`, `sessionSize` and `version`; none of them says how many words are known, how many are due or when the next one is. The figures already exist in the app (`Flashcards.Stats.overview` and `Stats.nextDueIn` in `src/Flashcards/Stats.purs`, with `Stats.masteryOf` deciding what "known" means); `Flashcards.Core` just does not export them. The game must not parse the blob or reimplement the scheduler to get them.

Proposed addition, in the same style as the other core functions (additive, so no `version` bump):

```
core.overview(progress, now?, language?) -> {
  total: number,        // words in the deck (Stats.overview.total)
  seen: number,         // words met: any answer given, still in the deck (.seen)
  mastered: number,     // words known: Stats.masteryOf is Mastered (.mastered)
  dueNow: number,       // cards due at `now` (.dueNow)
  dueTomorrow: number,  // cards due after `now` and within 24 hours (.dueTomorrow)
  nextDueIn: number | null  // ms from `now` to the soonest card that is not yet due (Stats.nextDueIn); null if none is scheduled ahead
}
```

- Arguments as for `core.session`: `progress` is the stored JSON string or `null`, `now` is ms since the epoch (default `Date.now()`), `language` defaults to `"es"`. `null` progress gives zero counts, not an error. Anything that goes wrong throws, as the others do.
- All counts are whole numbers, `seen <= total`, `mastered <= seen`, `dueNow <= seen`, `dueTomorrow <= seen - dueNow`. The game checks this (`readSummary` in `flashcards/progress.ts`) and shows nothing rather than a number that does not add up.
- In `Flashcards.Core` this is `overview :: String -> String -> Number -> Overview` over `Stats.overview` and `Stats.nextDueIn` for `language.deck`, with `{ error :: String, ... }` like the rest, and a `core.js` wrapper that applies `must` and turns `Milliseconds` into a plain number. `accuracy`, `answers`, `misses` and `producing` are left out on purpose: the page is about what is known and when to come back, not a score.
- Why: so the page can say "127 of 1000 words known, 312 met, nothing is due, the next one in 5 hours" from the app's own numbers. `test/core.mjs` would pin the shape as it does for the others.

Until it exists the game feature-checks `typeof core.overview === "function"` (as it does for `ipa`). Without it, the page shows what the game can honestly say today: "Nothing is due. Come back later." (when the queue is empty) or the tally of this visit's answers ("N got it, N again."), and no figures. When the app adds `overview` the full page appears with no game change. A probe that finds the next due time by calling `core.session` at later and later times was considered and not built: it would be a guess at the scheduler through a side door, and it still would not give counts.

## Progress log

- 2026-10-27 (claude): started. Read the app repo (read only): `core.js` exports `session`, `card`, `grade`, `ipa`, `merge`, `requeue`, `empty`, `sessionSize` and `version`, nothing that reports progress. The app has the figures internally (`Flashcards.Stats.overview` and `nextDueIn` in `src/Flashcards/Stats.purs`) but `Flashcards.Core` does not export them. Plan: an optional `overview` on the game's `Core` type, feature-checked like `ipa`; the page shows only what it returns; a stand-in in the practice deck implements the proposed shape; "Needed from the app" section written up for Marc.
- 2026-10-27 (claude): built. Files: `src/game/flashcards/progress.ts` (+ test: validation, wait wording, lines, bar), `core.ts` (optional `overview`, `CoreOverview`), `study.ts` (`ProgressSummary`, optional `StudySession.progress`), `real.ts` (feature-checked, validated, never throws), `demo.ts` (`standInOverview`, `&set=empty`, `EMPTY_OVERVIEW`), `activities/flashcards.ts` (page drawn in the done phase; E and Escape leave; no new pay), tests in `real.test.ts` and `activities/flashcards.test.ts`, `docs/flashcards.md`, `docs/text-review.md`.
  - Docs note: written (the progress page section; the game keeps no copy). Page shows on an empty queue at open and after the last card: tested with the stand-in and the practice deck's empty set; the real backend is tested with fake cores with and without `overview`. Layout at 320x192 checked by arithmetic in a test (longest page ends above the leave line; the box is 264x120 centred); NOT looked at in a browser, and not against the real core, which has no `overview` today, so on the live app only the plain line shows until the app adds it.
  - `npm test` (2498 pass), `npx tsc --noEmit`, `npm run build` pass; golden frames unchanged.
  - Left for Marc: the "Needed from the app" function; the text in `docs/text-review.md`.

- 2026-10-27 (claude, independent review): verdict **approve** (nits below, none blocking).
  - Ran: `npm test` 2498 pass, `npx tsc --noEmit` clean, `npm run build` ok. No golden file touched (`git diff main...HEAD` has none); golden tests are in `npm test` and pass. No PLAN.md or other-issue edits; changed files are all in scope.
  - Own checks (vite-node script outside the repo): `readSummary` returns null for NaN, Infinity, negative, float, string, bigint, array, missing, `nextDueIn` undefined/NaN/negative/Infinity, total 0 (empty deck) and `dueNow + dueTomorrow > seen`. `describeWait` rounds sensibly (59999ms "under a minute", 60000 "1 minute", 86399999 "1 day"). Widest possible lines (5-digit counts, 300 days, 99999 points) are 221px against the 248px inner width; `fit` only shrinks scale>1, so scale-1 text relies on this being short enough, and it is. Longest page (7 lines + bar) ends about row 102 of 120 (practice deck box is 140), above the leave line. Enter, E, Escape all leave from the page with `completed: false`, no reward; the E that grades the last card is an edge press so it cannot also leave. Real session: `local` is set to the merged blob only after a delivered push, so the page reads the saved state; a failed save goes to the problem phase, not the page.
  - Criteria: docs note **pass** (accurate, game keeps no copy). Page on empty queue **pass** for stand-in, `&set=empty`, and fake real cores with and without `overview` (tests); real backend against the live app **can't verify** (the real core has no `overview`); 320x192 appearance **can't verify** (no browser; arithmetic and my width check only). Offline/unreadable as before and no made-up numbers **pass** (null summary gives the old plain line). Tests **pass**. text-review **pass**.
  - Nits, none blocking: (1) hostile but finite `nextDueIn` such as 1e300 prints "1.1574074074074075e+292 days" (about 311px, overflows the box); `readSummary` could cap it or `describeWait` could clamp. Same for counts like 1e20 printing exponent form. The real core cannot produce these. (2) "1 of 1 words known" is not pluralised. (3) the layout test claims "both box heights" but only checks 120. (4) the empty-deck case (total 0) gives the plain line, which is right.
  - "Needed from the app" checked against `../flashcards` (read only): the `core.js` export list is exactly as stated; `Stats.overview` (seen, total, mastered, dueNow, dueTomorrow) and `Stats.nextDueIn` exist with the stated meanings; the invariants hold (tracked is the in-deck subset, so seen<=total, mastered<=seen, dueNow<=seen, dueTomorrow<=seen-dueNow); `Core.purs` signatures are `String -> String -> Number` and it uses `{error, ...}` records, as described. Clear enough to hand over. Two small gaps: `Stats.overview` takes `Array Slug`, so `Core.overview` must map `language.deck` to slugs; and `Flashcards.Core` cannot return a `Maybe` to JS (it uses `fromMaybe ""` and the wrapper turns "" into null, as for `ipa`), so the proposal should say how "no next card" is passed (a sentinel the `core.js` wrapper turns into `null`). Also worth one line: "known" means production box >= 3 or a recognition card at max box (`masteryOf`).
  - Status set to `done`. PLAN.md table needs updating by the planner.
