---
id: 115
title: A gentle limiter on the master output (clipping safety)
status: review
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

## Review (2026-10-28, independent reviewer)
Note: the issue file on the branch was still `status: todo` with no progress log (author did not update it); I set it to `review`. The limiter lives in `src/game/sound/synth.ts` (the Synth constructor), not `engine.ts`; that is where the master chain is built, so it is the right place.

Verdict: **approve the code; the listening criterion is unverified, so the issue stays in `review` until Marc listens.**

Criteria
- Limiter on the master with config values and an off switch: **pass.** `SOUND.limiter` in config (enabled, threshold -3, knee 0, ratio 20, attack 0.003, release 0.15); chain is master gain -> compressor -> destination. `enabled: false` and `?limiter=off` (dev only; `devLimiter` returns true when not DEV) both leave it out. In `dist` the toggle code is present but `import.meta.env.DEV` is folded to false, so a built game ignores the URL.
- `npm test`: **pass** (129 files, 2873 passed, 1 skipped). `tsc --noEmit`: **pass**. `npm run build`: **pass**.
- Marc listens and says whether the clipping is gone: **can't verify** (the agent cannot hear). How it sounds, whether quiet sounds are unchanged, and whether the clipping is gone are all **unverified**.

My own edge checks
- Context with no `createDynamicsCompressor` (optional on `AudioContextLike`): falls back to master -> destination (tested by the author, and I confirmed by reading). Real browsers all have it.
- Routing: effects, music and the lazily made sleep bus all connect to `master`; only the compressor (or master when off) connects to `ctx.destination`. No other `.destination` connection anywhere in `src` (grep), and a Synth built with the limiter has no node other than the compressor connected to destination (ran against FakeAudioContext).
- Mute still sets master gain to 0 ahead of the compressor, so mute is silent and not undone by the limiter. Other tests that build a Synth/SoundFeature/Game pass; the fake context gained `createDynamicsCompressor`, so they exercise the limited path.
- Non-blocking finding (unverified by ear): a Web Audio DynamicsCompressor applies automatic makeup gain. By the spec's formula, with threshold -3 dB, ratio 20, knee 0, that is about +1.7 dB (roughly 1.2x) on everything, including quiet sounds. That works against "quiet sounds and the existing mix do not change audibly" and slightly undercuts the 0.35 master. Marc should A/B with `?limiter=off`; if the level jump is noticeable, lower `SOUND.master` a little with the limiter on (cannot be set on the node; the browser computes it). A -3 dB threshold on the post-master signal (0.71) is also only reached by loud pile-ups, so the effect on typical play is mostly this makeup gain.
- The limiter has a lookahead and is not a brick wall, so very sharp peaks can still overshoot slightly; fine as "gentle insurance".
- Scope: the diff against main is 5 source files, all in scope (config, audio-types, fake-audio, synth, synth.test). No PLAN.md or other issues touched (the 114 file difference in a plain `git diff main` is only because the branch is behind main). `guitar-mix.ts` was not changed (it estimates pre-limiter output; the issue said it "may" need the ceiling; not required). Nothing from reference-photos.

Sanity check of the "voice-cap refusal vs chord peaks" finding
- There is no such finding written in the 115 issue file or the 114 file on this branch (the issue only states it as a hypothesis, and the author left no log), so I checked the claim itself.
- Peaks: the existing test `how loud the chords get (114a)` asserts offline peaks (an upper estimate, post-master) under 0.9 at all levels and press gaps down to 0.07 s, so chord-only pile-ups are estimated not to clip. Plausible, though it only counts chord effects, not music or other effects together.
- Voice cap (maxVoices 96): I played jazz-level six-string strums through a real Synth with a fake clock, alternating steel, at gaps 0.3/0.15/0.1/0.07/0.05 s for 60 presses. Concurrent voices peaked at 20/36/50/68/96 and nothing was refused until the very edge (96 at 20 presses per second, which a person will not reach). So refusals are unlikely to be what Marc heard from chords alone. Also a refused effect is silence for that chord, not distortion, so it would not sound like clipping anyway. The more likely cause is summed peaks with music or other sounds, or the browser/OS output level; unverified.
