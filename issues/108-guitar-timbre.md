---
id: 108
title: The guitar's timbre follows the current instrument
status: in-progress
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
- 2026-10-28: Review (independent agent). Verdict: **changes needed** (one real defect; everything else passes).
  - Ran: `npx vitest run` 2839 pass, `npx tsc --noEmit` clean, `npm run build` and `check:dist` ok. Plus throwaway edge-case tests (deleted, not committed).
  - Criterion "steel by default, nylon with the nylon guitar": PASS in the fake audio context (no slot -> steel; slot with `guitar-nylon` item -> nylon oscillators; `__proto__`, `constructor`, empty, unknown keys all fall back to steel without throwing). The nylon guitar cannot be in hand in the real game yet (no `guitar` decor slot), as the author says.
  - Criterion "table is data, not hard-coded": PASS (`SOUND.instruments`, `SOUND.guitarVoices`, `SOUND.effects.guitarSteel/guitarNylon` in config.ts).
  - Mute: PASS (no oscillators while muted, sound returns on unmute). Old voice restorable: PASS (`plain` -> `noteKey`, one triangle, unchanged; track editor still uses it).
  - Dev override dead in a build: PASS. `devGuitarVoice` returns undefined when `import.meta.env.DEV` is false; the built bundle has no `auditionGuitar`, and the `guitarvoice` string is only inside the function that bails out.
  - No audio files added; no files outside scope; PLAN.md and other issues untouched; no reference-photos content.
  - Tests pass: PASS. Marc listens and approves: **UNVERIFIED / still open** (an agent cannot hear; levels, decays and brightness are guesses).
  - **DEFECT (voice cap with fast notes):** the effects are 6 voices (steel) and 4 (nylon) against `SOUND.maxVoices` 14, and `Synth.play` is all-or-nothing, so fast arrow presses are silently dropped. Measured with the fake context, 10 presses 100 ms apart: old `noteKey` plays 10, steel plays only 4, nylon only 8. At 250 ms apart all 10 play. Also the new effects dropped the old `priority: "low"`, so a held-down ring can crowd out other effects. The existing tests never press notes quickly, so they miss this.
  - Changes needed:
    - [ ] Make fast repeated guitar notes keep sounding (for example fewer voices per note, shorter tails for the upper partials, or per-voice cap handling for the guitar), and add a test that presses arrows ~100 ms apart and asserts none are dropped.
    - [ ] Decide on `priority` for the guitar effects (the old blip was low) and test that notes do not starve other effects.
    - [ ] Minor: the nylon assertion in guitar-voice.test.ts (`voices[0] && noteKeys.up`) is a vacuous expression; tidy it.
    - [ ] Marc listens (still open after the above).
