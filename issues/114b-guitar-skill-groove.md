---
id: 114b
title: Guitar skill, stage 2: the groove and the melody over it (level 4)
status: todo
owner: claude
depends_on: [114a]
---

## Goal
Build stages 114d and 114e of `docs/guitar-skill-design.md`: the groove scheduler on the music bus (I-V-vi-IV in A major, a fingerstyle-like bass and harmony pattern, tempo and swing from config), the arrows playing chord tones over it, the record ducking to about a third, mute and stop handling, the no-drop and voice-cap tests with the groove on, dev audition of the loop alone.

## Acceptance criteria
- At level 4 a persistent loop plays under the keypress melody, in time and in key; stops on leaving; muted state silent; the record ducks and returns; tests pass (`npm test`, `tsc`, build); Marc listens and says how it feels (unverified until then).
