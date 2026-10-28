---
id: 108
title: A different timbre for the guitar notes
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-28): maybe change the timbre of the guitar notes; he has a few ideas. Design first: ask Marc for his ideas (a sound description or a reference), one question at a time, before changing the synth voice.

## What to do
- Find where the guitar notes are synthesised (Web Audio synth, `src/game/sound/`, the guitar task and notes activity) and the data-driven voice settings.
- Try Marc's ideas as voices he can compare, then keep one. Tests use the sound feature tests; no audio files from real recordings.

## Acceptance criteria
- The guitar notes use the chosen timbre; the old voice is easy to restore; Marc listens and approves.
