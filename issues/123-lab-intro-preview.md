---
id: 123
title: Music lab: hear the encounter intro leading into the track
status: review
owner: claude
depends_on: [122]
---

## Goal
Marc (2026-10-29): he needs some way to hear the encounter's current intro leading into the music; tuning the intro would be nice but is more complex and must not block this. The intro today is not a track: it is the effect schedule `ENCOUNTERS.entrance.sounds` in `src/game/config.ts` (a buzz at frame 0, a rising pulse run frames 16 to 30, the hit chord at frame 32). Add a lab button/option "Play with the encounter intro" that plays that existing schedule through the lab's engine (using the same cues the game uses) and starts the lab track on the hit (frame 32 time), so he hears intro into loop without opening the game tab. Reuse the real cues and the frame-to-time conversion; do not copy sound definitions. Optional if cheap: sliders for the intro cue gains, written back as config values. Do not let tuning block the preview.

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- The button plays the real intro schedule and the lab track begins on the hit; live preview and the other modes unchanged; dev-only (check:dist passes, production bundle unchanged); pure parts tested; an agent cannot hear: unverified until Marc listens, with steps; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log


- 2026-10-29 (claude): Plan: add `src/lab/lab-intro.ts` (pure plan from `ENCOUNTERS.entrance.sounds` + `SOUND.cues`, `TIMESTEP` for frames, an `IntroPreview` timer on the audio clock) and a "Play with the encounter intro" button in the lab.
- 2026-10-29 (claude): Done. Files: `src/lab/lab-intro.ts`, `src/lab/lab-intro.test.ts`, `src/lab/music-lab.ts`, `music-lab.html`, `docs/music-lab.md`, `scripts/check-dist.mjs` (added `IntroPreview` to the lab-code needles). Cues go to the engine a lookahead (0.25 s) ahead at exact audio-clock offsets; the loop is started 0.05 s before the hit so its first note lands on it (accuracy is one display frame, about 16 ms, since the lab's frame loop drives it). Loop plays on the `sleep` bus at the encounter music level, as the encounter hook does. Optional cue-gain sliders: not done (they would write `SOUND.effects` values, not cheap); logged as a follow-up if wanted.
- Checks: `npx tsc --noEmit`, `npm test` (3318 pass), `npm run build`, `npm run check:dist` pass. Production bundle is byte identical to a build of main (`index-CJyfRwgF.js` both). Live preview, other modes, real-encounter button untouched (only added code paths).
- Unverified (cannot hear): how it sounds. Audition: `npm run dev`, open http://localhost:5173/music-lab.html, press "Play with the encounter intro". Expect a phone buzz, a rising run of 8 pulses, then the hit chord with the loop starting exactly on it (no gap, no overlap). Compare with "Try in the encounter" (the same entrance in the game tab); the intro should sound the same. Check Stop mid-entrance silences the rest and no loop starts; press the button twice quickly (restarts cleanly); edit a channel volume while the loop plays with live preview on (heard at the next loop end); the master slider and "encounter music level" slider change the loudness.
