---
id: 114a
title: Guitar skill, stage 1: the rule, chords and strumming (levels 1 to 3)
status: todo
owner: claude
depends_on: [108]
---

## Goal
Build stages 114a, 114b and 114c of `docs/guitar-skill-design.md` (section 11): `GUITAR_SKILL` data and the skill level rule (derived from the guitar session count, no new saved field), chords at level 2, strumming at level 3, the dev override `?guitarskill=1|2|3|4` (dev server only) and a console audition, pure mapping functions with tests. Level 1 is today's single note, unchanged. Marc's answers and the decisions are at the end of the design doc.

## Acceptance criteria
- Levels follow the thresholds in config (4 / 12 / 30 sessions); levels 2 and 3 play chords and strum patterns through the current instrument's voice; no dropped notes (the voice cap tests from 108 still pass); save and sync unchanged; `npm test`, `npx tsc --noEmit`, `npm run build` pass; Marc listens (an agent cannot hear: unverified until then, with exact steps to audition each level).
