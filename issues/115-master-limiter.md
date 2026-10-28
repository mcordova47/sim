---
id: 115
title: A gentle limiter on the master output (clipping safety)
status: todo
owner: claude
depends_on: []
---

## Goal
Marc (2026-10-28), after playing the guitar chords (114a): "it does clip at times, but it's not too bad". The master chain is one gain (0.35) with no limiter or compressor; offline estimates put chord peaks well under 1.0, so what he hears may be voice-cap refusals or transients rather than true clipping, but a limiter is cheap insurance, and the 114b groove will layer more sound.

## What to do
- Look at the master chain in `src/game/sound/engine.ts`. Add a gentle `DynamicsCompressor` (limiter settings: high threshold, high ratio, short attack, moderate release) just before the destination, as data in config, with an easy off switch and a dev URL toggle for A/B (`?limiter=off`).
- Check that quiet sounds and the existing mix do not change audibly, and that tests that read the master gain still pass (the offline mix estimate in `guitar-mix.ts` may need the limiter's ceiling).
- Also investigate what Marc heard: if it is voice-cap refusals at fast presses, say so and note it.

## Acceptance criteria
- A limiter on the master with config values and an off switch; tests pass (`npm test`, `tsc`, build); Marc listens (unverified until then) and says whether the clipping is gone.
