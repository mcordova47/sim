---
id: 117f
title: Photo gallery 6: an ad can interrupt the close-up
status: todo
owner: claude
depends_on: [117e]
---

## Goal
Stage F: `ENCOUNTERS.interrupts`, `buildEncounter`, `interruptWithAd`, the encounter as a child of the scene (one roll per session, 8 seconds into the close-up, through the existing gates at 22 percent), Esc cancels only the ad and returns to the same close-up, no second ad that session.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Without it the scene works as in 117e; the completion roll for doomscroll and work is untouched and its tests stay green; the checks above pass; an independent review.

## Progress log

