---
id: 091d
title: Encounter music 4: Marc writes the real track
status: review
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

