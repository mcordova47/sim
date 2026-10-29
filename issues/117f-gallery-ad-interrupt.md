---
id: 117f
title: Photo gallery 6: an ad can interrupt the close-up
status: review
owner: claude
depends_on: [117e]
---

## Goal
Stage F: `ENCOUNTERS.interrupts`, `buildEncounter`, `interruptWithAd`, the encounter as a child of the scene (one roll per session, 8 seconds into the close-up, through the existing gates at 22 percent), Esc cancels only the ad and returns to the same close-up, no second ad that session.

Design and Marc's answers (2026-10-29): `docs/photo-gallery-design.md` (shared 3 x 2 gallery; pause menu manage mode with delete from the close-up and a LOOK switch of presets Crisp 64 x 48 dither 10, Soft 48 x 36 dither 20 (default), Chunky 32 x 24 dither 30 for new uploads only; sofa scene with phone chrome, six random pictures, a close-up you pick, fixed phone-view line and a close-up caption, E pays and Esc does not, an ad may interrupt the close-up). Photos never leave the device; nothing about photo content in the repo, save or sync; synthetic pictures in tests only. Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- Without it the scene works as in 117e; the completion roll for doomscroll and work is untouched and its tests stay green; the checks above pass; an independent review.

## Progress log


- 2026-10-29 (claude): started. Plan: `ENCOUNTERS.interrupts` + `REEL.adAfter` (8 s) in config; `EncounterEnv.interrupt` so each list answers only its own kind of roll; `buildEncounter` split out of `startEncounter`; `ActivityHost.interruptWithAd` (game rolls with `busy = dialog.open || inputLocked`); the scene runs the ad as a child (forwards update, draw, taps, encounterScene; `showsPicture`, `hidesStopHint`, `readsKeys` off while it runs); Escape cancels the child only.
- 2026-10-29 (claude): built and verified. Files: `src/game/config.ts`, `encounters.ts`, `activity.ts`, `game.ts`, `activities/reel.ts`, `reel-ad.test.ts` (new, 17 tests on the real Game plus a unit pair for a broken ad), `docs/activities.md` (one Escape row). Full suite 3435 passed, `npm run build` and `check:dist` pass, golden frames unchanged. Criteria: without an interruption the scene is unchanged (reel tests untouched and green, a missing `interruptWithAd` or a miss changes nothing); doomscroll and work completion roll untouched (encounter tests green; `maybeEncounter` is unchanged, and `tasks` only answers non-interrupt rolls); a bug in the ad is caught and dropped inside the scene (`guarded`), so the gallery is untouched. The interrupted close-up draws nothing new (the existing ad card, then the same close-up), so no render was made. Not checked: feel in a browser, a phone's view flip when the ad arrives (needs a device; 117g).
