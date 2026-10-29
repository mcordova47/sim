---
id: 123
title: Music lab: hear the encounter intro leading into the track
status: todo
owner: claude
depends_on: [122]
---

## Goal
Marc (2026-10-29): he needs some way to hear the encounter's current intro leading into the music; tuning the intro would be nice but is more complex and must not block this. The intro today is not a track: it is the effect schedule `ENCOUNTERS.entrance.sounds` in `src/game/config.ts` (a buzz at frame 0, a rising pulse run frames 16 to 30, the hit chord at frame 32). Add a lab button/option "Play with the encounter intro" that plays that existing schedule through the lab's engine (using the same cues the game uses) and starts the lab track on the hit (frame 32 time), so he hears intro into loop without opening the game tab. Reuse the real cues and the frame-to-time conversion; do not copy sound definitions. Optional if cheap: sliders for the intro cue gains, written back as config values. Do not let tuning block the preview.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- The button plays the real intro schedule and the lab track begins on the hit; live preview and the other modes unchanged; dev-only (check:dist passes, production bundle unchanged); pure parts tested; an agent cannot hear: unverified until Marc listens, with steps; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

