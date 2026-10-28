---
id: 108
title: The guitar's timbre follows the current instrument
status: todo
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
