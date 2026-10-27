---
id: 082
title: Flashcards: a progress page when no cards are left to review
status: todo
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

## Progress log
