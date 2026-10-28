---
id: 108
title: The guitar's timbre follows the current instrument
status: review
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-28): change the timbre of the guitar notes, starting with **timbre alone**. The timbre depends on the **current instrument**; the default is a **bright steel-string acoustic** sound. (The nylon guitar, `guitar-nylon`, is the first other instrument: a softer, rounder sound. Others, like the mic-stand-vintage or a future ukulele, can add voices later.) The skill progression in the next section is a separate issue (114).

## What to do
- Find where the guitar notes are made (Web Audio synth, `src/game/sound/`, the guitar task and notes activity) and the data-driven voice settings.
- Make the voice a per-instrument table (steel default, nylon), chosen from what the player currently holds or plays (look at how the decor slot or the held-guitar variant says which guitar it is). Plucked-string synthesis (Karplus-Strong or a filtered sawtooth/triangle with a short decay, a slight pick attack) is the likely route; steel bright with a touch of body, nylon darker and rounder.
- Make it easy to audition: a dev shortcut (dev server only, as the other `?` shortcuts) to play the voices, and keep the old voice restorable.
- Tests: the voice table exists for every instrument, parameters are in range, the selection follows the instrument, a muted state stays silent. No audio files from recordings.

## Acceptance criteria
- Notes use the steel-string voice by default and the nylon voice with the nylon guitar; the table is data, not hard-coded; tests pass; Marc listens and approves (an agent cannot hear it; unverified until then).

## Progress log
- 2026-10-28: plan: a per-instrument voice table in `SOUND` (config.ts), plucked-string voices built from a few partials with their own decay plus a pick tick (no Karplus-Strong, no samples), chosen by the instrument in hand, with a dev URL and console audition.
- 2026-10-28: done, status review. Changes:
  - `src/game/config.ts`: `SOUND.defaultInstrument`, `SOUND.instruments` (guitar -> steel, guitar-nylon -> nylon), `SOUND.guitarVoices` (plain = the old `noteKey` blip, steel, nylon) and two new effects `guitarSteel` (triangle + saw edge + three higher partials dying faster + a highpass pick tick) and `guitarNylon` (sine fundamental, weak 2nd and 3rd, a lowpass thump). Pitch is untouched (still `noteKeys`).
  - `src/game/sound/decisions.ts`: `guitarEffect(instrument)`.
  - `src/game/sound/feature.ts`: the notes game plays `noteEffect()` instead of `noteKey`. The instrument in hand is the item in a decor slot named `guitar` if the apartment has one (it does not yet: the guitar is not a decor slot, so today it is always steel), else the default. Dev only: `?guitarvoice=plain|steel|nylon` and `auditionGuitar("steel")` in the console.
  - Tests: `src/game/sound/guitar-voice.test.ts` (table complete, ranges, steel brighter than nylon, selection follows the slot, pitch unchanged, plain restores the old single triangle, mute silent, dev override); the old per-arrow test in feature.test.ts now counts the new voice's oscillators.
  - Old voice restorable: set an instrument's `voice` to "plain" in config (or `?guitarvoice=plain`). `noteKey` itself is unchanged (the track editor's blips still use it).
  - Verified: `npx vitest run` (2839 pass), `npx tsc --noEmit`, `npm run build`.
  - NOT verified: how any of it sounds. An agent cannot hear it; the gain levels, decay lengths and brightness are guesses until Marc listens.
  - Left over / for the planner: the nylon guitar cannot be in hand in the real game until it becomes a decor slot `guitar` holding an instrument item (docs/decor.md stage 4); the selection code is ready for that (it reads the slot item's sprite). Until then use `?guitarvoice=nylon`.
