---
id: "142"
title: "Encounter music follow-ups: the lab's copied numbers and stale test names"
short: "Encounter music follow-ups"
status: todo
owner: claude
depends_on: ["091c"]
summary: "The music lab copies encounter numbers instead of reading the config, and a few tests and comments still say placeholder."
kind: fix
---

## Goal
Found while writing the encounter music docs (issue 091c): (1) `LAB_ENCOUNTER` in `src/lab/lab-encounter.ts` copies the duck and fade numbers (0.3, 1.5, 0.35) and `musicLevel * 0.5` instead of reading `ENCOUNTERS.music`, so the lab and the game can drift apart; read them from the config. (2) `src/game/encounter-sound.test.ts` has a test group and a title that still say "placeholder" and "about eight seconds" (the real track is 135 bpm, about 7 seconds a pass), and the "placeholder track" wording remains in comments in `config.ts` and the test: rename to match. (3) The system-track guard test does not actually check that every channel is as long as the loop (its title says so), and pins the exact list of files in `system/`: make the title honest or add the check, and decide whether pinning the file list is wanted. No sound change.

## Acceptance criteria
- The lab reads its numbers from `ENCOUNTERS.music`; test names and comments are accurate; the guard test does what it says; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review.

## Progress log
- 2026-11-15 (planner): filed from the 091c hand-back.
