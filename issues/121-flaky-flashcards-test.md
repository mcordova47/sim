---
id: 121
title: Fix the flaky flashcards activity test
status: review
owner: claude
depends_on: []
---

## Goal
`src/game/activities/flashcards.test.ts` fails intermittently in the full suite (several different cases: "treats a backend that throws as no connection", "does not remember a key that was never accepted, and says so offline", "does not remember a key"), passes alone (46 of 46), and has now failed three full runs in a row on `main` after the photo reel and gallery merges. Find the cause (shared state between test files, timers or fake timers, a real network or storage call, localStorage or IndexedDB leaking from newer tests, timing under load, test order or file-level parallelism) and fix the test or the code so the full suite is stable. Do not weaken the assertions. Never modify the separate flashcards repo (read only).

## Acceptance criteria
- 20 consecutive `npm test` runs pass with no flake; the cause is written in the issue log; `npx tsc --noEmit` and `npm run build` pass; an independent review.

## Progress log


- 2026-10-29: started. Plan: reproduce in the full suite, find what the failing cases touch, fix without weakening assertions.
- 2026-10-29: cause and fix.
  - Cause: not shared state, timers or storage. Two cases ("does not remember a key that was never accepted, and says so offline", "treats a backend that throws as no connection") call `start()` with no saved key, so the activity is on the choice screen (issue 093), and never set `phase = "key"` as the sibling tests do. Typing the key and pressing Enter then confirms the choice screen's default, "Study without a key". That starts guest mode, which uses the activity's default `studyGuestBackend()`, a REAL backend that does a dynamic import of the flashcards core over the network (`sharedCore()` in `src/game/flashcards/backend.ts`). The injected test backend was never called. Evidence: a debug log in the failing test showed `opens: []`, `guest: true`. The assertion `phase === "problem"` only held when that real import failed within one `setTimeout(0)` flush; under full-suite load (or with network) it was still `connecting` (observed 5 failures in 6 full runs before the fix, never alone). The photo reel and gallery merges only made the suite slower, which exposed it. (The third reported case has the same shape.)
  - Fix (test only, `src/game/activities/flashcards.test.ts`): both tests now set `t.a.phase = "key"` like their siblings, so they exercise the injected backend as intended; and `setup()` now passes a guest backend that throws, so any test reaching the guest path by mistake fails loudly instead of hitting the network. No assertion was changed or weakened, no production code touched.
  - Verified: 20 consecutive `npm test` runs all 3271 passed, 1 skipped; `npx tsc --noEmit` and `npm run build` pass. Not checked: nothing browser-related.
