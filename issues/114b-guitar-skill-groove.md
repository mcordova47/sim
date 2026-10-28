---
id: 114b
title: Guitar skill, stage 2: the groove and the melody over it (level 6)
status: todo
owner: claude
depends_on: [114a]
---

## Goal
Marc listened to 114a: pattern strums were dropped and the levels are now six (see the design doc, section 3). This issue builds the last level, the groove (level 6, id `groove`; it plays like level 5 until then). Build stages 114d and 114e of `docs/guitar-skill-design.md`: the groove scheduler on the music bus (I-V-vi-IV in A major, a fingerstyle-like bass and harmony pattern, tempo and swing from config), the arrows playing chord tones over it (the strum data, tempo and swing in `GUITAR_SKILL` are kept for this), the record ducking to about a third, mute and stop handling, the no-drop and voice-cap tests with the groove on, dev audition of the loop alone.

## Acceptance criteria
- At level 6 (from 55 finished sessions, `?guitarskill=6`) a persistent loop plays under the keypress melody, in time and in key; stops on leaving; muted state silent; the record ducks and returns; tests pass (`npm test`, `tsc`, build); Marc listens and says how it feels (unverified until then).
