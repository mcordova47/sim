---
id: 114b
title: Guitar skill, stage 2: the groove and the melody over it (level 6)
status: review
owner: claude
depends_on: [114a]
---

## Goal
Marc listened to 114a: pattern strums were dropped and the levels are now six (see the design doc, section 3). This issue builds the last level, the groove (level 6, id `groove`; it plays like level 5 until then). Build stages 114d and 114e of `docs/guitar-skill-design.md`: the groove scheduler on the music bus (I-V-vi-IV in A major, a fingerstyle-like bass and harmony pattern, tempo and swing from config), the arrows playing chord tones over it (the strum data, tempo and swing in `GUITAR_SKILL` are kept for this), the record ducking to about a third, mute and stop handling, the no-drop and voice-cap tests with the groove on, dev audition of the loop alone.

## Acceptance criteria
- At level 6 (from 55 finished sessions, `?guitarskill=6`) a persistent loop plays under the keypress melody, in time and in key; stops on leaving; muted state silent; the record ducks and returns; tests pass (`npm test`, `tsc`, build); Marc listens and says how it feels (unverified until then).

## Progress log
- 2026-10-28: plan: `GuitarGroove` scheduler on the music bus (like `MusicPlayer`), pure `grooveBar`/`grooveSlotTime`/`melodyNote` in `guitar-skill.ts`, data in `GUITAR_SKILL.groove`, record duck in `MusicPlayer` (a gain multiplier eased over 0.5 s, so no bus change), tests, dev audition.
- 2026-10-28, built (status review). Files: `config.ts` (`GUITAR_SKILL.groove`), `sound/guitar-skill.ts` (pure parts), `sound/guitar-groove.ts` (new scheduler), `sound/music-player.ts` (`duck`, `ducked`, fade), `sound/engine.ts` (3 small lines: a `groove` member, set the duck, update the groove), `sound/feature.ts` (level 6 path, stop on end/cancel/pause/new session, `auditionGroove`, `auditionGuitarGroove` console helper), `sound/guitar-groove.test.ts` (new), `guitar-skill.test.ts` (level 55 case moved). Nothing saved or synced changed.
  - Groove: I V vi IV (A E F#m D), one chord per bar, pattern `r3f2r3f1` (thumb: root, fifth on beats; fingers on voicing strings 3, 2, 3, 1 off the beats), tempo 92 and swing 0.1 from config, seeded humanise, plays in the instrument's string voice, gain 0.55. The melody (level 6 arrows) is one note of the chord sounding now (`melody` table in config: root, third, fifth, sixth or seventh, two octaves above the chord's root), played at once on the effects bus, never quantised. Starts with the first arrow of a session; stops on session end, cancel, pause, or a new session. Record: `MusicPlayer.duck` to 1/3 while the groove runs (applies to notes scheduled from then, within 0.25 s lookahead).
  - Checks: `npx tsc --noEmit` clean; `npx vitest run` all pass (one unrelated flashcards test flaked once, passes alone); `npm run build` ok. New tests cover: pattern, progression, in key, determinism, swing on odd eighths only, melody notes, scheduling once in order within lookahead, loop, stop/restart, stall skip, music bus (no effect voices), muted, ducking and return, no-drop at 70 ms with the groove on, chime still fits, dev audition.
  - Not verifiable by an agent: how it sounds (loop, balance, melody over it, the duck). Audition: `npm run dev`, open `?guitarskill=6`, press a key, then console `auditionGuitarGroove(4)` (loop alone), `auditionGuitarGroove(8, true)` (with melody), `auditionGuitarGroove(0)` stops; or play the guitar task with a record on.
  - Docs note: design doc still says "plays like level 5 until built" in places; not edited.
