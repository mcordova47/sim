---
id: 091a
title: Encounter music 1: the bus, the scene and the placeholder track
status: todo
owner: claude
depends_on: [091]
---

## Goal
Stage 1 of section 5: the `encounter` bus, `EncounterScene`, `encounter-sound.ts` (start at frame 32, E skip, bounded loops, stop and fades, record ducking), and a placeholder system track.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- The tests listed for 091a in the design pass (starts at frame 32 and not before; E skip starts at the open; Escape at every frame leaves buses at rest; record ducks and returns keeping its place; muted is silent; no synth is silence; loop has no note past its end; four loops then fade); golden frames and voice files unchanged; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review; audition steps for Marc.

## Progress log

