---
id: 091d
title: Encounter music 4: Marc writes the real track
status: done
owner: marc
depends_on: [091a]
---

## Goal
Stage 4: Marc composes the real loop in the music lab or the editor (issue 122 gives him the lab) and replaces the placeholder; the test that guards that it parses and loops cleanly stays.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- Marc's track is in, parses and loops cleanly.

## Progress log
- 2026-10-29 (Marc): Added harmonies; increased tempo; raised volume because the intro was a lot louder than the music, which was a bit jarring. Updated tests: No "zen" rule for the battle music being calm, and loosened the downbeat rule: some channel must start on the downbeat.

- 2026-10-29 (independent review, claude as planner; author is Marc): **approve.** Reviewed PR #1 head 697abba, then the follow-up commits (suggestions applied, comment wrapping, this issue update; head 239077c). Checks I ran myself on the checked-out branch: `npx tsc --noEmit` clean; the sound tests (`src/game/sound` and `encounter-sound.test.ts`, 231 tests) pass; the full suite, build and `check:dist` are run on the merged result by the planner. Read from the text (not heard): all four channels sum to exactly 16 beats (melody, harmony_h, harmony_l, bass), so the loop is clean; at 135 bpm a pass is about 7.1 s and four passes about 28 s, inside the test's 24 to 40 s window; harmony follows the bass and melody (G minor, then E-flat, then D with the F-sharp as leading tone). Test edits: the downbeat check is now across all channels because the harmony channels open with rests (correct); the placeholder "calm" test (120 bpm at most, no sawtooth, bass on G2) was removed on purpose (author's decision, logged above; the design note's "Calm" line in `docs/encounter-music-design.md` is therefore out of date). Channel gains now sum to 1.7 (placeholder 1.0): louder and brighter, protected by the master limiter, judged by the author's ear in the game. Nits left as is: the test group and a test title still say "placeholder" and "about eight seconds". Not verified by me: how it sounds.
