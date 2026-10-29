---
id: 091b
title: Encounter music 2: result jingles (success only)
status: todo
owner: claude
depends_on: [091a]
---

## Goal
Stage 2: two jingle cues and effects (unsubscribed, add to cart), the phase `result`, the exit echo whenever there is no jingle.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- Each successful outcome plays one jingle and never the exit echo; failed unsubscribe, refusals and Ignore play none and keep the exit echo; muted plays none; the checks above pass; an independent review; audition steps for Marc.

## Progress log

