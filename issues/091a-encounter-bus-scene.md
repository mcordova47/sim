---
id: 091a
title: Encounter music 1: the bus, the scene and the placeholder track
status: done
owner: claude
depends_on: [091]
---

## Goal
Stage 1 of section 5: the `encounter` bus, `EncounterScene`, `encounter-sound.ts` (start at frame 32, E skip, bounded loops, stop and fades, record ducking), and a placeholder system track.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- The tests listed for 091a in the design pass (starts at frame 32 and not before; E skip starts at the open; Escape at every frame leaves buses at rest; record ducks and returns keeping its place; muted is silent; no synth is silence; loop has no note past its end; four loops then fade); golden frames and voice files unchanged; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review; audition steps for Marc.

## Progress log


- 2026-10-29 (agent): started. Plan: `encounter` bus, `EncounterScene` published by the encounter activity (phases entering/open/result/leaving + outcome), `EncounterSound` copying `SleepSound`, placeholder system track in G, tests.
- 2026-10-29 (agent): built. Files: `src/game/encounter-scene.ts` (new), `src/game/sound/encounter-sound.ts` (new), `src/game/music/system/encounter-battle.track` (placeholder, G, 120 bpm, 16 beats = 8 s, key of the pulse run), `system-tracks.ts` (+ENCOUNTER_BATTLE), `config.ts` (`ENCOUNTERS.music`), `synth.ts` (`encounter` bus), `engine.ts` (`encounter`, `updateEncounter`), `feature.ts`, `game.ts` (`encounterScene`), `activity.ts`, `activities/encounter.ts` (sets phase `result` and `outcome` when the closing line opens; the jingles of 091b will read them), `main.ts` (labmusic disables the placeholder), tests `src/game/encounter-sound.test.ts` (25) and one line loosened in `sleep-sound.test.ts` (the system folder now holds two tracks).
- Decisions: the record returns when the exit wipe begins (or at once on Escape), the loop fades at the closing line (`resultFade`) or on Escape (`escapeFade`); reduced motion: no music and the record is not ducked; no synth at the start: silent to the end. The lab's "Try in the encounter" (labmusic=1) keeps working unchanged: it plays on the `sleep` bus and main.ts sets `engine.encounter.disabled` when it is active so the placeholder does not stack. It can be retired later (091d) when Marc's track is a system track.
- Checked: `npx tsc --noEmit`, `npm test` (golden frames and voice files unchanged), `npm run build`, `npm run check:dist` pass. Every test named in the design is in `encounter-sound.test.ts`.
- NOT checked (cannot listen): how it sounds, whether the downbeat lines up with the hit by ear, levels. Audition steps are in the report.

- 2026-10-29 (reviewer, independent): **Review: approve.**
  - Ran myself in the worktree: `npm test` (152 files, 3378 passed, 1 skipped), `npx tsc --noEmit` (clean), `npm run build` (ok), `npm run check:dist` ("looks ready to deploy"). Golden frames and voice files unchanged (full suite green, no fixtures in the diff).
  - Criteria, by test names in `encounter-sound.test.ts` plus my own throwaway sweeps (removed, not committed): starts at frame 32 and not before: pass. E skip starts at the open: pass. Escape at every frame leaves buses at rest: pass (author's sweep 0 to 52 and later; mine: 400 seeds x locked/unlocked x 3 encounters of random presses, Escape, mute, audio unlock, all ending with music bus at `SOUND.musicLevel`, encounter bus 0, sound idle, player stopped; plus Escape on every frame of the result and exit phases for both an Ignore and an unsubscribe outcome). Record ducks and returns keeping its place: pass. Muted is silent: pass, and mute toggled at odd frames with Escape on the same frame changes nothing. No synth is silence: pass, and audio unlocked at frames 28 to 36 followed by Escape ends at rest. Loop has no note past its end: pass. Four loops then fade: pass. Back-to-back encounters: pass. The labmusic stand-in not stacking: pass (`disabled` set at 0, 10, 40, 60 frames into an encounter, then Escape, strands nothing; `labEncounterMusic` already returned a boolean, main.ts only reads it).
  - Scope: only encounter, sound, config, tests, one track and this file changed; no PLAN.md or other issue edits. No reference-photos content. Tuning values are in `ENCOUNTERS.music`.
  - Non-blocking notes: (1) latent, unreachable today: if a scene with a new id arrives with no null frame between and that one is reduced, `begin` resets `ducked` and the old duck is never returned (I reproduced it with a direct `EncounterSound.update` call; in the game an encounter always ends with a null frame first, and my 400-seed back-to-back walk never hit it). A cheap hardening: give the record back in `begin` when `this.ducked && !this.returned`. (2) `main.ts` sets `disabled` after an async import, so an encounter that starts in that window plays the placeholder under the lab stand-in; dev-only.
  - UNVERIFIED (an agent cannot hear or feel these): how the loop sounds, whether its downbeat lines up with the hit chord by ear, the levels (gain 0.35, record ducking and the 1.5 s return), browser feel. Marc's audition steps are in the author's report.
