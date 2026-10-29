---
id: 121
title: Fix the flaky flashcards activity test
status: todo
owner: claude
depends_on: []
---

## Goal
`src/game/activities/flashcards.test.ts` fails intermittently in the full suite (several different cases: "treats a backend that throws as no connection", "does not remember a key that was never accepted, and says so offline", "does not remember a key"), passes alone (46 of 46), and has now failed three full runs in a row on `main` after the photo reel and gallery merges. Find the cause (shared state between test files, timers or fake timers, a real network or storage call, localStorage or IndexedDB leaking from newer tests, timing under load, test order or file-level parallelism) and fix the test or the code so the full suite is stable. Do not weaken the assertions. Never modify the separate flashcards repo (read only).

## Acceptance criteria
- 20 consecutive `npm test` runs pass with no flake; the cause is written in the issue log; `npx tsc --noEmit` and `npm run build` pass; an independent review.

## Progress log

