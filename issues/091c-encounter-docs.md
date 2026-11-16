---
id: 091c
title: "Encounter music 3: docs and tuning pass"
status: in-progress
owner: claude
depends_on: [091b]
short: "Encounter music 3: docs and tuning"
summary: "Encounter music gets documented, with every tunable number gathered in config"
unverified:
  - How the encounter music, the duck and the jingles sound; an agent cannot hear, only Marc can.
  - The tuned values in ENCOUNTERS.music are as built; nobody has judged them by ear, so the tuning half of the acceptance (Marc says it sounds right) is open.
needs:
  - who: marc
    kind: try
    why: Listen with ?encounter=ad-candle&again=1 and say whether the music and jingles sound right or what to change.
    since: 2026-11-15
---

## Goal
Stage 3: a section in `docs/random-encounters.md` and `docs/music.md`; every number in `ENCOUNTERS.music`; Marc tunes by ear (the music lab, issue 122, `?encounter=`).

Design and Marc's answers (2026-10-29): `docs/encounter-music-design.md` (Marc composes the real track in the editor or the music lab and the agent writes a placeholder; the record ducks to silence during an encounter; jingles only when the action succeeds (unsubscribed, add to cart), none for failure, refusal or Ignore; four passes then fade; no music with reduced motion). An agent cannot hear: sound is unverified until Marc listens, with exact steps.

## Acceptance criteria
- Docs updated; all tunable numbers in config; Marc says it sounds right.

## Progress log


- 2026-11-15 (agent): Marc's decision (issue 138 d2): an agent writes the docs now; DOCS ONLY, no code or sound change. Plan: a section in docs/random-encounters.md (the sound as built), a section in docs/music.md (system tracks, tuning by ear, a table of every `ENCOUNTERS.music` number), fix stale statements, check each claim against the code, then an independent review.
- 2026-11-15 (agent): Docs written, no code or sound change. Files: `docs/random-encounters.md` (new subsection "The encounter's music and result jingles", under section 13; the exit-echo sentence in the entrance-sound bullet fixed), `docs/music.md` (new section "The encounter's music": system tracks, the loop-only track, the guard test, lab markers vs the game, tuning by ear, a table of every `ENCOUNTERS.music` number; "one system track" and "third bus" statements fixed), `docs/music-lab.md` (the stand-in sentence updated now the real feature exists). Checked by reading `encounter-sound.ts`, `encounter-scene.ts`, `activities/encounter.ts`, `config.ts`, `synth.ts`, the track file and the tests; ran `npx vitest run` (3803 pass; 8 failures in `scripts/issues-edit.test.mjs` and a real-repo issues test, which fail the same way on unmodified main, unrelated) and `npm run issues:check -- --validate`.
  - Surprising or undocumented, now documented: (1) `gain` is an absolute bus level (0.35), not a share of `musicLevel`; it equals half of 0.7 only by coincidence of the numbers. (2) `duckTo` is a fraction of `musicLevel`. (3) After the four passes fade, the record stays ducked to silence until the exit wipe, so the card sits in complete quiet. (4) Reduced motion also means no duck: the record plays on at normal level. (5) Jingles still play in reduced motion. (6) Once the loop has begun its four-pass fade, a result line does not restart the fade. (7) The guard test is named "placeholder" and its last test title says "about eight seconds"; its bounds are 6 s per pass and 24 to 40 s for four passes; it does not check that every channel is the same length despite its title. (8) The test also pins the exact list of files in `system/`.
  - Follow-ups (not done, code is out of scope): (a) `LAB_ENCOUNTER` in `src/lab/lab-encounter.ts` repeats the duck and fade numbers (0.3, 1.5, 0.35) and `defaultGain = musicLevel * 0.5` instead of reading `ENCOUNTERS.music`; they can drift. (b) Rename the stale "placeholder" and "eight seconds" test titles in `src/game/encounter-sound.test.ts` and the "placeholder track" wording in the `config.ts` and test comments. (c) `docs/encounter-music-design.md` still reads as a plan (placeholder, 8 s, `gain` suggested 0.5 of musicLevel); it is a historical note and was not edited. (d) The 12-frame exit wipe, 0 duration of the `rampBus("encounter", 0, 0)` start are literals in code, not magic tuning values; no other tunable numbers were found outside `ENCOUNTERS.music` and `SOUND.effects`.

- 2026-11-15 (reviewer, independent): Review of the docs-only change. Verdict: **changes needed** (one small factual error; everything else checks out).
  - No code changed: `git diff 84f72c0..HEAD --name-only` lists only docs/music-lab.md, docs/music.md, docs/random-encounters.md and this issue file. Ran `npx vitest run src/game/encounter-sound.test.ts src/game/encounter-game.test.ts src/lab` (129 pass) and `npm run issues:check -- --validate` (valid; two warnings on other issues).
  - Checked against code and all correct: every key and value in the `ENCOUNTERS.music` table (startFrame 32, gain 0.35, maxLoops 4, loopFadeOut 4, duckTo 0, duckDown 0.3, duckUp 1.5, resultFade 0.35, escapeFade 0.25, jingles map), `SOUND.master` 0.35, `SOUND.musicLevel` 0.7, `entrance.skipAfter` 6, `exitCue`/`softCue`, cue and effect names; `Bus` is `effects|music|sleep|encounter`; the track (computed by loading it: 16 beats, 135 bpm, 7.11 s a pass, 28.44 s for four; channels melody square, harmony_h and harmony_l sawtooth, bass triangle, beat drums); jingle lengths (0.57 s and 0.36 s) and notes (G B D then high G with triangle bass; cart two blips plus noise); scene phases and outcomes; the record stays ducked after the loop fades; reduced motion means no music and no duck but jingles play; no fade restart once fading; no-audio and missing-track behaviour; `disabled` set from `main.ts` for `labmusic=1`; lab buttons and `encounter music level` exist and are not in the text; `LAB_ENCOUNTER` repeats 0.3, 1.5, 0.35; guard test bounds (6 s, 24 to 40 s, exact two-file list, does not check equal channel length); the stale "one system track" and "third bus" statements are fixed; no stale placeholder or 8 s statement about the encounter track remains in the three docs (remaining "placeholder" hits are unrelated or the quoted test name).
  - [ ] FIX: `docs/random-encounters.md`, the Escape bullet says the loop never starts "after a skip and then Escape". It does start: after an E skip the phase is `open` and `EncounterSound.follow` starts the loop on the next update, so only an Escape in the very same frame as the skip avoids it. The test titled "a skip then Escape, and Escape before the hit" (`encounter-sound.test.ts` line 153) only does Escape at frame 10, so it does not back the claim. Reword to "Escape before frame 32 (or on the same frame as an E skip)" or drop the skip case.
  - [ ] Optional wording: the sentence "Look closer, the second page and the dialog voice play over it unchanged" (same file, four-passes bullet) is cryptic; say what is meant.
  - [ ] Optional: "up to about a frame (16 ms) off the hit" is an estimate, not checked by any test.
  - Unverified (agent cannot hear): how the loop, the duck, the fades and both jingles sound; the tuned values in ENCOUNTERS.music; the sync of the downbeat with the hit chord. Marc's listening step (needs: try) is still open.
